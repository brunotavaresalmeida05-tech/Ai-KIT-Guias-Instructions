#!/usr/bin/env python3
"""
Rate Limiting Core - Multi-algorithm implementation
Supports Token Bucket, Sliding Window, Fixed Window
"""

import time
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple
from enum import Enum
import threading
import hashlib


class Algorithm(Enum):
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"


@dataclass
class RateLimitConfig:
    """Configuration for a rate limiter"""
    algorithm: Algorithm
    max_requests: int          # Maximum requests allowed
    window_seconds: int        # Time window in seconds
    burst_allowance: int = 0   # Extra tokens for token bucket (burst capacity)
    prefix: str = "rl"         # Redis key prefix


@dataclass
class RateLimitResult:
    """Result of a rate limit check"""
    success: bool
    limit: int
    remaining: int
    reset_time: int            # Unix timestamp when limit resets
    retry_after: int = 0       # Seconds until next request allowed
    metadata: Dict = field(default_factory=dict)


class RateLimiterBackend(ABC):
    """Abstract backend for rate limiting storage"""

    @abstractmethod
    async def get(self, key: str) -> Optional[Dict]:
        pass

    @abstractmethod
    async def set(self, key: str, value: Dict, ttl: int) -> bool:
        pass

    @abstractmethod
    async def increment(self, key: str, window_start: int, ttl: int) -> Tuple[int, int]:
        """Returns (count, reset_time)"""
        pass


class InMemoryBackend(RateLimiterBackend):
    """In-memory backend for development/testing"""

    def __init__(self):
        self._store: Dict[str, Dict] = {}
        self._lock = threading.RLock()

    async def get(self, key: str) -> Optional[Dict]:
        with self._lock:
            entry = self._store.get(key)
            if entry and entry.get('expires', 0) > time.time():
                return entry
            elif entry:
                del self._store[key]
            return None

    async def set(self, key: str, value: Dict, ttl: int) -> bool:
        with self._lock:
            value['expires'] = time.time() + ttl
            self._store[key] = value
            return True

    async def increment(self, key: str, window_start: int, ttl: int) -> Tuple[int, int]:
        with self._lock:
            entry = self._store.get(key)
            now = time.time()

            if not entry or entry.get('expires', 0) <= now:
                # New window
                entry = {
                    'count': 1,
                    'window_start': window_start,
                    'expires': now + ttl
                }
                self._store[key] = entry
                return 1, window_start + ttl

            entry['count'] += 1
            return entry['count'], entry['window_start'] + ttl

    async def delete(self, key: str) -> bool:
        """Delete a key"""
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False


