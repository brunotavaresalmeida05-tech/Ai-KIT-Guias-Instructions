#!/usr/bin/env python3
"""
Redis Backend for Rate Limiting
Production-ready implementation using Redis sorted sets and counters
"""

import os
import time
import json
import asyncio
from typing import Optional, Dict, Tuple, List
from dataclasses import dataclass

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

from .core import RateLimiterBackend, RateLimitConfig, Algorithm


@dataclass
class RedisConfig:
    """Redis connection configuration"""
    url: str = None
    host: str = "localhost"
    port: int = 6379
    db: int = 0
    password: str = None
    ssl: bool = False
    max_connections: int = 50
    socket_timeout: float = 5.0
    socket_connect_timeout: float = 5.0
    decode_responses: bool = True


class RedisBackend(RateLimiterBackend):
    """
    Redis backend for distributed rate limiting.
    Uses Redis sorted sets for sliding window and hash maps for token bucket.
    """

    def __init__(self, config: RedisConfig = None):
        if not REDIS_AVAILABLE:
            raise RuntimeError("redis-py not installed. Run: pip install redis")

        self.config = config or RedisConfig()
        self._client: Optional[redis.Redis] = None
        self._pool: Optional[redis.ConnectionPool] = None

    async def connect(self):
        """Initialize Redis connection pool"""
        if self._client is not None:
            return

        if self.config.url:
            self._pool = redis.ConnectionPool.from_url(
                self.config.url,
                max_connections=self.config.max_connections,
                decode_responses=self.config.decode_responses
            )
        else:
            self._pool = redis.ConnectionPool(
                host=self.config.host,
                port=self.config.port,
                db=self.config.db,
                password=self.config.password,
                ssl=self.config.ssl,
                max_connections=self.config.max_connections,
                socket_timeout=self.config.socket_timeout,
                socket_connect_timeout=self.config.socket_connect_timeout,
                decode_responses=self.config.decode_responses
            )

        self._client = redis.Redis(connection_pool=self._pool)

        # Test connection
        await self._client.ping()

    async def close(self):
        """Close Redis connections"""
        if self._client:
            await self._client.close()
        if self._pool:
            await self._pool.disconnect()

    async def get(self, key: str) -> Optional[Dict]:
        """Get value by key"""
        if not self._client:
            await self.connect()

        data = await self._client.get(key)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return {'value': data}
        return None

    async def set(self, key: str, value: Dict, ttl: int) -> bool:
        """Set value with TTL"""
        if not self._client:
            await self.connect()

        try:
            serialized = json.dumps(value)
            await self._client.setex(key, ttl, serialized)
            return True
        except Exception:
            return False

    async def increment(self, key: str, window_start: int, ttl: int) -> Tuple[int, int]:
        """Increment counter for fixed window"""
        if not self._client:
            await self.connect()

        # Use INCR with expiration
        pipe = self._client.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl)
        results = await pipe.execute()

        count = results[0]
        reset_time = window_start + ttl

        return count, reset_time

    # Sliding Window with Sorted Sets
    async def sliding_window_increment(
        self,
        key: str,
        window_seconds: int,
        cost: int = 1
    ) -> Tuple[int, int]:
        """
        Increment sliding window counter using sorted set.
        Returns (current_count, reset_time)
        """
        if not self._client:
            await self.connect()

        now = time.time()
        window_start = now - window_seconds
        reset_time = int(now + window_seconds)

        # Use pipeline for atomicity
        pipe = self._client.pipeline()

        # Remove expired entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current entries
        pipe.zcard(key)

        # Add new entries with current timestamp as score
        # Add multiple entries for cost > 1
        for i in range(cost):
            unique_member = f"{now}:{i}:{os.urandom(4).hex()}"
            pipe.zadd(key, {unique_member: now})

        # Set expiration
        pipe.expire(key, window_seconds + 1)

        results = await pipe.execute()
        current_count = results[1] + cost

        return current_count, reset_time

    async def sliding_window_get_count(self, key: str, window_seconds: int) -> int:
        """Get current count in sliding window"""
        if not self._client:
            await self.connect()

        now = time.time()
        window_start = now - window_seconds

        # Remove expired and count
        pipe = self._client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        results = await pipe.execute()

        return results[1]

    # Token Bucket with Hash
    async def token_bucket_get(self, key: str) -> Optional[Dict]:
        """Get token bucket state"""
        if not self._client:
            await self.connect()

        data = await self._client.hgetall(key)
        if data:
            return {
                'capacity': float(data.get('capacity', 0)),
                'tokens': float(data.get('tokens', 0)),
                'refill_rate': float(data.get('refill_rate', 0)),
                'last_refill': float(data.get('last_refill', 0))
            }
        return None

    async def token_bucket_set(self, key: str, state: Dict, ttl: int) -> bool:
        """Set token bucket state"""
        if not self._client:
            await self.connect()

        try:
            pipe = self._client.pipeline()
            pipe.hset(key, mapping={
                'capacity': str(state['capacity']),
                'tokens': str(state['tokens']),
                'refill_rate': str(state['refill_rate']),
                'last_refill': str(state['last_refill'])
            })
            pipe.expire(key, ttl)
            await pipe.execute()
            return True
        except Exception:
            return False

    # Utility methods
    async def get_ttl(self, key: str) -> int:
        """Get TTL for a key"""
        if not self._client:
            await self.connect()
        return await self._client.ttl(key)

    async def delete(self, key: str) -> bool:
        """Delete a key"""
        if not self._client:
            await self.connect()
        result = await self._client.delete(key)
        return result > 0

    async def keys(self, pattern: str) -> List[str]:
        """Find keys by pattern (use with caution in production)"""
        if not self._client:
            await self.connect()
        return await self._client.keys(pattern)

    async def health_check(self) -> bool:
        """Check Redis connectivity"""
        try:
            if not self._client:
                await self.connect()
            await self._client.ping()
            return True
        except Exception:
            return False


