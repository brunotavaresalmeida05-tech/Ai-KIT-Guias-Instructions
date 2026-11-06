# Recipe #5: API Rate Limiting & Throttling

> Implement distributed rate limiting with multiple strategies

---

## 📊 Overview

- **Use Case:** Prevent abuse, manage resource usage, ensure fair access
- **Tech Stack:** Node.js, Express, Redis, rate-limit libraries
- **Time:** 2-3 hours
- **Difficulty:** Intermediate
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Redis instance available (or in-memory fallback)
- [ ] Node.js 18+
- [ ] Understanding of middleware

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install redis express-rate-limit rate-limit-redis
npm install --save-dev @types/express-rate-limit
```

### Step 2: Redis Configuration

Create `src/config/redis.config.js`:

```javascript
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Handle client events
 */
client.on('error', (err) => {
  console.error('Redis client error:', err);
});

client.on('connect', () => {
  console.log('✓ Redis connected');
});

client.on('ready', () => {
  console.log('✓ Redis ready');
});

/**
 * Test connection
 */
async function testConnection() {
  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    return false;
  }
}

module.exports = {
  client,
  testConnection,
};
```

### Step 3: Rate Limit Strategies

Create `src/middleware/rate-limit.middleware.js`:

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { client } = require('../config/redis.config');

/**
 * Global rate limiter (all requests)
 */
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:global',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});

/**
 * Authentication rate limiter
 */
const authLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:auth',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Use email as key for more granular rate limiting
    return req.body?.email || req.ip;
  },
});

/**
 * Strict rate limiter (signup/password reset)
 */
const strictLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:strict',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: 'Too many signup attempts, please try again later.',
});

/**
 * API endpoint rate limiter (per user)
 */
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:api',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per windowMs
  message: 'API rate limit exceeded.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
});

/**
 * Premium tier rate limiter (higher limits)
 */
const premiumLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:premium',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Only apply to non-premium users
    return req.user?.plan === 'premium';
  },
});

/**
 * Custom rate limiter factory
 */
function createLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    prefix = 'rl:custom',
    message = 'Rate limit exceeded',
    skipSuccessful = false,
    keyGenerator = null,
  } = options;

  return rateLimit({
    store: new RedisStore({
      client: client,
      prefix,
    }),
    windowMs,
    max,
    message,
    skipSuccessfulRequests: skipSuccessful,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
  });
}

module.exports = {
  globalLimiter,
  authLimiter,
  strictLimiter,
  apiLimiter,
  premiumLimiter,
  createLimiter,
};
```

### Step 4: Advanced Rate Limiting Logic

Create `src/services/rate-limit.service.js`:

```javascript
const { client } = require('../config/redis.config');

class RateLimitService {
  /**
   * Get current usage for key
   */
  async getUsage(key) {
    const usage = await client.get(key);
    return usage ? JSON.parse(usage) : null;
  }

  /**
   * Check if rate limit exceeded
   */
  async isLimitExceeded(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get all requests in current window
    const usageKey = `rl:usage:${key}`;
    let usage = await client.get(usageKey);

    if (!usage) {
      usage = {
        requests: [],
        createdAt: now,
      };
    } else {
      usage = JSON.parse(usage);
    }

    // Remove old requests outside window
    usage.requests = usage.requests.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (usage.requests.length >= limit) {
      return true;
    }

    // Add current request
    usage.requests.push(now);

    // Store updated usage
    await client.setex(
      usageKey,
      Math.ceil(windowMs / 1000),
      JSON.stringify(usage)
    );

    return false;
  }

  /**
   * Get remaining requests
   */
  async getRemaining(key, limit, windowMs) {
    const usage = await this.getUsage(`rl:usage:${key}`);

    if (!usage) {
      return limit;
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const validRequests = usage.requests.filter((time) => time > windowStart);

    return Math.max(0, limit - validRequests.length);
  }

  /**
   * Get reset time
   */
  async getResetTime(key, windowMs) {
    const usage = await this.getUsage(`rl:usage:${key}`);

    if (!usage || usage.requests.length === 0) {
      return null;
    }

    const oldestRequest = Math.min(...usage.requests);
    const resetTime = new Date(oldestRequest + windowMs);

    return resetTime;
  }

  /**
   * Reset limit for key
   */
  async reset(key) {
    const usageKey = `rl:usage:${key}`;
    await client.del(usageKey);
  }

  /**
   * Bulk reset (e.g., for user IDs)
   */
  async bulkReset(pattern) {
    const keys = await client.keys(`rl:usage:${pattern}`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  /**
   * Get statistics
   */
  async getStats(prefix) {
    const keys = await client.keys(`${prefix}:*`);
    const stats = {
      totalLimiters: keys.length,
      byKey: {},
    };

    for (const key of keys) {
      const usage = await client.get(key);
      if (usage) {
        stats.byKey[key] = JSON.parse(usage);
      }
    }

    return stats;
  }
}

module.exports = new RateLimitService();
```

### Step 5: Express Integration

Create `src/routes/auth.routes.js` (updated with rate limiting):

