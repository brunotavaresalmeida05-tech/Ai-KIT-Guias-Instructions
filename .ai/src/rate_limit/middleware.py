#!/usr/bin/env python3
"""
Rate Limit Middleware Integration
Integrates with the AI Development System server
"""

from typing import Optional, Dict, Callable, Awaitable
from dataclasses import dataclass
import time
import re

from .core import (
    RateLimiterManager,
    RateLimiterBackend,
    InMemoryBackend,
    RateLimitResult,
    RateLimitConfig,
    Algorithm,
    get_rate_limiter_manager,
    add_rate_limit_headers,
    create_429_response
)


@dataclass
class RateLimitRule:
    """Rate limit rule for a specific route pattern"""
    pattern: str                    # Regex pattern for route matching
    layer: str                      # Which limiter to use
    identifier_extractor: Callable  # Function to extract identifier from request
    cost: int = 1                   # Cost per request
    methods: list = None            # HTTP methods to apply (None = all)
    skip_on_success: bool = False   # Only count failed requests


class RateLimitMiddleware:
    """
    ASGI/WSGI middleware for rate limiting
    """

    def __init__(
        self,
        app,
        manager: RateLimiterManager = None,
        rules: list = None,
        default_layer: str = "global",
        excluded_paths: list = None
    ):
        self.app = app
        self.manager = manager or get_rate_limiter_manager()
        self.rules = rules or self._default_rules()
        self.default_layer = default_layer
        self.excluded_paths = excluded_paths or ['/health', '/metrics', '/openapi.json', '/dashboard']

    def _default_rules(self) -> list:
        return [
            # AI generation routes - strict token bucket
            RateLimitRule(
                pattern=r'^/api/ai/(generate|complete|chat)',
                layer='ai',
                identifier_extractor=lambda req: self._get_user_or_ip(req),
                cost=1,
                methods=['POST']
            ),
            # AI streaming - even stricter
            RateLimitRule(
                pattern=r'^/api/ai/stream',
                layer='ai',
                identifier_extractor=lambda req: self._get_user_or_ip(req),
                cost=2,  # Streaming costs more
                methods=['POST', 'GET']
            ),
            # Auth routes - very strict
            RateLimitRule(
                pattern=r'^/api/auth/(login|register|password-reset|otp)',
                layer='auth',
                identifier_extractor=lambda req: self._get_login_identifier(req),
                cost=1,
                methods=['POST']
            ),
            # Admin routes - moderate
            RateLimitRule(
                pattern=r'^/api/admin/',
                layer='api',
                identifier_extractor=lambda req: self._get_user_or_ip(req),
                cost=1
            ),
            # Default API routes
            RateLimitRule(
                pattern=r'^/api/',
                layer='api',
                identifier_extractor=lambda req: self._get_user_or_ip(req),
                cost=1
            ),
        ]

    def _get_client_ip(self, request) -> str:
        """Extract client IP from request"""
        # Check X-Forwarded-For (first trusted proxy)
        forwarded = request.headers.get('x-forwarded-for', '')
        if forwarded:
            ips = [ip.strip() for ip in forwarded.split(',')]
            # Return first non-private IP if possible, else first
            for ip in ips:
                if not self._is_private_ip(ip):
                    return ip
            return ips[0]

        # Check X-Real-IP
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip

        # Fallback to client host
        return getattr(request, 'client', {}).get('host', 'unknown') if hasattr(request, 'client') else 'unknown'

    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is private"""
        private_prefixes = ('10.', '172.16.', '172.17.', '172.18.', '172.19.',
                           '172.20.', '172.21.', '172.22.', '172.23.',
                           '172.24.', '172.25.', '172.26.', '172.27.',
                           '172.28.', '172.29.', '172.30.', '172.31.',
                           '192.168.', '127.')
        return any(ip.startswith(prefix) for prefix in private_prefixes)

    def _get_user_or_ip(self, request) -> str:
        """Get user ID if authenticated, else IP"""
        # Try to get user from request state (set by auth middleware)
        if hasattr(request, 'state'):
            user_id = getattr(request.state, 'user_id', None)
            if user_id:
                return f"user:{user_id}"

        # Try to get from auth header
        auth = request.headers.get('authorization', '')
        if auth.startswith('Bearer '):
            # Could decode JWT here, for now use token hash
            token_hash = hash(auth[7:]) % 1000000
            return f"token:{token_hash}"

        # Fallback to IP
        ip = self._get_client_ip(request)
        return f"ip:{ip}"

    def _get_login_identifier(self, request) -> str:
        """Get identifier for login attempts (IP + email)"""
        ip = self._get_client_ip(request)

        # Try to get email from request body
        # This would need body parsing - simplified for now
        return f"login:ip:{ip}"

    def _match_rule(self, path: str, method: str) -> Optional[RateLimitRule]:
        """Find matching rule for path and method"""
        for rule in self.rules:
            if rule.methods and method not in rule.methods:
                continue
            if re.match(rule.pattern, path):
                return rule
        return None

    def _is_excluded(self, path: str) -> bool:
        """Check if path is excluded from rate limiting"""
        for excluded in self.excluded_paths:
            if path.startswith(excluded):
                return True
        return False

    async def __call__(self, scope, receive, send):
        """ASGI application interface"""
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        path = scope.get('path', '/')
        method = scope.get('method', 'GET')

        # Skip excluded paths
        if self._is_excluded(path):
            await self.app(scope, receive, send)
            return

        # Find matching rule
        rule = self._match_rule(path, method)
        if not rule:
            # No rule matches, use default
            layer = self.default_layer
            identifier = f"ip:{scope.get('client', ['unknown'])[0]}"
            cost = 1
        else:
            layer = rule.layer
            # We need to extract identifier from request
            # For ASGI, we'd need to parse headers/body - simplified
            identifier = f"ip:{scope.get('client', ['unknown'])[0]}"
            cost = rule.cost

        # Check rate limit
        limiter = self.manager.get_limiter(layer)
        if not limiter:
            await self.app(scope, receive, send)
            return

        result = await limiter.limit(identifier, cost)

        # Wrap send to add headers
        async def send_wrapper(message):
            if message['type'] == 'http.response.start':
                headers = list(message.get('headers', []))
                add_rate_limit_headers_dict(headers, result)
                if not result.success:
                    # Override with 429
                    message['status'] = 429
                    headers.extend([
                        (b'content-type', b'application/json'),
                        (b'retry-after', str(result.retry_after).encode()),
                    ])
                    message['headers'] = headers
            await send(message)

        if not result.success:
            # Send 429 response
            await send({
                'type': 'http.response.start',
                'status': 429,
                'headers': [
                    (b'content-type', b'application/json'),
                    (b'retry-after', str(result.retry_after).encode()),
                    (b'x-ratelimit-limit', str(result.limit).encode()),
                    (b'x-ratelimit-remaining', b'0'),
                    (b'x-ratelimit-reset', str(result.reset_time).encode()),
                ]
            })
            import json
            body = json.dumps({
                'error': 'rate_limited',
                'message': f'Rate limit exceeded. Try again in {result.retry_after} seconds.',
                'retry_after': result.retry_after
            }).encode()
            await send({
                'type': 'http.response.body',
                'body': body
            })
            return

        await self.app(scope, receive, send_wrapper)


def add_rate_limit_headers_dict(headers: list, result: RateLimitResult):
    """Add rate limit headers to ASGI headers list"""
    headers.extend([
        (b'x-ratelimit-limit', str(result.limit).encode()),
        (b'x-ratelimit-remaining', str(max(0, result.remaining)).encode()),
        (b'x-ratelimit-reset', str(result.reset_time).encode()),
    ])


# Flask/Werkzeug middleware
class FlaskRateLimitMiddleware:
    """Flask middleware for rate limiting"""

    def __init__(self, app, manager: RateLimiterManager = None, rules: list = None):
        self.app = app
        self.manager = manager or get_rate_limiter_manager()
        self.rules = rules or []

    def __call__(self, environ, start_response):
        from werkzeug.wrappers import Request, Response

        request = Request(environ)
        path = request.path
        method = request.method

        # Find rule
        rule = None
        for r in self.rules:
            if r.methods and method not in r.methods:
                continue
            if re.match(r.pattern, path):
                rule = r
                break

        if rule:
            identifier = rule.identifier_extractor(request)
            layer = rule.layer
            cost = rule.cost
        else:
            identifier = f"ip:{request.remote_addr}"
            layer = 'global'
            cost = 1

        # Check rate limit (synchronous version)
        import asyncio
        limiter = self.manager.get_limiter(layer)
        if limiter:
            # Run async in event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            result = loop.run_until_complete(limiter.limit(identifier, cost))

            if not result.success:
                response = Response(
                    response={
                        'error': 'rate_limited',
                        'message': f'Rate limit exceeded. Try again in {result.retry_after} seconds.'
                    },
                    status=429,
                    mimetype='application/json',
                    headers={
                        'Retry-After': str(result.retry_after),
                        'X-RateLimit-Limit': str(result.limit),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': str(result.reset_time)
                    }
                )
                return response(environ, start_response)

        # Add headers to response
        def new_start_response(status, headers, exc_info=None):
            if rule:
                limiter = self.manager.get_limiter(rule.layer)
                # We'd need to track result - simplified
                pass
            return start_response(status, headers, exc_info)

        return self.app(environ, new_start_response)


# FastAPI dependency
async def rate_limit_dependency(
    layer: str = "api",
    identifier_extractor=None,
    cost: int = 1
):
    """
    FastAPI dependency for rate limiting
    Usage:
        @app.post("/api/ai/generate")
        async def generate(request: Request, _=Depends(rate_limit_dependency("ai"))):
            ...
    """
    from fastapi import Request, HTTPException, Depends
    from fastapi.responses import JSONResponse

    async def dependency(request: Request):
        manager = get_rate_limiter_manager()

        if identifier_extractor:
            identifier = identifier_extractor(request)
        else:
            # Default: user ID if authenticated, else IP
            if hasattr(request.state, 'user_id'):
                identifier = f"user:{request.state.user_id}"
            else:
                forwarded = request.headers.get('x-forwarded-for', '')
                ip = forwarded.split(',')[0].strip() if forwarded else request.client.host
                identifier = f"ip:{ip}"

        limiter = manager.get_limiter(layer)
        if not limiter:
            return

        result = await limiter.limit(identifier, cost)

        # Add headers to response
        request.state.rate_limit_result = result

        if not result.success:
            raise HTTPException(
                status_code=429,
                detail={
                    'error': 'rate_limited',
                    'message': f'Rate limit exceeded. Try again in {result.retry_after} seconds.',
                    'retry_after': result.retry_after
                },
                headers={
                    'Retry-After': str(result.retry_after),
                    'X-RateLimit-Limit': str(result.limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': str(result.reset_time)
                }
            )

    return Depends(dependency)


# Decorator for simple rate limiting
def rate_limited(layer: str = "api", identifier: str = None, cost: int = 1):
    """
    Decorator for rate limiting async functions
    Usage:
        @rate_limited("ai", identifier="user:123")
        async def generate_text(prompt: str):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            manager = get_rate_limiter_manager()
            limiter = manager.get_limiter(layer)

            if not limiter:
                return await func(*args, **kwargs)

            ident = identifier
            if not ident:
                # Try to get from first arg if it's a request-like object
                if args and hasattr(args[0], 'headers'):
                    forwarded = args[0].headers.get('x-forwarded-for', '')
                    ip = forwarded.split(',')[0].strip() if forwarded else 'unknown'
                    ident = f"ip:{ip}"
                else:
                    ident = f"caller:{func.__name__}"

            result = await limiter.limit(ident, cost)

            if not result.success:
                raise Exception(f"Rate limited: retry after {result.retry_after}s")

            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Utility to extract user from request
def extract_user_identifier(request) -> str:
    """Extract best available identifier from request"""
    # 1. Authenticated user ID
    if hasattr(request, 'state') and getattr(request.state, 'user_id', None):
        return f"user:{request.state.user_id}"

    # 2. API Key
    api_key = request.headers.get('x-api-key') or request.headers.get('authorization', '').replace('Bearer ', '')
    if api_key:
        import hashlib
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
        return f"apikey:{key_hash}"

    # 3. Client IP
    forwarded = request.headers.get('x-forwarded-for', '')
    if forwarded:
        ip = forwarded.split(',')[0].strip()
    else:
        ip = getattr(request, 'client', {}).get('host', 'unknown') if hasattr(request, 'client') else 'unknown'

    return f"ip:{ip}"


# Export key components
__all__ = [
    'RateLimitMiddleware',
    'FlaskRateLimitMiddleware',
    'RateLimitRule',
    'rate_limit_dependency',
    'rate_limited',
    'extract_user_identifier',
    'add_rate_limit_headers_dict',
    'get_rate_limiter_manager'
]