class TokenBucketState:
    """State for token bucket algorithm"""
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill_rate = refill_rate  # tokens per second
        self.last_refill = time.time()

    def consume(self, tokens: int = 1) -> Tuple[bool, float]:
        """Try to consume tokens, returns (success, tokens_remaining)"""
        self._refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True, self.tokens
        return False, self.tokens

    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def to_dict(self) -> Dict:
        return {
            'capacity': self.capacity,
            'tokens': self.tokens,
            'refill_rate': self.refill_rate,
            'last_refill': self.last_refill
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'TokenBucketState':
        bucket = cls(data['capacity'], data['refill_rate'])
        bucket.tokens = data['tokens']
        bucket.last_refill = data['last_refill']
        return bucket


class RateLimiter:
    """
    Multi-algorithm rate limiter with pluggable backends
    """

    def __init__(self, config: RateLimitConfig, backend: RateLimiterBackend):
        self.config = config
        self.backend = backend

    async def limit(self, identifier: str, cost: int = 1) -> RateLimitResult:
        """
        Check and consume rate limit for identifier
        """
        key = f"{self.config.prefix}:{identifier}"

        if self.config.algorithm == Algorithm.TOKEN_BUCKET:
            return await self._token_bucket_limit(key, cost)
        elif self.config.algorithm == Algorithm.SLIDING_WINDOW:
            return await self._sliding_window_limit(key, cost)
        elif self.config.algorithm == Algorithm.FIXED_WINDOW:
            return await self._fixed_window_limit(key, cost)
        else:
            raise ValueError(f"Unknown algorithm: {self.config.algorithm}")

    async def _token_bucket_limit(self, key: str, cost: int) -> RateLimitResult:
        """Token bucket algorithm - allows bursts, controls sustained rate"""
        # Refill rate = max_requests / window_seconds (tokens per second)
        refill_rate = self.config.max_requests / self.config.window_seconds
        # Capacity = max_requests + burst_allowance
        capacity = self.config.max_requests + self.config.burst_allowance

        # Get or create bucket state
        bucket_data = await self.backend.get(key)
        if bucket_data and 'tokens' in bucket_data:
            bucket = TokenBucketState.from_dict(bucket_data)
        else:
            bucket = TokenBucketState(capacity, refill_rate)

        # Try to consume tokens
        success, remaining = bucket.consume(cost)

        # Calculate reset time (when bucket will be full again)
        tokens_needed = capacity - remaining
        reset_time = int(time.time() + (tokens_needed / refill_rate)) if tokens_needed > 0 else int(time.time())

        # Save state
        await self.backend.set(key, bucket.to_dict(), self.config.window_seconds * 2)

        if success:
            return RateLimitResult(
                success=True,
                limit=capacity,
                remaining=int(remaining),
                reset_time=reset_time,
                metadata={'algorithm': 'token_bucket', 'refill_rate': refill_rate}
            )
        else:
            retry_after = int((cost - remaining) / refill_rate) + 1
            return RateLimitResult(
                success=False,
                limit=capacity,
                remaining=int(remaining),
                reset_time=reset_time,
                retry_after=retry_after,
                metadata={'algorithm': 'token_bucket', 'refill_rate': refill_rate}
            )

    async def _sliding_window_limit(self, key: str, cost: int) -> RateLimitResult:
        """Sliding window algorithm - smooth rate limiting"""
        now = time.time()
        window_start = int(now - self.config.window_seconds)

        # Use sorted set approach: store timestamps
        # For simplicity, use counter with sliding window approximation
        current_key = f"{key}:{int(now // self.config.window_seconds)}"
        prev_key = f"{key}:{int(now // self.config.window_seconds) - 1}"

        current_count = await self.backend.get(current_key)
        prev_count = await self.backend.get(prev_key)

        current = current_count.get('count', 0) if current_count else 0
        prev = prev_count.get('count', 0) if prev_count else 0

        # Weighted count for sliding window
        prev_weight = 1 - ((now % self.config.window_seconds) / self.config.window_seconds)
        weighted_count = current + int(prev * prev_weight)

        if weighted_count + cost <= self.config.max_requests:
            # Increment current window
            new_count = current + cost
            await self.backend.set(current_key, {'count': new_count}, self.config.window_seconds * 2)

            return RateLimitResult(
                success=True,
                limit=self.config.max_requests,
                remaining=self.config.max_requests - new_count,
                reset_time=int(now + self.config.window_seconds),
                metadata={'algorithm': 'sliding_window', 'weighted_count': weighted_count}
            )
        else:
            retry_after = self.config.window_seconds - int(now % self.config.window_seconds)
            return RateLimitResult(
                success=False,
                limit=self.config.max_requests,
                remaining=max(0, self.config.max_requests - weighted_count),
                reset_time=int(now + self.config.window_seconds),
                retry_after=retry_after,
                metadata={'algorithm': 'sliding_window', 'weighted_count': weighted_count}
            )

    async def _fixed_window_limit(self, key: str, cost: int) -> RateLimitResult:
        """Fixed window algorithm - simple but can allow bursts at boundaries"""
        now = time.time()
        window_start = int(now // self.config.window_seconds) * self.config.window_seconds
        window_key = f"{key}:{window_start}"

        count, reset_time = await self.backend.increment(window_key, window_start, self.config.window_seconds * 2)
        total_count = count * cost

        if total_count <= self.config.max_requests:
            return RateLimitResult(
                success=True,
                limit=self.config.max_requests,
                remaining=self.config.max_requests - total_count,
                reset_time=reset_time,
                metadata={'algorithm': 'fixed_window', 'window_start': window_start}
            )
        else:
            return RateLimitResult(
                success=False,
                limit=self.config.max_requests,
                remaining=0,
                reset_time=reset_time,
                retry_after=self.config.window_seconds - int(now % self.config.window_seconds),
                metadata={'algorithm': 'fixed_window', 'window_start': window_start}
            )

    async def get_status(self, identifier: str) -> Optional[RateLimitResult]:
        """Get current status without consuming"""
        key = f"{self.config.prefix}:{identifier}"
        data = await self.backend.get(key)
        if not data:
            return None

        if self.config.algorithm == Algorithm.TOKEN_BUCKET:
            bucket = TokenBucketState.from_dict(data)
            return RateLimitResult(
                success=True,
                limit=bucket.capacity,
                remaining=int(bucket.tokens),
                reset_time=int(time.time() + (bucket.capacity - bucket.tokens) / bucket.refill_rate),
                metadata={'algorithm': 'token_bucket'}
            )

        return None


class RateLimiterManager:
    """Manages multiple rate limiters for different layers"""

    def __init__(self, backend: RateLimiterBackend = None):
        self.backend = backend or InMemoryBackend()
        self.limiters: Dict[str, RateLimiter] = {}
        self._setup_default_limiters()

    def _setup_default_limiters(self):
        """Setup default limiters per layer"""
        # Global edge protection - sliding window
        self.limiters['global'] = RateLimiter(
            RateLimitConfig(
                algorithm=Algorithm.SLIDING_WINDOW,
                max_requests=300,
                window_seconds=60,
                prefix="rl:global"
            ),
            self.backend
        )

        # Authenticated user API - sliding window
        self.limiters['api'] = RateLimiter(
            RateLimitConfig(
                algorithm=Algorithm.SLIDING_WINDOW,
                max_requests=100,
                window_seconds=60,
                prefix="rl:api"
            ),
            self.backend
        )

        # AI routes - token bucket for burst handling
        self.limiters['ai'] = RateLimiter(
            RateLimitConfig(
                algorithm=Algorithm.TOKEN_BUCKET,
                max_requests=10,      # Sustained: 10/min
                window_seconds=60,
                burst_allowance=10,   # Burst: up to 20
                prefix="rl:ai"
            ),
            self.backend
        )

        # Auth routes - strict sliding window
        self.limiters['auth'] = RateLimiter(
            RateLimitConfig(
                algorithm=Algorithm.SLIDING_WINDOW,
                max_requests=5,
                window_seconds=900,  # 15 minutes
                prefix="rl:auth"
            ),
            self.backend
        )

        # Login specific - per IP + per account
        self.limiters['login_ip'] = RateLimiter(
            RateLimitConfig(
                algorithm=Algorithm.SLIDING_WINDOW,
                max_requests=5,
                window_seconds=900,
                prefix="rl:login:ip"
            ),
            self.backend
        )

        self.limiters['login_account'] = RateLimiter(
            RateLimitConfig(
                algorithm=Algorithm.SLIDING_WINDOW,
                max_requests=5,
                window_seconds=900,
                prefix="rl:login:account"
            ),
            self.backend
        )

    def get_limiter(self, name: str) -> Optional[RateLimiter]:
        return self.limiters.get(name)

    def add_limiter(self, name: str, limiter: RateLimiter):
        self.limiters[name] = limiter

    async def check_all(self, layer_checks: Dict[str, str], cost: int = 1) -> Dict[str, RateLimitResult]:
        """Check multiple limiters at once"""
        results = {}
        for layer, identifier in layer_checks.items():
            limiter = self.limiters.get(layer)
            if limiter:
                results[layer] = await limiter.limit(identifier, cost)
        return results


# Global instance
_manager = None

def get_rate_limiter_manager(backend: RateLimiterBackend = None) -> RateLimiterManager:
    global _manager
    if _manager is None:
        _manager = RateLimiterManager(backend)
    return _manager


# Headers helper
def add_rate_limit_headers(response_headers: Dict, result: RateLimitResult):
    """Add standard rate limit headers to response"""
    response_headers['X-RateLimit-Limit'] = str(result.limit)
    response_headers['X-RateLimit-Remaining'] = str(max(0, result.remaining))
    response_headers['X-RateLimit-Reset'] = str(result.reset_time)
    if not result.success and result.retry_after > 0:
        response_headers['Retry-After'] = str(result.retry_after)


def create_429_response(result: RateLimitResult, message: str = None) -> Dict:
    """Create standard 429 response"""
    return {
        'status': 429,
        'headers': {
            'Content-Type': 'application/json',
            'Retry-After': str(result.retry_after) if result.retry_after > 0 else '60',
            'X-RateLimit-Limit': str(result.limit),
            'X-RateLimit-Remaining': str(max(0, result.remaining)),
            'X-RateLimit-Reset': str(result.reset_time),
        },
        'body': {
            'error': 'rate_limited',
            'message': message or f'Rate limit exceeded. Try again in {result.retry_after} seconds.',
            'retry_after': result.retry_after,
            'limit': result.limit,
            'remaining': result.remaining,
            'reset': result.reset_time
        }
    }


# Async context manager for rate limiting
class RateLimitContext:
    """Context manager for rate limiting a block of code"""

    def __init__(self, limiter: RateLimiter, identifier: str, cost: int = 1):
        self.limiter = limiter
        self.identifier = identifier
        self.cost = cost
        self.result: Optional[RateLimitResult] = None

    async def __aenter__(self) -> RateLimitResult:
        self.result = await self.limiter.limit(self.identifier, self.cost)
        return self.result

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


async def with_rate_limit(limiter: RateLimiter, identifier: str, cost: int = 1):
    """Decorator-like function for rate limiting"""
    return RateLimitContext(limiter, identifier, cost)


# Example usage
async def demo():
    print("=== Rate Limiter Demo ===\n")

    manager = get_rate_limiter_manager()

    # Test global limiter
    print("1. Global limiter (300 req/min, sliding window):")
    for i in range(5):
        result = await manager.get_limiter('global').limit(f"ip:192.168.1.1")
        print(f"   Request {i+1}: success={result.success}, remaining={result.remaining}")

    # Test AI limiter (token bucket)
    print("\n2. AI limiter (token bucket: 10/min sustained, burst 20):")
    ai_limiter = manager.get_limiter('ai')
    for i in range(15):
        result = await ai_limiter.limit("user:123")
        print(f"   Request {i+1}: success={result.success}, remaining={result.remaining}, reset={result.reset_time}")
        if not result.success:
            print(f"   -> Rate limited! Retry after {result.retry_after}s")

    # Test auth limiter
    print("\n3. Auth limiter (5 per 15 min):")
    auth_limiter = manager.get_limiter('auth')
    for i in range(6):
        result = await auth_limiter.limit("login:ip:10.0.0.1")
        print(f"   Attempt {i+1}: success={result.success}")
        if not result.success:
            print(f"   -> Blocked for {result.retry_after}s")

    # Multi-layer check
    print("\n4. Multi-layer check for AI request:")
    results = await manager.check_all({
        'global': 'ip:192.168.1.100',
        'api': 'user:456',
        'ai': 'user:456'
    })
    for layer, result in results.items():
        status = "OK" if result.success else "FAIL"
        print(f"   {layer}: {status} (remaining: {result.remaining})")


if __name__ == '__main__':
    asyncio.run(demo())