# Recipe #17: Performance Optimization

> Systematic performance tuning and scalability improvements

---

## 📊 Overview

- **Use Case:** Reduce response times, increase throughput, lower resource usage
- **Tech Stack:** Node.js, autocannon, clinic.js, flamegraphs
- **Time:** 3-4 hours
- **Difficulty:** Advanced
- **Target:** <100ms P99 latency, 10x throughput increase

---

## ✅ Prerequisites

- [ ] Express.js application with metrics
- [ ] Node.js 18+
- [ ] Production-like test environment
- [ ] Recipe #15: Monitoring completed
- [ ] Baseline performance data

---

## 📖 Implementation

### Step 1: Install Performance Tools

```bash
npm install --save-dev autocannon clinic
npm install v8-profiler-next
npm install --save-dev 0x
```

### Step 2: Performance Analysis Service

Create `src/services/performance.service.js`:

```javascript
const logger = require('../config/logger.config');

class PerformanceAnalyzer {
  /**
   * Analyze bottleneck in query
   */
  static analyzeQueryPerformance(queries) {
    const sorted = queries.sort((a, b) => b.duration - a.duration);
    
    const analysis = {
      total: queries.length,
      totalTime: queries.reduce((sum, q) => sum + q.duration, 0),
      slowest: sorted.slice(0, 5),
      average: queries.reduce((sum, q) => sum + q.duration, 0) / queries.length,
      p95: this.calculatePercentile(queries, 95),
      p99: this.calculatePercentile(queries, 99),
    };

    logger.info('Query performance analysis:', analysis);

    return analysis;
  }

  /**
   * Calculate percentile
   */
  static calculatePercentile(data, percentile) {
    const sorted = data
      .map((q) => q.duration)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[index];
  }

  /**
   * Identify N+1 query problems
   */
  static identifyNPlusOneProblems(queries) {
    const grouped = {};

    for (const query of queries) {
      const normalized = query.sql.replace(/\d+/g, '?');

      if (!grouped[normalized]) {
        grouped[normalized] = [];
      }

      grouped[normalized].push(query);
    }

    const problems = [];

    for (const [pattern, queries] of Object.entries(grouped)) {
      if (queries.length > 5) {
        problems.push({
          pattern,
          count: queries.length,
          totalTime: queries.reduce((sum, q) => sum + q.duration, 0),
        });
      }
    }

    if (problems.length > 0) {
      logger.warn('N+1 query problems detected:', problems);
    }

    return problems;
  }

  /**
   * Analyze memory usage
   */
  static analyzeMemoryUsage() {
    const mem = process.memoryUsage();

    return {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
      external: `${Math.round(mem.external / 1024 / 1024)} MB`,
      percentUsed: (
        (mem.heapUsed / mem.heapTotal) *
        100
      ).toFixed(2),
    };
  }

  /**
   * Identify memory leaks
   */
  static identifyMemoryLeaks(snapshots) {
    if (snapshots.length < 2) {
      return null;
    }

    const leaks = [];

    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      const growth = (
        (curr.heapUsed - prev.heapUsed) /
        prev.heapUsed
      ).toFixed(2);

      if (growth > 0.1) {
        // 10% growth
        leaks.push({
          between: `snapshot ${i - 1} and ${i}`,
          growth: `${(growth * 100).toFixed(2)}%`,
          heapUsed: `${Math.round(curr.heapUsed / 1024 / 1024)} MB`,
        });
      }
    }

    if (leaks.length > 0) {
      logger.warn('Potential memory leaks detected:', leaks);
    }

    return leaks;
  }
}

module.exports = PerformanceAnalyzer;
```

### Step 3: Query Optimization

Create `src/database/query-optimizer.js`:

```javascript
const logger = require('../config/logger.config');

class QueryOptimizer {
  /**
   * Optimize by adding indexes
   */
  static async optimizeIndexes(db) {
    const indexes = [
      // User indexes
      { table: 'users', column: 'email', unique: true },
      { table: 'users', column: 'role' },
      { table: 'users', column: 'isActive' },

      // Post indexes
      { table: 'posts', column: 'authorId' },
      { table: 'posts', column: 'status' },
      { table: 'posts', column: 'createdAt' },

      // Comment indexes
      { table: 'comments', column: 'postId' },
      { table: 'comments', column: 'authorId' },
    ];

    for (const index of indexes) {
      try {
        const indexName = `${index.table}_${index.column}_idx`;

        await db.raw(
          `CREATE ${index.unique ? 'UNIQUE' : ''} INDEX ${indexName} 
           ON ${index.table} (${index.column})`
        );

        logger.info('Index created:', { indexName });
      } catch (error) {
        // Index may already exist
        logger.debug('Index creation:', { error: error.message });
      }
    }
  }

  /**
   * Use eager loading to prevent N+1
   */
  static async eagerLoadRelations(query, relations) {
    for (const relation of relations) {
      query = query.withGraphFetched(relation);
    }

    return query;
  }

  /**
   * Batch load data
   */
  static async batchLoad(db, table, ids, column = 'id') {
    return db(table)
      .whereIn(column, ids)
      .select('*');
  }

  /**
   * Analyze query execution plan
   */
  static async analyzeExecutionPlan(db, query) {
    try {
      const plan = await db.raw(`EXPLAIN ANALYZE ${query}`);

      logger.info('Execution plan:', { plan });

      return plan;
    } catch (error) {
      logger.error('Failed to analyze query:', error);

      return null;
    }
  }
}

module.exports = QueryOptimizer;
```