class RedisRateLimiterManager:
    """High-level manager using Redis backend"""

    def __init__(self, redis_config: RedisConfig = None):
        self.backend = RedisBackend(redis_config)
        self._initialized = False

    async def initialize(self):
        """Initialize connection"""
        if not self._initialized:
            await self.backend.connect()
            self._initialized = True

    async def close(self):
        """Close connections"""
        await self.backend.close()
        self._initialized = False

    async def check_rate_limit(
        self,
        identifier: str,
        layer: str,
        algorithm: Algorithm = Algorithm.SLIDING_WINDOW,
        max_requests: int = 100,
        window_seconds: int = 60,
        cost: int = 1
    ) -> Tuple[bool, Dict]:
        """
        Check rate limit and return (allowed, headers)
        """
        await self.initialize()

        key = f"rl:{layer}:{identifier}"
        now = time.time()

        if algorithm == Algorithm.SLIDING_WINDOW:
            # Sliding window with sorted set
            current_count = await self.backend.sliding_window_get_count(key, window_seconds)

            if current_count + cost <= max_requests:
                new_count, reset_time = await self.backend.sliding_window_increment(
                    key, window_seconds, cost
                )
                return True, self._make_headers(max_requests, max_requests - new_count, reset_time)
            else:
                retry_after = window_seconds - int(now % window_seconds)
                return False, self._make_headers(
                    max_requests, 0, int(now + window_seconds), retry_after, blocked=True
                )

        elif algorithm == Algorithm.TOKEN_BUCKET:
            # Token bucket with hash
            refill_rate = max_requests / window_seconds
            capacity = max_requests * 2  # Allow 2x burst

            bucket = await self.backend.token_bucket_get(key)
            if not bucket:
                bucket = {
                    'capacity': capacity,
                    'tokens': float(capacity),
                    'refill_rate': refill_rate,
                    'last_refill': now
                }

            # Refill
            elapsed = now - bucket['last_refill']
            bucket['tokens'] = min(bucket['capacity'], bucket['tokens'] + elapsed * bucket['refill_rate'])
            bucket['last_refill'] = now

            if bucket['tokens'] >= cost:
                bucket['tokens'] -= cost
                await self.backend.token_bucket_set(key, bucket, window_seconds * 2)

                tokens_needed = bucket['capacity'] - bucket['tokens']
                reset_time = int(now + (tokens_needed / refill_rate)) if tokens_needed > 0 else int(now)

                return True, self._make_headers(int(bucket['capacity']), int(bucket['tokens']), reset_time)
            else:
                retry_after = int((cost - bucket['tokens']) / refill_rate) + 1
                reset_time = int(now + retry_after)
                await self.backend.token_bucket_set(key, bucket, window_seconds * 2)

                return False, self._make_headers(
                    int(bucket['capacity']), int(bucket['tokens']), reset_time, retry_after, blocked=True
                )

        else:
            # Fixed window fallback
            return await self._fixed_window_check(key, max_requests, window_seconds, cost)

    async def _fixed_window_check(
        self, key: str, max_requests: int, window_seconds: int, cost: int
    ) -> Tuple[bool, Dict]:
        """Fixed window check"""
        now = time.time()
        window_start = int(now // window_seconds) * window_seconds
        window_key = f"{key}:{window_start}"

        count, reset_time = await self.backend.increment(window_key, window_start, window_seconds * 2)
        total = count * cost

        if total <= max_requests:
            return True, self._make_headers(max_requests, max_requests - total, reset_time)
        else:
            retry_after = window_seconds - int(now % window_seconds)
            return False, self._make_headers(max_requests, 0, reset_time, retry_after, blocked=True)

    def _make_headers(
        self, limit: int, remaining: int, reset: int,
        retry_after: int = 0, blocked: bool = False
    ) -> Dict:
        """Create rate limit headers"""
        headers = {
            'X-RateLimit-Limit': str(limit),
            'X-RateLimit-Remaining': str(max(0, remaining)),
            'X-RateLimit-Reset': str(reset)
        }
        if blocked and retry_after > 0:
            headers['Retry-After'] = str(retry_after)
        return headers

    async def get_usage_stats(self, layer: str, identifier: str) -> Dict:
        """Get current usage statistics"""
        await self.initialize()

        pattern = f"rl:{layer}:{identifier}*"
        keys = await self.backend.keys(pattern)

        total_requests = 0
        for key in keys:
            ttl = await self.backend.get_ttl(key)
            if ttl > 0:
                # Estimate count based on key type
                data = await self.backend.get(key)
                if data and isinstance(data, dict) and 'count' in data:
                    total_requests += data['count']

        return {
            'layer': layer,
            'identifier': identifier,
            'active_keys': len(keys),
            'estimated_requests': total_requests
        }


# Global instance
_redis_manager = None

async def get_redis_rate_limiter(redis_config: RedisConfig = None) -> RedisRateLimiterManager:
    """Get global Redis rate limiter manager"""
    global _redis_manager
    if _redis_manager is None:
        _redis_manager = RedisRateLimiterManager(redis_config)
    return _redis_manager


# FastAPI/Starlette middleware example
async def rate_limit_middleware(
    request,
    call_next,
    redis_manager: RedisRateLimiterManager = None
):
    """
    ASGI middleware for rate limiting
    Usage:
        app.middleware('http')(rate_limit_middleware)
    """
    if redis_manager is None:
        redis_manager = await get_redis_rate_limiter()

    # Skip non-API routes
    if not request.url.path.startswith("/api/"):
        return await call_next(request)

    # Get client IP
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else request.client.host

    # Get user ID if authenticated
    user_id = getattr(request.state, 'user_id', None) if hasattr(request, 'state') else None

    # Check global limit
    allowed, headers = await redis_manager.check_rate_limit(
        identifier=f"ip:{ip}",
        layer="global",
        algorithm=Algorithm.SLIDING_WINDOW,
        max_requests=300,
        window_seconds=60
    )

    if not allowed:
        from starlette.responses import JSONResponse
        return JSONResponse(
            content={
                "error": "rate_limited",
                "message": "Too many requests. Please try again later."
            },
            status_code=429,
            headers=headers
        )

    # Check user-specific limit if authenticated
    if user_id:
        allowed, user_headers = await redis_manager.check_rate_limit(
            identifier=f"user:{user_id}",
            layer="api",
            algorithm=Algorithm.SLIDING_WINDOW,
            max_requests=100,
            window_seconds=60
        )
        headers.update(user_headers)

        if not allowed:
            from starlette.responses import JSONResponse
            return JSONResponse(
                content={
                    "error": "rate_limited",
                    "message": "You have exceeded your API rate limit."
                },
                status_code=429,
                headers=headers
            )

    # Process request
    response = await call_next(request)

    # Add rate limit headers to response
    for key, value in headers.items():
        response.headers[key] = value

    return response


# Configuration from environment
def create_redis_config_from_env() -> RedisConfig:
    """Create RedisConfig from environment variables"""
    return RedisConfig(
        url=os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_REST_URL"),
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        db=int(os.getenv("REDIS_DB", "0")),
        password=os.getenv("REDIS_PASSWORD"),
        ssl=os.getenv("REDIS_SSL", "false").lower() == "true"
    )


# Usage example
async def demo():
    print("=== Redis Rate Limiter Demo ===\n")

    # Use in-memory for demo
    from .core import InMemoryBackend, RateLimiterManager, Algorithm

    manager = RateLimiterManager(InMemoryBackend())

    # Simulate Redis-like usage with in-memory
    print("1. Testing global rate limit (300 req/min):")
    for i in range(5):
        result = await manager.get_limiter('global').limit("ip:10.0.0.1")
        print(f"   Request {i+1}: {'OK' if result.success else 'BLOCKED'} - Remaining: {result.remaining}")

    print("\n2. Testing AI rate limit (Token Bucket - 10/min, burst 20):")
    ai_limiter = manager.get_limiter('ai')
    for i in range(12):
        result = await ai_limiter.limit("user:123")
        status = "OK" if result.success else "BLOCKED"
        print(f"   Request {i+1}: {status} - Remaining: {result.remaining}")
        if not result.success:
            print(f"      Retry after: {result.retry_after}s")

    print("\n3. Multi-layer check:")
    results = await manager.check_all({
        'global': 'ip:192.168.1.50',
        'api': 'user:789',
        'ai': 'user:789'
    })
    for layer, result in results.items():
        print(f"   {layer}: {'PASS' if result.success else 'FAIL'} (remaining: {result.remaining})")


if __name__ == '__main__':
    import time
    import os
    asyncio.run(demo())