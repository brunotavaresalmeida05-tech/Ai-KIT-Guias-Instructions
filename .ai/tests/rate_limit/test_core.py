#!/usr/bin/env python3
"""
Tests for Rate Limiting Core
"""

import asyncio
import unittest
from unittest.mock import Mock, patch, AsyncMock

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))

from rate_limit.core import (
    RateLimiterManager,
    RateLimiter,
    InMemoryBackend,
    RateLimitConfig,
    RateLimitResult,
    Algorithm,
    TokenBucketState,
    get_rate_limiter_manager,
    add_rate_limit_headers,
    create_429_response,
)


class TestTokenBucketState(unittest.TestCase):

    def test_initial_state(self):
        """Test token bucket initialization"""
        bucket = TokenBucketState(capacity=10, refill_rate=1.0)
        self.assertEqual(bucket.capacity, 10)
        self.assertEqual(bucket.tokens, 10.0)
        self.assertEqual(bucket.refill_rate, 1.0)

    def test_consume_success(self):
        """Test successful token consumption"""
        bucket = TokenBucketState(capacity=10, refill_rate=1.0)
        success, remaining = bucket.consume(3)
        self.assertTrue(success)
        self.assertEqual(remaining, 7.0)

    def test_consume_failure(self):
        """Test failed token consumption"""
        bucket = TokenBucketState(capacity=5, refill_rate=1.0)
        # Drain bucket
        bucket.consume(5)
        success, remaining = bucket.consume(1)
        self.assertFalse(success)
        self.assertEqual(remaining, 0.0)

    def test_refill_over_time(self):
        """Test token refill over time"""
        bucket = TokenBucketState(capacity=10, refill_rate=2.0)  # 2 tokens/sec
        bucket.tokens = 2.0
        bucket.last_refill = bucket.last_refill - 3  # 3 seconds ago

        # Should refill 6 tokens (3s * 2/s) but capped at 10
        success, remaining = bucket.consume(5)
        self.assertTrue(success)
        # Started with 2, refilled 6 = 8, consumed 5 = 3 remaining
        self.assertAlmostEqual(remaining, 3.0, places=1)

    def test_serialization(self):
        """Test serialization/deserialization"""
        bucket = TokenBucketState(capacity=10, refill_rate=1.5)
        bucket.tokens = 7.5
        bucket.last_refill = 1234567890.0

        data = bucket.to_dict()
        restored = TokenBucketState.from_dict(data)

        self.assertEqual(restored.capacity, 10)
        self.assertEqual(restored.refill_rate, 1.5)
        self.assertEqual(restored.tokens, 7.5)
        self.assertEqual(restored.last_refill, 1234567890.0)


class TestInMemoryBackend(unittest.TestCase):

    def setUp(self):
        self.backend = InMemoryBackend()

    async def asyncSetUp(self):
        pass

    def test_get_set(self):
        """Test basic get/set operations"""
        async def test():
            await self.backend.set('test_key', {'value': 'test'}, 60)
            result = await self.backend.get('test_key')
            self.assertIsNotNone(result)
            self.assertEqual(result['value'], 'test')

        asyncio.run(test())

    def test_expiration(self):
        """Test key expiration"""
        async def test():
            await self.backend.set('expiring_key', {'value': 'test'}, 0)  # Immediate expiration
            import time
            time.sleep(0.1)
            result = await self.backend.get('expiring_key')
            self.assertIsNone(result)

        asyncio.run(test())

    def test_increment(self):
        """Test counter increment"""
        async def test():
            count1, reset1 = await self.backend.increment('counter', 1000, 60)
            count2, reset2 = await self.backend.increment('counter', 1000, 60)
            count3, reset3 = await self.backend.increment('counter', 1000, 60)

            self.assertEqual(count1, 1)
            self.assertEqual(count2, 2)
            self.assertEqual(count3, 3)
            self.assertEqual(reset1, reset2)
            self.assertEqual(reset2, reset3)

        asyncio.run(test())


