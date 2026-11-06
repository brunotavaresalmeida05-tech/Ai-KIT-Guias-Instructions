"""
Rate Limiting Module for AI Development System

Multi-layer rate limiting with support for:
- Token Bucket (for AI routes with burst handling)
- Sliding Window (smooth rate limiting)
- Fixed Window (simple, low overhead)
- Distributed Redis backend
- In-memory backend (development)

Layers:
- global: Edge protection (300 req/min per IP)
- api: Authenticated user API (100 req/min per user)
- ai: AI generation routes (10/min sustained, 20 burst)
- auth: Login/auth routes (5 per 15 min)
"""

from .core import (
    RateLimiterManager,
    RateLimiter,
    RateLimiterBackend,
    InMemoryBackend,
    RateLimitConfig,
    RateLimitResult,
    Algorithm,
    TokenBucketState,
    get_rate_limiter_manager,
    add_rate_limit_headers,
    create_429_response,
    RateLimitContext,
    with_rate_limit
)

from .redis_backend import (
    RedisBackend,
    RedisConfig,
    RedisRateLimiterManager,
    get_redis_rate_limiter,
    create_redis_config_from_env
)

from .middleware import (
    RateLimitMiddleware,
    FlaskRateLimitMiddleware,
    RateLimitRule,
    rate_limit_dependency,
    rate_limited,
    extract_user_identifier,
    add_rate_limit_headers_dict
)

# Server module
from .server import (
    app,
    check_rate_limit,
    check_multi_layer,
    get_rate_limit_status,
    middleware_check,
    reset_rate_limit,
    get_usage_stats,
    health_check,
    get_limiter_config,
    get_all_configs,
)

__version__ = "1.0.0"

__all__ = [
    # Core
    'RateLimiterManager',
    'RateLimiter',
    'RateLimiterBackend',
    'InMemoryBackend',
    'RateLimitConfig',
    'RateLimitResult',
    'Algorithm',
    'TokenBucketState',
    'get_rate_limiter_manager',
    'add_rate_limit_headers',
    'create_429_response',
    'RateLimitContext',
    'with_rate_limit',

    # Redis
    'RedisBackend',
    'RedisConfig',
    'RedisRateLimiterManager',
    'get_redis_rate_limiter',
    'create_redis_config_from_env',

    # Middleware
    'RateLimitMiddleware',
    'FlaskRateLimitMiddleware',
    'RateLimitRule',
    'rate_limit_dependency',
    'rate_limited',
    'extract_user_identifier',
    'add_rate_limit_headers_dict',

    # Server
    'app',
    'check_rate_limit',
    'check_multi_layer',
    'get_rate_limit_status',
    'middleware_check',
    'reset_rate_limit',
    'get_usage_stats',
    'health_check',
    'get_limiter_config',
    'get_all_configs',
]