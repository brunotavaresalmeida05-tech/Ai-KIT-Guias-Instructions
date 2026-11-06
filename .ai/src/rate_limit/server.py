#!/usr/bin/env python3
"""
Rate Limit Server - FastAPI service for distributed rate limiting
Provides REST API for multi-layer rate limiting with multiple algorithms
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import Optional, Dict, List
from dataclasses import asdict

from fastapi import FastAPI, HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rate_limit.core import (
    RateLimiterManager,
    InMemoryBackend,
    RateLimitConfig,
    RateLimitResult,
    Algorithm,
    get_rate_limiter_manager,
    add_rate_limit_headers,
    create_429_response,
)
from rate_limit.redis_backend import (
    RedisBackend,
    RedisConfig,
    RedisRateLimiterManager,
    get_redis_rate_limiter,
    create_redis_config_from_env,
    rate_limit_middleware,
)
from rate_limit.middleware import (
    RateLimitMiddleware,
    RateLimitRule,
    rate_limit_dependency,
    extract_user_identifier,
)


# Global managers
_in_memory_manager: Optional[RateLimiterManager] = None
_redis_manager: Optional[RedisRateLimiterManager] = None


def init_in_memory_manager():
    """Initialize in-memory manager (for testing or when lifespan not run)"""
    global _in_memory_manager
    if _in_memory_manager is None:
        _in_memory_manager = get_rate_limiter_manager(InMemoryBackend())
    return _in_memory_manager


# Initialize immediately for testing
init_in_memory_manager()


# Pydantic models for API
class RateLimitCheckRequest(BaseModel):
    """Request for checking rate limit"""
    identifier: str = Field(..., description="Unique identifier (user ID, IP, API key)")
    layer: str = Field(..., description="Rate limit layer: global, api, ai, auth, login_ip, login_account")
    cost: int = Field(default=1, ge=1, description="Cost of this request")
    algorithm: Optional[str] = Field(default=None, description="Override algorithm: token_bucket, sliding_window, fixed_window")
    max_requests: Optional[int] = Field(default=None, gt=0, description="Override max requests")
    window_seconds: Optional[int] = Field(default=None, gt=0, description="Override window in seconds")
    burst_allowance: Optional[int] = Field(default=None, ge=0, description="Override burst allowance (token bucket)")


class RateLimitCheckResponse(BaseModel):
    """Response from rate limit check"""
    success: bool
    limit: int
    remaining: int
    reset_time: int
    retry_after: int = 0
    metadata: Dict = {}
    headers: Dict[str, str] = {}


class MultiLayerCheckRequest(BaseModel):
    """Request for multi-layer rate limit check"""
    checks: Dict[str, str] = Field(..., description="Map of layer -> identifier")
    cost: int = Field(default=1, ge=1)


class MultiLayerCheckResponse(BaseModel):
    """Response from multi-layer check"""
    results: Dict[str, RateLimitCheckResponse]
    allowed: bool
    blocking_layer: Optional[str] = None


class RateLimitStatusRequest(BaseModel):
    """Request for getting rate limit status"""
    identifier: str
    layer: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    backend: str
    redis_connected: bool
    limiters: List[str]


class ConfigResponse(BaseModel):
    """Rate limiter configuration"""
    layer: str
    algorithm: str
    max_requests: int
    window_seconds: int
    burst_allowance: int = 0
    prefix: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global _redis_manager

    # In-memory backend already initialized at module level

    # Try to initialize Redis backend if configured
    redis_url = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    if redis_url:
        try:
            redis_config = create_redis_config_from_env()
            _redis_manager = RedisRateLimiterManager(redis_config)
            await _redis_manager.initialize()
            print("Redis rate limiter initialized")
        except Exception as e:
            print(f"Failed to initialize Redis backend: {e}")
            _redis_manager = None

    yield

    # Cleanup
    if _redis_manager:
        await _redis_manager.close()


app = FastAPI(
    title="AI-KIT Rate Limit Service",
    description="Multi-layer rate limiting with Token Bucket, Sliding Window, and Fixed Window algorithms",
    version="1.0.0",
    lifespan=lifespan,
)


def get_manager(use_redis: bool = False) -> RateLimiterManager:
    """Get the appropriate rate limiter manager"""
    if use_redis and _redis_manager:
        return _redis_manager
    if not _in_memory_manager:
        raise HTTPException(status_code=503, detail="Rate limiter not initialized")
    return _in_memory_manager


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    redis_healthy = False
    if _redis_manager:
        try:
            redis_healthy = await _redis_manager.backend.health_check()
        except Exception:
            pass

    manager = get_manager()
    return HealthResponse(
        status="healthy" if (redis_healthy or _in_memory_manager) else "degraded",
        backend="redis" if _redis_manager else "memory",
        redis_connected=redis_healthy,
        limiters=list(manager.limiters.keys()),
    )


@app.get("/config/{layer}", response_model=ConfigResponse)
async def get_limiter_config(layer: str):
    """Get configuration for a specific rate limiter layer"""
    manager = get_manager()
    limiter = manager.get_limiter(layer)
    if not limiter:
        raise HTTPException(status_code=404, detail=f"Limiter '{layer}' not found")

    config = limiter.config
    return ConfigResponse(
        layer=layer,
        algorithm=config.algorithm.value,
        max_requests=config.max_requests,
        window_seconds=config.window_seconds,
        burst_allowance=config.burst_allowance,
        prefix=config.prefix,
    )


@app.get("/config", response_model=List[ConfigResponse])
async def get_all_configs():
    """Get configuration for all rate limiter layers"""
    manager = get_manager()
    return [
        ConfigResponse(
            layer=name,
            algorithm=limiter.config.algorithm.value,
            max_requests=limiter.config.max_requests,
            window_seconds=limiter.config.window_seconds,
            burst_allowance=limiter.config.burst_allowance,
            prefix=limiter.config.prefix,
        )
        for name, limiter in manager.limiters.items()
    ]


@app.post("/check", response_model=RateLimitCheckResponse)
async def check_rate_limit(
    request: RateLimitCheckRequest,
    use_redis: bool = False,
):
    """Check rate limit for a single identifier and layer"""
    manager = get_manager(use_redis)
    limiter = manager.get_limiter(request.layer)

    if not limiter:
        raise HTTPException(status_code=404, detail=f"Limiter '{request.layer}' not found")

    # Override config if provided
    if any(v is not None for v in [request.algorithm, request.max_requests, request.window_seconds, request.burst_allowance]):
        # Create temporary limiter with custom config
        from rate_limit.core import RateLimiter
        custom_config = RateLimitConfig(
            algorithm=Algorithm(request.algorithm) if request.algorithm else limiter.config.algorithm,
            max_requests=request.max_requests or limiter.config.max_requests,
            window_seconds=request.window_seconds or limiter.config.window_seconds,
            burst_allowance=request.burst_allowance if request.burst_allowance is not None else limiter.config.burst_allowance,
            prefix=limiter.config.prefix,
        )
        temp_limiter = RateLimiter(custom_config, limiter.backend)
        result = await temp_limiter.limit(request.identifier, request.cost)
    else:
        result = await limiter.limit(request.identifier, request.cost)

    # Build headers
    headers = {}
    add_rate_limit_headers(headers, result)

    return RateLimitCheckResponse(
        success=result.success,
        limit=result.limit,
        remaining=result.remaining,
        reset_time=result.reset_time,
        retry_after=result.retry_after,
        metadata=result.metadata,
        headers=headers,
    )


@app.post("/check/multi", response_model=MultiLayerCheckResponse)
async def check_multi_layer(
    request: MultiLayerCheckRequest,
    use_redis: bool = False,
):
    """Check rate limit across multiple layers"""
    manager = get_manager(use_redis)

    results = await manager.check_all(request.checks, request.cost)

    response_results = {}
    allowed = True
    blocking_layer = None

    for layer, result in results.items():
        headers = {}
        add_rate_limit_headers(headers, result)
        response_results[layer] = RateLimitCheckResponse(
            success=result.success,
            limit=result.limit,
            remaining=result.remaining,
            reset_time=result.reset_time,
            retry_after=result.retry_after,
            metadata=result.metadata,
            headers=headers,
        )
        if not result.success:
            allowed = False
            if blocking_layer is None:
                blocking_layer = layer

    return MultiLayerCheckResponse(
        results=response_results,
        allowed=allowed,
        blocking_layer=blocking_layer,
    )


@app.post("/check/status", response_model=RateLimitCheckResponse)
async def get_rate_limit_status(
    request: RateLimitStatusRequest,
    use_redis: bool = False,
):
    """Get current rate limit status without consuming"""
    manager = get_manager(use_redis)
    limiter = manager.get_limiter(request.layer)

    if not limiter:
        raise HTTPException(status_code=404, detail=f"Limiter '{request.layer}' not found")

    result = await limiter.get_status(request.identifier)
    if not result:
        # No limit data yet - return full allowance
        config = limiter.config
        if config.algorithm == Algorithm.TOKEN_BUCKET:
            capacity = config.max_requests + config.burst_allowance
            return RateLimitCheckResponse(
                success=True,
                limit=capacity,
                remaining=capacity,
                reset_time=int(__import__('time').time() + config.window_seconds),
                metadata={'algorithm': 'token_bucket', 'state': 'fresh'},
            )
        else:
            return RateLimitCheckResponse(
                success=True,
                limit=config.max_requests,
                remaining=config.max_requests,
                reset_time=int(__import__('time').time() + config.window_seconds),
                metadata={'algorithm': config.algorithm.value, 'state': 'fresh'},
            )

    headers = {}
    add_rate_limit_headers(headers, result)

    return RateLimitCheckResponse(
        success=result.success,
        limit=result.limit,
        remaining=result.remaining,
        reset_time=result.reset_time,
        retry_after=result.retry_after,
        metadata=result.metadata,
        headers=headers,
    )


# Express-compatible middleware endpoint
@app.middleware("http")
async def add_rate_limit_headers_middleware(request: Request, call_next):
    """Add rate limit headers to all responses"""
    response = await call_next(request)
    return response


# FastAPI dependency for rate limiting
async def rate_limit_dep(
    layer: str = "api",
    identifier_extractor=None,
    cost: int = 1,
    use_redis: bool = False,
):
    """FastAPI dependency for rate limiting"""
    async def dependency(request: Request):
        manager = get_manager(use_redis)

        if identifier_extractor:
            identifier = identifier_extractor(request)
        else:
            identifier = extract_user_identifier(request)

        limiter = manager.get_limiter(layer)
        if not limiter:
            return

        result = await limiter.limit(identifier, cost)

        # Store result for middleware to add headers
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


# Decorator for route-specific rate limiting
def rate_limited(layer: str = "api", cost: int = 1):
    """Decorator for rate limiting route handlers"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            manager = get_manager()
            limiter = manager.get_limiter(layer)

            if not limiter:
                return await func(*args, **kwargs)

            # Try to extract identifier from request
            identifier = f"caller:{func.__name__}"
            for arg in args:
                if hasattr(arg, 'headers') or hasattr(arg, 'client'):
                    identifier = extract_user_identifier(arg)
                    break

            result = await limiter.limit(identifier, cost)

            if not result.success:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limited: retry after {result.retry_after}s"
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Admin endpoints
@app.delete("/admin/reset/{layer}/{identifier}")
async def reset_rate_limit(layer: str, identifier: str, use_redis: bool = False):
    """Reset rate limit for a specific identifier (admin)"""
    manager = get_manager(use_redis)
    limiter = manager.get_limiter(layer)

    if not limiter:
        raise HTTPException(status_code=404, detail=f"Limiter '{layer}' not found")

    key = f"{limiter.config.prefix}:{identifier}"
    await limiter.backend.delete(key)

    return {"message": f"Rate limit reset for {identifier} on layer {layer}"}