class TestRateLimiterTokenBucket(unittest.TestCase):

    def setUp(self):
        self.backend = InMemoryBackend()
        self.config = RateLimitConfig(
            algorithm=Algorithm.TOKEN_BUCKET,
            max_requests=10,
            window_seconds=60,
            burst_allowance=10,  # Capacity = 20
            prefix="test:ai"
        )
        self.limiter = RateLimiter(self.config, self.backend)

    def test_allows_burst(self):
        """Test that token bucket allows burst up to capacity"""
        async def test():
            # Should allow 20 requests (10 + 10 burst)
            for i in range(20):
                result = await self.limiter.limit("user:1", cost=1)
                self.assertTrue(result.success, f"Request {i+1} should succeed")
                self.assertEqual(result.limit, 20)

            # 21st should fail
            result = await self.limiter.limit("user:1", cost=1)
            self.assertFalse(result.success)
            self.assertGreater(result.retry_after, 0)

        asyncio.run(test())

    def test_sustained_rate(self):
        """Test sustained rate limit - token bucket allows burst up to capacity (20)"""
        async def test():
            # Token bucket has capacity=20 (10 + 10 burst)
            # So 20 requests should succeed
            for i in range(20):
                result = await self.limiter.limit("user:2", cost=1)
                self.assertTrue(result.success, f"Request {i+1} should succeed")

            # 21st should fail
            result = await self.limiter.limit("user:2", cost=1)
            self.assertFalse(result.success)

        asyncio.run(test())

    def test_different_identifiers_independent(self):
        """Test that different identifiers have independent limits"""
        async def test():
            # User 1 makes 20 requests
            for i in range(20):
                result = await self.limiter.limit("user:A", cost=1)
                self.assertTrue(result.success)

            # User 2 should still have full quota
            result = await self.limiter.limit("user:B", cost=1)
            self.assertTrue(result.success)
            self.assertEqual(result.remaining, 19)  # 20 - 1

        asyncio.run(test())


class TestRateLimiterSlidingWindow(unittest.TestCase):

    def setUp(self):
        self.backend = InMemoryBackend()
        self.config = RateLimitConfig(
            algorithm=Algorithm.SLIDING_WINDOW,
            max_requests=5,
            window_seconds=60,
            prefix="test:api"
        )
        self.limiter = RateLimiter(self.config, self.backend)

    def test_sliding_window_basic(self):
        """Test basic sliding window limiting"""
        async def test():
            for i in range(5):
                result = await self.limiter.limit("user:1")
                self.assertTrue(result.success, f"Request {i+1} should succeed")

            # 6th should fail
            result = await self.limiter.limit("user:1")
            self.assertFalse(result.success)

        asyncio.run(test())

    def test_remaining_count(self):
        """Test remaining count decreases"""
        async def test():
            result1 = await self.limiter.limit("user:1")
            self.assertEqual(result1.remaining, 4)

            result2 = await self.limiter.limit("user:1")
            self.assertEqual(result2.remaining, 3)

        asyncio.run(test())


class TestRateLimiterFixedWindow(unittest.TestCase):

    def setUp(self):
        self.backend = InMemoryBackend()
        self.config = RateLimitConfig(
            algorithm=Algorithm.FIXED_WINDOW,
            max_requests=3,
            window_seconds=60,
            prefix="test:fixed"
        )
        self.limiter = RateLimiter(self.config, self.backend)

    def test_fixed_window(self):
        """Test fixed window limiting"""
        async def test():
            for i in range(3):
                result = await self.limiter.limit("user:1")
                self.assertTrue(result.success)

            result = await self.limiter.limit("user:1")
            self.assertFalse(result.success)

        asyncio.run(test())


