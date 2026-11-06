# Recipe #6: Caching Strategy with Redis

> Implement multi-layer caching with automatic invalidation

---

## 📊 Overview

- **Use Case:** Improve performance, reduce database load, enhance user experience
- **Tech Stack:** Node.js, Express, Redis, cache decorators
- **Time:** 3-4 hours
- **Difficulty:** Intermediate-Advanced
- **Security Level:** Production-ready

---

## ✅ Prerequisites

- [ ] Redis instance running
- [ ] Express.js application
- [ ] Database connection established
- [ ] Recipe #5: Rate Limiting completed (optional but recommended)

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install redis ioredis node-cache
npm install --save-dev @types/redis
```

### Step 2: Redis Connection Pool

Create `src/config/cache.config.js`:

```javascript
const redis = require('ioredis');
const logger = require('./logger.config');

/**
 * Redis connection with connection pooling
 */
const redisClient = new redis.Cluster(
  [
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
    },
    maxRedirections: 16,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
  }
);

/**
 * Fallback in-memory cache (when Redis unavailable)
 */
const memoryCache = new Map();
const memoryCacheTTL = new Map();

/**
 * Initialize client
 */
redisClient.on('connect', () => {
  logger.info('✓ Redis cache connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

/**
 * Get value from cache (tries Redis first, falls back to memory)
 */
async function get(key) {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn('Redis get failed, using memory cache:', { key, error: error.message });
    return memoryCache.get(key) || null;
  }
}

/**
 * Set value in cache
 */
async function set(key, value, ttlSeconds = 3600) {
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.warn('Redis set failed, using memory cache:', { key, error: error.message });
    memoryCache.set(key, value);
    memoryCacheTTL.set(key, Date.now() + ttlSeconds * 1000);
  }
}

/**
 * Delete value from cache
 */
async function del(key) {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.warn('Redis delete failed, using memory cache:', { key, error: error.message });
    memoryCache.delete(key);
  }
}

/**
 * Delete multiple keys by pattern
 */
async function delByPattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.warn('Redis pattern delete failed:', { pattern, error: error.message });
  }
}

/**
 * Increment counter
 */
async function increment(key, amount = 1, ttlSeconds = 3600) {
  try {
    const value = await redisClient.incrby(key, amount);
    if (value === amount) {
      await redisClient.expire(key, ttlSeconds);
    }
    return value;
  } catch (error) {
    logger.warn('Redis increment failed:', { key, error: error.message });
    return null;
  }
}

/**
 * Clear all cache
 */
async function clear() {
  try {
    await redisClient.flushdb();
    memoryCache.clear();
    logger.info('✓ Cache cleared');
  } catch (error) {
    logger.error('Cache clear failed:', error);
  }
}

/**
 * Get cache statistics
 */
async function getStats() {
  try {
    const info = await redisClient.info('stats');
    const memory = await redisClient.info('memory');

    return {
      stats: info,
      memory: memory,
      memoryCache: memoryCache.size,
    };
  } catch (error) {
    logger.warn('Failed to get cache stats:', error.message);
    return null;
  }
}

module.exports = {
  redisClient,
  get,
  set,
  del,
  delByPattern,
  increment,
  clear,
  getStats,
};
```

### Step 3: Cache Service

Create `src/services/cache.service.js`:

```javascript
const cacheConfig = require('../config/cache.config');
const logger = require('../config/logger.config');

class CacheService {
  /**
   * Cache decorator pattern for functions
   */
  static memoize(fn, keyPrefix = 'cache', ttl = 3600) {
    return async function(...args) {
      const key = `${keyPrefix}:${JSON.stringify(args)}`;

      // Try to get from cache
      try {
        const cached = await cacheConfig.get(key);
        if (cached) {
          logger.debug('Cache hit', { key });
          return cached;
        }
      } catch (error) {
        logger.warn('Cache get failed:', { error: error.message });
      }

      // Call function if not cached
      const result = await fn.apply(this, args);

      // Store in cache
      try {
        await cacheConfig.set(key, result, ttl);
      } catch (error) {
        logger.warn('Cache set failed:', { error: error.message });
      }

      return result;
    };
  }

  /**
   * Cache invalidation based on key patterns
   */
  static async invalidate(pattern) {
    logger.info('Invalidating cache pattern:', { pattern });
    await cacheConfig.delByPattern(pattern);
  }

  /**
   * Batch cache get
   */
  static async getBatch(keys) {
    const results = {};

    for (const key of keys) {
      const value = await cacheConfig.get(key);
      results[key] = value;
    }

    return results;
  }