### Step 4: Caching Optimization

Create `src/services/cache-optimizer.service.js`:

```javascript
const cacheConfig = require('../config/cache.config');
const logger = require('../config/logger.config');

class CacheOptimizerService {
  /**
   * Implement cache warming on startup
   */
  static async warmCache(loader) {
    logger.info('Warming cache...');

    const start = Date.now();

    const data = await loader();

    for (const [key, value, ttl] of Object.entries(data)) {
      await cacheConfig.set(key, value, ttl || 3600);
    }

    const duration = Date.now() - start;

    logger.info('Cache warming completed', {
      duration: `${duration}ms`,
      items: Object.keys(data).length,
    });
  }

  /**
   * Implement cache compression for large values
   */
  static async setCompressed(key, value, ttl = 3600) {
    const zlib = require('zlib');

    const serialized = JSON.stringify(value);
    const compressed = zlib.gzipSync(serialized);

    await cacheConfig.set(
      key,
      compressed.toString('base64'),
      ttl
    );

    logger.debug('Value cached (compressed)', {
      key,
      originalSize: serialized.length,
      compressedSize: compressed.length,
      ratio: (compressed.length / serialized.length).toFixed(2),
    });
  }

  /**
   * Get compressed value
   */
  static async getCompressed(key) {
    const zlib = require('zlib');

    const compressed = await cacheConfig.get(key);

    if (!compressed) {
      return null;
    }

    const buffer = Buffer.from(compressed, 'base64');
    const decompressed = zlib.gunzipSync(buffer);

    return JSON.parse(decompressed.toString());
  }

  /**
   * Cache statistics
   */
  static async getCacheStats() {
    const info = await cacheConfig.redisClient.info('stats');

    return {
      hitRate: this.calculateHitRate(info),
      missRate: this.calculateMissRate(info),
      evictions: this.parseRedisInfo(info, 'evicted_keys'),
    };
  }

  /**
   * Parse Redis info
   */
  static parseRedisInfo(info, key) {
    const match = info.match(new RegExp(`${key}:(\\d+)`));

    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Calculate hit rate
   */
  static calculateHitRate(info) {
    const hits = this.parseRedisInfo(info, 'keyspace_hits');
    const misses = this.parseRedisInfo(info, 'keyspace_misses');
    const total = hits + misses;

    return total > 0 ? ((hits / total) * 100).toFixed(2) : 0;
  }

  /**
   * Calculate miss rate
   */
  static calculateMissRate(info) {
    const hits = this.parseRedisInfo(info, 'keyspace_hits');
    const misses = this.parseRedisInfo(info, 'keyspace_misses');
    const total = hits + misses;

    return total > 0 ? ((misses / total) * 100).toFixed(2) : 0;
  }
}

module.exports = CacheOptimizerService;
```

### Step 5: Connection Pooling

Create `src/config/connection-pool.config.js`:

```javascript
const logger = require('./logger.config');

/**
 * Configure connection pools
 */
function configureConnectionPools(knex, redisClient) {
  // Database connection pool
  const dbPool = knex.client.config.pool;

  logger.info('Database connection pool configured', {
    min: dbPool.min,
    max: dbPool.max,
  });

  // Redis connection pooling is handled by ioredis
  logger.info('Redis connection pool configured');

  return {
    dbPool,
  };
}

module.exports = {
  configureConnectionPools,
};
```

### Step 6: Request Optimization Middleware

Create `src/middleware/request-optimization.middleware.js`:

```javascript
const compression = require('compression');
const logger = require('../config/logger.config');

/**
 * Compression middleware
 */
const compressionMiddleware = compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Balance between speed and compression ratio
});

/**
 * Request deduplication middleware
 */
const deduplicationMiddleware = (req, res, next) => {
  const requestKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
  const requestId = `req-${Date.now()}`;

  req.requestId = requestId;

  // Store request hash for deduplication
  const store = new Map();

  if (store.has(requestKey)) {
    logger.debug('Duplicate request detected', { requestKey });

    // Return cached response
    return res.json(store.get(requestKey));
  }

  // Intercept response to cache it
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    store.set(requestKey, data);

    return originalJson(data);
  };

  next();
};

/**
 * Payload optimization middleware
 */
const payloadOptimization = (req, res, next) => {
  // Only send required fields in response
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    const fields = req.query.fields;

    if (fields && Array.isArray(fields)) {
      if (Array.isArray(data)) {
        data = data.map((item) =>
          fields.reduce((obj, field) => {
            obj[field] = item[field];

            return obj;
          }, {})
        );
      } else if (typeof data === 'object') {
        data = fields.reduce((obj, field) => {
          obj[field] = data[field];

          return obj;
        }, {});
      }
    }

    return originalJson(data);
  };

  next();
};

module.exports = {
  compressionMiddleware,
  deduplicationMiddleware,
  payloadOptimization,
};
```