class TestRateLimiterManager(unittest.TestCase):

    def setUp(self):
        self.manager = RateLimiterManager(InMemoryBackend())

    def test_default_limiters_exist(self):
        """Test that default limiters are created"""
        self.assertIn('global', self.manager.limiters)
        self.assertIn('api', self.manager.limiters)
        self.assertIn('ai', self.manager.limiters)
        self.assertIn('auth', self.manager.limiters)
        self.assertIn('login_ip', self.manager.limiters)
        self.assertIn('login_account', self.manager.limiters)

    def test_global_limiter_config(self):
        """Test global limiter configuration"""
        global_limiter = self.manager.get_limiter('global')
        self.assertIsNotNone(global_limiter)
        self.assertEqual(global_limiter.config.max_requests, 300)
        self.assertEqual(global_limiter.config.window_seconds, 60)
        self.assertEqual(global_limiter.config.algorithm, Algorithm.SLIDING_WINDOW)

    def test_ai_limiter_config(self):
        """Test AI limiter configuration"""
        ai_limiter = self.manager.get_limiter('ai')
        self.assertIsNotNone(ai_limiter)
        self.assertEqual(ai_limiter.config.max_requests, 10)
        self.assertEqual(ai_limiter.config.window_seconds, 60)
        self.assertEqual(ai_limiter.config.burst_allowance, 10)
        self.assertEqual(ai_limiter.config.algorithm, Algorithm.TOKEN_BUCKET)

    def test_auth_limiter_config(self):
        """Test auth limiter configuration"""
        auth_limiter = self.manager.get_limiter('auth')
        self.assertIsNotNone(auth_limiter)
        self.assertEqual(auth_limiter.config.max_requests, 5)
        self.assertEqual(auth_limiter.config.window_seconds, 900)  # 15 min

    def test_check_all_layers(self):
        """Test multi-layer check"""
        async def test():
            results = await self.manager.check_all({
                'global': 'ip:1.2.3.4',
                'api': 'user:123',
                'ai': 'user:123'
            })

            self.assertEqual(len(results), 3)
            for layer, result in results.items():
                self.assertTrue(result.success)
                self.assertIn('remaining', result.__dict__)

        asyncio.run(test())


class TestRateLimitResult(unittest.TestCase):

    def test_result_creation(self):
        """Test RateLimitResult creation"""
        result = RateLimitResult(
            success=True,
            limit=100,
            remaining=95,
            reset_time=1234567890,
            metadata={'algorithm': 'sliding_window'}
        )

        self.assertTrue(result.success)
        self.assertEqual(result.limit, 100)
        self.assertEqual(result.remaining, 95)
        self.assertEqual(result.reset_time, 1234567890)

    def test_failed_result_with_retry_after(self):
        """Test failed result with retry_after"""
        result = RateLimitResult(
            success=False,
            limit=10,
            remaining=0,
            reset_time=1234567890,
            retry_after=30
        )

        self.assertFalse(result.success)
        self.assertEqual(result.retry_after, 30)


class TestHeadersHelpers(unittest.TestCase):

    def test_add_rate_limit_headers(self):
        """Test adding rate limit headers"""
        headers = {}
        result = RateLimitResult(
            success=True,
            limit=100,
            remaining=95,
            reset_time=1234567890
        )

        add_rate_limit_headers(headers, result)

        self.assertEqual(headers['X-RateLimit-Limit'], '100')
        self.assertEqual(headers['X-RateLimit-Remaining'], '95')
        self.assertEqual(headers['X-RateLimit-Reset'], '1234567890')

    def test_create_429_response(self):
        """Test 429 response creation"""
        result = RateLimitResult(
            success=False,
            limit=10,
            remaining=0,
            reset_time=1234567890,
            retry_after=30
        )

        response = create_429_response(result, "Custom message")

        self.assertEqual(response['status'], 429)
        self.assertEqual(response['headers']['Retry-After'], '30')
        self.assertEqual(response['body']['error'], 'rate_limited')
        self.assertEqual(response['body']['message'], 'Custom message')


class TestSingletonManager(unittest.TestCase):

    def test_get_rate_limiter_manager_singleton(self):
        """Test that get_rate_limiter_manager returns singleton"""
        manager1 = get_rate_limiter_manager()
        manager2 = get_rate_limiter_manager()
        self.assertIs(manager1, manager2)

    def test_new_manager_with_different_backend(self):
        """Test creating manager with different backend"""
        manager = get_rate_limiter_manager(InMemoryBackend())
        self.assertIsNotNone(manager)


if __name__ == '__main__':
    unittest.main()