  /**
   * Batch cache set
   */
  static async setBatch(entries, ttl = 3600) {
    for (const [key, value] of Object.entries(entries)) {
      await cacheConfig.set(key, value, ttl);
    }
  }

  /**
   * Cache with fallback function
   */
  static async getOrSet(key, fallbackFn, ttl = 3600) {
    // Try to get from cache
    const cached = await cacheConfig.get(key);
    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    // Get from fallback function
    logger.debug('Cache miss, fetching from fallback', { key });
    const value = await fallbackFn();

    // Store in cache
    await cacheConfig.set(key, value, ttl);

    return value;
  }

  /**
   * Tag-based cache invalidation
   */
  static async setWithTags(key, value, tags = [], ttl = 3600) {
    // Store main value
    await cacheConfig.set(key, value, ttl);

    // Store tags for invalidation
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = (await cacheConfig.get(tagKey)) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await cacheConfig.set(tagKey, taggedKeys, ttl);
      }
    }
  }

  /**
   * Invalidate by tags
   */
  static async invalidateByTag(tag) {
    const tagKey = `tag:${tag}`;
    const keys = (await cacheConfig.get(tagKey)) || [];

    for (const key of keys) {
      await cacheConfig.del(key);
    }

    await cacheConfig.del(tagKey);
    logger.info('Cache invalidated by tag:', { tag, count: keys.length });
  }

  /**
   * Cache warming (preload frequently accessed data)
   */
  static async warmCache(loader) {
    logger.info('Warming cache...');
    try {
      const data = await loader();

      for (const [key, value, ttl] of Object.entries(data)) {
        await cacheConfig.set(key, value, ttl || 3600);
      }

      logger.info('Cache warming completed');
    } catch (error) {
      logger.error('Cache warming failed:', error);
    }
  }

  /**
   * Get cache metrics
   */
  static async getMetrics() {
    return cacheConfig.getStats();
  }
}

module.exports = CacheService;
```

### Step 4: Caching Middleware

Create `src/middleware/cache.middleware.js`:

```javascript
const cacheConfig = require('../config/cache.config');
const logger = require('../config/logger.config');

/**
 * Middleware to cache GET requests
 */
const cacheGetRequests = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyPrefix = 'http:get',
    condition = () => true,
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

    try {
      // Check cache
      const cached = await cacheConfig.get(cacheKey);
      if (cached) {
        logger.debug('HTTP cache hit', { url: req.originalUrl });
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch (error) {
      logger.warn('Cache retrieval failed:', { error: error.message });
    }

    // Intercept response
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      res.set('X-Cache', 'MISS');

      // Store in cache
      cacheConfig.set(cacheKey, data, ttl).catch((error) => {
        logger.warn('Cache storage failed:', { error: error.message });
      });

      return originalJson(data);
    };

    next();
  };
};

/**
 * Middleware to invalidate cache on mutations
 */