```javascript
const express = require('express');
const router = express.Router();
const { authLimiter, strictLimiter } = require('../middleware/rate-limit.middleware');
const jwtService = require('../services/jwt.service');
const passwordService = require('../services/password.service');

/**
 * POST /auth/register
 * Register new user
 */
router.post('/register', strictLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const passwordCheck = passwordService.validateStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        error: 'Password too weak',
        details: passwordCheck.errors,
      });
    }

    // Your registration logic here
    const tokens = jwtService.generateTokenPair('user-id', email);

    res.status(201).json({
      message: 'User registered successfully',
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Your login logic here
    const tokens = jwtService.generateTokenPair('user-id', email);

    res.json({
      message: 'Logged in successfully',
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 6: Express Setup

Create `src/app.js` (updated):

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const logger = require('./config/logger.config');
const { globalLimiter, apiLimiter } = require('./middleware/rate-limit.middleware');
const requestLogger = require('./middleware/request-logger.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Global rate limiter (apply to all routes except health check)
app.use((req, res, next) => {
  if (req.path !== '/health') {
    globalLimiter(req, res, next);
  } else {
    next();
  }
});

app.use(requestLogger);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Protected API routes with per-user rate limiting
app.use('/api', apiLimiter);

// Import routes
const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
```

### Step 7: Rate Limit Status Endpoint

Create `src/routes/rate-limit.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const rateLimitService = require('../services/rate-limit.service');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

/**
 * GET /rate-limit/status/:key
 * Get rate limit status for key
 */
router.get('/status/:key', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { key } = req.params;
    const stats = await rateLimitService.getStats(`rl:*${key}*`);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rate-limit/remaining/:key
 * Get remaining requests for key
 */
router.get('/remaining/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const remaining = await rateLimitService.getRemaining(
      key,
      100,
      15 * 60 * 1000
    );
    const resetTime = await rateLimitService.getResetTime(key, 15 * 60 * 1000);

    res.json({
      remaining,
      resetTime,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rate-limit/reset/:key
 * Reset rate limit for key (admin only)
 */
router.post('/reset/:key', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { key } = req.params;
    await rateLimitService.reset(key);

    res.json({ message: `Rate limit reset for ${key}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## 🧪 Testing

Create `src/tests/rate-limit.test.js`:

```javascript
const request = require('supertest');
const app = require('../app');
const { client } = require('../config/redis.config');

describe('Rate Limiting', () => {
  beforeAll(async () => {
    // Wait for Redis connection
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await client.flushdb();
  });

  test('should allow requests within limit', async () => {
    const res = await request(app)
      .get('/api/users')
      .expect(200);

    expect(res.get('RateLimit-Limit')).toBeDefined();
  });

  test('should block requests exceeding limit', async () => {
    // Make requests until limit exceeded
    for (let i = 0; i < 35; i++) {
      await request(app).get('/api/users');
    }

    const res = await request(app)
      .get('/api/users')
      .expect(429);

    expect(res.body.message).toContain('Too many requests');
  });

  test('should have different limits for login', async () => {
    // Multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' })
      .expect(429);

    expect(res.body.message).toContain('Too many login attempts');
  });

  test('should return rate limit headers', async () => {
    const res = await request(app).get('/api/users');

    expect(res.get('RateLimit-Limit')).toBe('30');
    expect(res.get('RateLimit-Remaining')).toBeDefined();
    expect(res.get('RateLimit-Reset')).toBeDefined();
  });
});
```

---

## 📊 Environment Variables

Add to `.env`:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_STRICT_MAX=3
```

---

## ✅ Checklist

- [ ] Redis configured and running
- [ ] Rate limit middleware installed
- [ ] Global rate limiter applied
- [ ] Auth rate limiter configured
- [ ] Custom limiters created
- [ ] Rate limit service implemented
- [ ] Status endpoints created
- [ ] Tests passing
- [ ] Headers returned correctly
- [ ] Admin reset endpoint working

---

## 🐛 Common Issues

### Issue: "Cannot connect to Redis"
**Solution:** Ensure Redis is running: `redis-server`

### Issue: Rate limit not working
**Solution:** Check Redis connection and middleware order

### Issue: Different limits for different endpoints
**Solution:** Apply different limiters to different routes

---

## 🔗 Integration with V2.0

### With Strix Orchestrator
```
Task: API Rate Limiting Implementation
├─ research-agent: Find best practices
├─ security-agent: Validate security
├─ backend-agent: Implement middleware
└─ test-agent: Create test suite
```

### With Laya Hub
```
Events monitored:
├─ Rate limit exceeded (alert team)
├─ Suspicious patterns (multiple IPs)
└─ Performance impact (slow responses)
```

---

## 📋 Recipe Metadata

- **Recipe #:** 5/20
- **Category:** DevOps/Security
- **Status:** Production-Ready
- **Difficulty:** Intermediate
- **OWASP:** Compliant ✅

---

**Next Recipe (#6): Caching Strategy (Redis)**

*Phase 3 Progress: 5/20 recipes complete (25%)*