@app.get("/admin/stats/{layer}/{identifier}")
async def get_usage_stats(layer: str, identifier: str, use_redis: bool = False):
    """Get usage statistics for an identifier (admin)"""
    if use_redis and _redis_manager:
        return await _redis_manager.get_usage_stats(layer, identifier)

    return {"error": "Stats only available with Redis backend"}


# ASGI middleware endpoint for Express/Node integration
@app.post("/middleware/check")
async def middleware_check(
    request: Request,
    layer: str = "global",
    identifier: Optional[str] = None,
    cost: int = 1,
):
    """
    Endpoint for external middleware (Express, etc.) to check rate limits.
    Returns headers to add to response.
    """
    if not identifier:
        # Extract from request
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        identifier = f"ip:{ip}"

    manager = get_manager()
    limiter = manager.get_limiter(layer)

    if not limiter:
        return {"allowed": True, "headers": {}}

    result = await limiter.limit(identifier, cost)

    headers = {}
    add_rate_limit_headers(headers, result)

    return {
        "allowed": result.success,
        "headers": headers,
        "retry_after": result.retry_after,
        "limit": result.limit,
        "remaining": max(0, result.remaining),
        "reset": result.reset_time,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("RATE_LIMIT_PORT", "8080"))
    host = os.getenv("RATE_LIMIT_HOST", "0.0.0.0")

    print(f"Starting Rate Limit Server on {host}:{port}")
    print("Available endpoints:")
    print("  GET  /health                 - Health check")
    print("  GET  /config                 - All limiter configs")
    print("  GET  /config/{layer}         - Specific limiter config")
    print("  POST /check                  - Single layer check")
    print("  POST /check/multi            - Multi-layer check")
    print("  POST /check/status           - Get status without consuming")
    print("  POST /middleware/check       - Express middleware check")
    print("  DELETE /admin/reset/{layer}/{identifier} - Reset limit")
    print("  GET  /admin/stats/{layer}/{identifier} - Usage stats")

    uvicorn.run(app, host=host, port=port)