const invalidateCacheOnMutation = (patterns = []) => {
  return async (req, res, next) => {
    // Intercept response
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Invalidate on success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          cacheConfig.delByPattern(pattern).catch((error) => {
            logger.warn('Cache invalidation failed:', { error: error.message });
          });
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Manual cache invalidation endpoint
 */
const cacheInvalidationRoute = (app) => {
  app.post('/cache/invalidate', async (req, res, next) => {
    try {
      const { pattern } = req.body;

      if (!pattern) {
        return res.status(400).json({ error: 'Pattern required' });
      }

      await cacheConfig.delByPattern(pattern);
      res.json({ message: `Cache invalidated for pattern: ${pattern}` });
    } catch (error) {
      next(error);
    }
  });

  app.get('/cache/stats', async (req, res, next) => {
    try {
      const stats = await cacheConfig.getStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.post('/cache/clear', async (req, res, next) => {
    try {
      await cacheConfig.clear();
      res.json({ message: 'Cache cleared' });
    } catch (error) {
      next(error);
    }
  });
};

module.exports = {
  cacheGetRequests,
  invalidateCacheOnMutation,
  cacheInvalidationRoute,
};
```

### Step 5: Database Integration with Caching

Create `src/database/repositories/user.repository.js` (updated):

```javascript
const { db } = require('../connection');
const CacheService = require('../../services/cache.service');
const cacheConfig = require('../../config/cache.config');

class UserRepository {
  /**
   * Find by ID with caching
   */
  async findById(id) {
    const cacheKey = `user:${id}`;

    return CacheService.getOrSet(cacheKey, async () => {
      return db('users').where('id', id).first();
    }, 3600); // 1 hour TTL
  }

  /**
   * Find by email with caching
   */
  async findByEmail(email) {
    const cacheKey = `user:email:${email}`;

    return CacheService.getOrSet(cacheKey, async () => {
      return db('users').where('email', email).first();
    }, 3600);
  }

  /**
   * Find all with caching and pagination
   */
  async findAll(page = 1, limit = 10) {
    const cacheKey = `users:page:${page}:limit:${limit}`;

    return CacheService.getOrSet(cacheKey, async () => {
      const offset = (page - 1) * limit;

      const [rows, countResult] = await Promise.all([
        db('users')
          .select('*')
          .offset(offset)
          .limit(limit)
          .orderBy('created_at', 'desc'),
        db('users').count('* as count').first(),
      ]);

      return {
        data: rows,
        total: countResult.count,
        page,
        limit,
        pages: Math.ceil(countResult.count / limit),
      };
    }, 600); // 10 minutes TTL
  }

  /**
   * Create user and invalidate cache
   */
  async create(userData) {
    const [id] = await db('users').insert(userData);

    // Invalidate list caches
    await cacheConfig.delByPattern('users:page:*');

    return this.findById(id);
  }

  /**
   * Update user and invalidate cache
   */
  async update(id, updates) {
    await db('users').where('id', id).update(updates);

    // Invalidate specific user cache
    await cacheConfig.del(`user:${id}`);

    // Invalidate email cache if email changed
    if (updates.email) {
      await cacheConfig.delByPattern('user:email:*');
    }

    // Invalidate list caches
    await cacheConfig.delByPattern('users:page:*');

    return this.findById(id);
  }

  /**
   * Delete user and invalidate cache
   */
  async delete(id) {
    const result = await db('users').where('id', id).del();

    // Invalidate caches
    await cacheConfig.del(`user:${id}`);
    await cacheConfig.delByPattern('users:page:*');
    await cacheConfig.delByPattern('user:email:*');

    return result;
  }
}

module.exports = new UserRepository();
```

### Step 6: Express Integration

Create `src/app.js` (updated with caching):

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const {
  cacheGetRequests,
  invalidateCacheOnMutation,
  cacheInvalidationRoute,
} = require('./middleware/cache.middleware');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Cache middleware for GET requests (except certain endpoints)
app.use(
  cacheGetRequests({
    ttl: 300,
    keyPrefix: 'http',
    condition: (req) => !req.path.startsWith('/admin'),
  })
);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/users', async (req, res, next) => {
  try {
    const userRepository = require('./database/repositories/user.repository');
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const users = await userRepository.findAll(page, limit);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.get('/users/:id', async (req, res, next) => {
  try {
    const userRepository = require('./database/repositories/user.repository');
    const user = await userRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post(
  '/users',
  invalidateCacheOnMutation(['users:page:*']),
  async (req, res, next) => {
    try {
      const userRepository = require('./database/repositories/user.repository');
      const user = await userRepository.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  '/users/:id',
  invalidateCacheOnMutation(['user:*', 'users:page:*']),
  async (req, res, next) => {
    try {
      const userRepository = require('./database/repositories/user.repository');
      const user = await userRepository.update(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  '/users/:id',
  invalidateCacheOnMutation(['user:*', 'users:page:*']),
  async (req, res, next) => {
    try {
      const userRepository = require('./database/repositories/user.repository');
      await userRepository.delete(req.params.id);
      res.json({ message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Cache management endpoints
cacheInvalidationRoute(app);

module.exports = app;
```

### Step 7: Cache Warming Service

Create `src/services/cache-warmer.service.js`:

```javascript
const CacheService = require('./cache.service');
const logger = require('../config/logger.config');

class CacheWarmerService {
  /**
   * Warm cache on application startup
   */
  static async warmOnStartup() {
    logger.info('Starting cache warming...');

    try {
      // Load frequently accessed users
      await this.warmUsers();

      // Load configuration
      await this.warmConfig();

      logger.info('✓ Cache warming completed');
    } catch (error) {
      logger.error('Cache warming failed:', error);
    }
  }

  /**
   * Warm user cache
   */
  static async warmUsers() {
    const userRepository = require('../database/repositories/user.repository');

    const users = await userRepository.findAll(1, 50);

    for (const user of users.data) {
      await CacheService.setWithTags(
        `user:${user.id}`,
        user,
        ['users', 'user-data'],
        3600
      );
    }

    logger.info('Warmed user cache', { count: users.data.length });
  }

  /**
   * Warm configuration cache
   */
  static async warmConfig() {
    const config = {
      features: {
        newUI: true,
        betaFeatures: false,
      },
      rates: {
        apiLimit: 100,
        authLimit: 5,
      },
    };

    await CacheService.setWithTags(
      'config:global',
      config,
      ['config'],
      86400 // 24 hours
    );

    logger.info('Warmed config cache');
  }

  /**
   * Periodic cache refresh
   */
  static scheduleRefresh(intervalMs = 3600000) {
    setInterval(() => {
      this.warmOnStartup().catch((error) => {
        logger.error('Scheduled cache warming failed:', error);
      });
    }, intervalMs);
  }
}

module.exports = CacheWarmerService;
```

---

## 🧪 Testing

Create `src/tests/cache.test.js`:

```javascript
const cacheConfig = require('../config/cache.config');
const CacheService = require('../services/cache.service');

describe('Caching System', () => {
  beforeEach(async () => {
    await cacheConfig.clear();
  });

  test('should set and get value', async () => {
    await cacheConfig.set('test:key', { value: 'test' }, 3600);
    const result = await cacheConfig.get('test:key');

    expect(result).toEqual({ value: 'test' });
  });

  test('should delete value', async () => {
    await cacheConfig.set('test:key', { value: 'test' });
    await cacheConfig.del('test:key');
    const result = await cacheConfig.get('test:key');

    expect(result).toBeNull();
  });

  test('should memoize function', async () => {
    let callCount = 0;

    const memoized = CacheService.memoize(
      async (x) => {
        callCount++;
        return x * 2;
      },
      'test:memo',
      3600
    );

    const result1 = await memoized(5);
    const result2 = await memoized(5);

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(callCount).toBe(1); // Called only once
  });

  test('should invalidate by pattern', async () => {
    await cacheConfig.set('user:1', { id: 1 });
    await cacheConfig.set('user:2', { id: 2 });

    await cacheConfig.delByPattern('user:*');

    const user1 = await cacheConfig.get('user:1');
    const user2 = await cacheConfig.get('user:2');

    expect(user1).toBeNull();
    expect(user2).toBeNull();
  });

  test('should handle getOrSet', async () => {
    let callCount = 0;

    const value = await CacheService.getOrSet('test:getOrSet', async () => {
      callCount++;
      return { data: 'value' };
    });

    const value2 = await CacheService.getOrSet('test:getOrSet', async () => {
      callCount++;
      return { data: 'value' };
    });

    expect(value).toEqual({ data: 'value' });
    expect(value2).toEqual({ data: 'value' });
    expect(callCount).toBe(1); // Called only once
  });

  test('should manage tags', async () => {
    await CacheService.setWithTags('user:1', { id: 1 }, ['users']);
    await CacheService.setWithTags('user:2', { id: 2 }, ['users']);

    await CacheService.invalidateByTag('users');

    const user1 = await cacheConfig.get('user:1');
    const user2 = await cacheConfig.get('user:2');

    expect(user1).toBeNull();
    expect(user2).toBeNull();
  });
});
```

---

## 📝 Cache Strategies

```javascript
// TTL-Based Caching (expires after time)
await CacheService.getOrSet('key', fetchFn, 3600);

// LRU Caching (Redis handles automatically)
// Evicts least recently used keys when memory limit reached

// Tag-Based Invalidation
await CacheService.setWithTags('data:1', data, ['tag1', 'tag2']);
await CacheService.invalidateByTag('tag1'); // Invalidates all tagged items

// Cache Warming
await CacheWarmerService.warmOnStartup();

// Conditional Caching
cacheGetRequests({
  condition: (req) => !req.user?.isAdmin, // Don't cache for admins
});
```

---

## ✅ Checklist

- [ ] Redis configured with connection pooling
- [ ] Cache service implemented with memoization
- [ ] Middleware for HTTP caching added
- [ ] Database repository integration complete
- [ ] Tag-based invalidation working
- [ ] Cache warming configured
- [ ] Management endpoints created
- [ ] Tests passing
- [ ] Metrics endpoint working
- [ ] Memory fallback tested

---

## 🐛 Common Issues

### Issue: "Cache hit but data not there"
**Solution:** Check TTL expiration time

### Issue: "Stale data being served"
**Solution:** Ensure cache invalidation on mutations

### Issue: "Memory usage growing"
**Solution:** Redis eviction policy set to `allkeys-lru`

---

## 📋 Recipe Metadata

- **Recipe #:** 6/20
- **Category:** Performance/DevOps
- **Status:** Production-Ready
- **Difficulty:** Intermediate-Advanced
- **Performance:** 5-10x response time improvement

---

**Next Recipe (#7): GraphQL API Implementation**

*Phase 3 Progress: 6/20 recipes complete (30%)*