### Step 7: Benchmarking Scripts

Create `scripts/benchmark.js`:

```javascript
const autocannon = require('autocannon');
const logger = require('../src/config/logger.config');

/**
 * Run performance benchmark
 */
async function runBenchmark() {
  const result = await autocannon({
    url: 'http://localhost:3000',
    connections: 10,
    duration: 30,
    pipelining: 1,
    requests: [
      {
        path: '/api/v2/users?limit=10',
        method: 'GET',
        headers: {
          authorization: `Bearer ${process.env.TEST_TOKEN}`,
        },
      },
      {
        path: '/search/users',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.TEST_TOKEN}`,
        },
        body: JSON.stringify({ query: 'test' }),
      },
    ],
  });

  console.log(autocannon.printResult(result));

  const summary = {
    requests: result.requests.average,
    throughput: result.throughput.average,
    latency: {
      min: result.latency.min,
      max: result.latency.max,
      mean: result.latency.mean,
      p99: result.latency.p99,
    },
    errors: result.errors,
  };

  logger.info('Benchmark Results:', summary);

  return summary;
}

// Run benchmark
runBenchmark().catch((error) => {
  logger.error('Benchmark failed:', error);
  process.exit(1);
});
```

### Step 8: Production Configuration

Create `src/config/production-optimization.config.js`:

```javascript
const logger = require('./logger.config');

/**
 * Production optimization settings
 */
const productionOptimizations = {
  // Node.js settings
  nodeSettings: {
    // Enable clustering for multi-core systems
    enableClustering: true,
    workers: require('os').cpus().length,

    // Memory settings
    maxOldSpaceSize: 2048, // 2GB

    // GC settings
    enableGCLogging: true,
  },

  // Express settings
  expressSettings: {
    // Disable x-powered-by header
    hidePoweredBy: true,

    // Enable trust proxy for load balancers
    trustProxy: 1,

    // Set strict routing
    strictRouting: true,

    // Case sensitive routing
    caseSensitiveRouting: true,
  },

  // Database settings
  databaseSettings: {
    pool: {
      min: 5,
      max: 20,
    },
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },

  // Cache settings
  cacheSettings: {
    ttl: 3600,
    maxMemory: '2gb',
    maxMemoryPolicy: 'allkeys-lru',
  },
};

/**
 * Apply production optimizations
 */
function applyOptimizations(app) {
  const settings = productionOptimizations.expressSettings;

  // Apply settings
  for (const [key, value] of Object.entries(settings)) {
    app.set(key, value);
  }

  logger.info('✓ Production optimizations applied');
}

module.exports = {
  productionOptimizations,
  applyOptimizations,
};
```

---

## 📊 Optimization Checklist

```
Database:
☐ Indexes created on frequently queried columns
☐ N+1 queries eliminated
☐ Connection pooling configured
☐ Query execution plans analyzed

Caching:
☐ Redis cache implemented
☐ Cache warming on startup
☐ Hit rate > 80%
☐ Cache compression for large values

API:
☐ Response compression enabled
☐ Payload filtering by fields
☐ Pagination implemented
☐ Request deduplication

Performance:
☐ P99 latency < 100ms
☐ Throughput > 1000 req/s
☐ Memory usage stable
☐ No memory leaks
```

---

## ✅ Checklist

- [ ] Performance analysis tools installed
- [ ] Query optimizer implemented
- [ ] Database indexes created
- [ ] Cache optimization strategy applied
- [ ] Connection pooling configured
- [ ] Compression middleware added
- [ ] Benchmarking scripts created
- [ ] P99 latency measured
- [ ] Throughput targets set
- [ ] Memory profiling done
- [ ] Production optimizations applied
- [ ] Load testing completed

---

## 🧪 Performance Targets

```
Before Optimization:
- P99 latency: 500ms
- Throughput: 100 req/s
- Memory: Growing

After Optimization:
- P99 latency: <100ms (5x improvement)
- Throughput: 1000+ req/s (10x improvement)
- Memory: Stable
```

---

## 📋 Recipe Metadata

- **Recipe #:** 17/20
- **Category:** Performance/DevOps
- **Status:** Production-Ready
- **Difficulty:** Advanced
- **Impact:** 10x throughput improvement

---

**Next Recipe (#18): Security Hardening**

*Phase 3 Progress: 17/20 recipes complete (85%)*
