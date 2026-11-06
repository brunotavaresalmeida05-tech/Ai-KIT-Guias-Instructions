# Recipe #14: API Versioning & Backward Compatibility

> Implement versioned APIs with smooth migration strategies

---

## 📊 Overview

- **Use Case:** API evolution, feature rollout, client migration, deprecation management
- **Tech Stack:** Node.js, Express, semantic versioning, feature flags
- **Time:** 2-3 hours
- **Difficulty:** Intermediate
- **Best Practice:** Zero downtime upgrades, gradual deprecation

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Existing API endpoints
- [ ] Semantic versioning understanding
- [ ] Recipe #4: Error Handling & Logging completed

---

## 📖 Implementation

### Step 1: API Versioning Strategy

Create `src/middleware/api-versioning.middleware.js`:

```javascript
const logger = require('../config/logger.config');

/**
 * Parse API version from request
 */
const parseVersion = (req, res, next) => {
  // Get version from multiple sources (in order of priority)
  let version = null;

  // 1. URL path: /api/v1/users
  const pathMatch = req.path.match(/^\/api\/v(\d+)\//);
  if (pathMatch) {
    version = parseInt(pathMatch[1]);
  }

  // 2. Header: X-API-Version: 1
  if (!version && req.headers['x-api-version']) {
    version = parseInt(req.headers['x-api-version']);
  }

  // 3. Query parameter: ?apiVersion=1
  if (!version && req.query.apiVersion) {
    version = parseInt(req.query.apiVersion);
  }

  // Default to latest version
  version = version || 2;

  req.apiVersion = version;
  req.versionString = `v${version}`;

  logger.debug('API version parsed', {
    version: req.apiVersion,
    path: req.path,
    method: req.method,
  });

  next();
};

/**
 * Require minimum API version
 */
const requireMinVersion = (minVersion) => {
  return (req, res, next) => {
    if (req.apiVersion < minVersion) {
      return res.status(400).json({
        error: `API v${req.apiVersion} is deprecated. Please upgrade to v${minVersion} or later.`,
        code: 'API_VERSION_DEPRECATED',
        currentVersion: req.apiVersion,
        minimumVersion: minVersion,
      });
    }

    next();
  };
};

/**
 * Deprecation warning header
 */
const deprecationWarning = (deprecatedVersion, alternatives = null) => {
  return (req, res, next) => {
    if (req.apiVersion === deprecatedVersion) {
      res.set(
        'Deprecation',
        'true'
      );

      res.set(
        'Sunset',
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()
      );

      if (alternatives) {
        res.set(
          'Link',
          `<${alternatives}>; rel="successor-version"`
        );
      }

      logger.warn('Deprecated API version used', {
        version: deprecatedVersion,
        path: req.path,
      });
    }

    next();
  };
};

module.exports = {
  parseVersion,
  requireMinVersion,
  deprecationWarning,
};
```

### Step 2: Feature Flags

Create `src/services/feature-flag.service.js`:

```javascript
const redis = require('redis');
const logger = require('../config/logger.config');

class FeatureFlagService {
  constructor() {
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

    this.redisClient.connect().catch((err) => {
      logger.error('Feature flag Redis connection failed:', err);
    });

    // In-memory cache
    this.cache = new Map();
    this.cacheExpiry = 60 * 1000; // 1 minute
  }

  /**
   * Check if feature is enabled for user
   */
  async isEnabled(feature, userId = null, defaultValue = false) {
    const cacheKey = `feature:${feature}:${userId || 'all'}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    try {
      const redisKey = userId ? `feature:${feature}:user:${userId}` : `feature:${feature}`;
      const value = await this.redisClient.get(redisKey);

      if (value !== null) {
        const enabled = value === 'true';
        this.cache.set(cacheKey, {
          value: enabled,
          expiry: Date.now() + this.cacheExpiry,
        });
        return enabled;
      }
    } catch (error) {
      logger.warn('Failed to check feature flag:', { feature, error: error.message });
    }

    return defaultValue;
  }

  /**
   * Enable feature globally
   */
  async enableFeature(feature, expiryDays = 365) {
    const ttl = expiryDays * 24 * 60 * 60;
    await this.redisClient.setex(`feature:${feature}`, ttl, 'true');

    this.cache.clear();
    logger.info('Feature enabled:', { feature });
  }

  /**
   * Disable feature globally
   */
  async disableFeature(feature) {
    await this.redisClient.del(`feature:${feature}`);

    this.cache.clear();
    logger.info('Feature disabled:', { feature });
  }

  /**
   * Enable feature for specific user
   */
  async enableForUser(feature, userId) {
    await this.redisClient.set(`feature:${feature}:user:${userId}`, 'true');

    this.cache.clear();
    logger.info('Feature enabled for user:', { feature, userId });
  }

  /**
   * Disable feature for specific user
   */
  async disableForUser(feature, userId) {
    await this.redisClient.del(`feature:${feature}:user:${userId}`);

    this.cache.clear();
    logger.info('Feature disabled for user:', { feature, userId });
  }

  /**
   * Enable for percentage of users (gradual rollout)
   */
  async enablePercentage(feature, percentage) {
    await this.redisClient.set(`feature:${feature}:percentage`, percentage.toString());

    this.cache.clear();
    logger.info('Feature rollout percentage set:', { feature, percentage });
  }

  /**
   * Check if user is in rollout percentage
   */
  async isInRollout(feature, userId) {
    try {
      const percentage = await this.redisClient.get(`feature:${feature}:percentage`);

      if (!percentage) {
        return false;
      }

      // Hash userId to get consistent percentage
      const hash = userId.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
      }, 0);

      const userPercentage = Math.abs(hash) % 100;
      return userPercentage < parseInt(percentage);
    } catch (error) {
      logger.warn('Failed to check rollout percentage:', { feature, error: error.message });
      return false;
    }
  }

  /**
   * Get feature status
   */
  async getFeatureStatus(feature) {
    return {
      enabled: await this.isEnabled(feature),
      percentage: await this.redisClient.get(`feature:${feature}:percentage`),
    };
  }
}

module.exports = new FeatureFlagService();
```

### Step 3: API Routes with Versioning

Create `src/routes/api/v1/users.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const userRepository = require('../../../database/repositories/user.repository');
const { verifyToken } = require('../../../middleware/auth.middleware');

/**
 * GET /api/v1/users
 * Get all users (V1 response format)
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const users = await userRepository.findAll(page, limit);

    // V1 response format (simple)
    res.json({
      data: users.data.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
      })),
      page,
      total: users.total,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:id
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // V1 response format
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

Create `src/routes/api/v2/users.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const userRepository = require('../../../database/repositories/user.repository');
const { verifyToken } = require('../../../middleware/auth.middleware');
const featureFlagService = require('../../../services/feature-flag.service');

/**
 * GET /api/v2/users
 * Get all users (V2 response format with cursor pagination)
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const first = parseInt(req.query.first) || 10;
    const after = req.query.after;

    const users = await userRepository.findAllCursor(first, after);

    // V2 response format (enhanced with metadata)
    res.json({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      cursor: {
        hasNextPage: users.length === first,
        endCursor: users.length > 0
          ? Buffer.from(users[users.length - 1].id).toString('base64')
          : null,
      },
      meta: {
        apiVersion: 2,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/users/:id
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Check if new profile feature is enabled
    const hasNewProfile = await featureFlagService.isEnabled(
      'new-user-profile',
      req.user.id
    );

    const response = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Add new fields only if feature enabled
    if (hasNewProfile) {
      response.profile = {
        bio: user.bio || null,
        avatar: user.avatar || null,
        website: user.website || null,
      };
    }

    // V2 response with metadata
    res.json({
      data: response,
      meta: {
        apiVersion: 2,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 4: Express Setup

Create `src/app.js` (updated for versioning):

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const { parseVersion, deprecationWarning } = require('./middleware/api-versioning.middleware');
const logger = require('./config/logger.config');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Parse API version
app.use(parseVersion);

// API Routes V1
app.use('/api/v1/users', deprecationWarning(1, '/api/v2/users'), require('./routes/api/v1/users.routes'));

// API Routes V2 (current)
app.use('/api/v2/users', require('./routes/api/v2/users.routes'));

// Version info endpoint
app.get('/api/versions', (req, res) => {
  res.json({
    supported: [
      {
        version: 1,
        status: 'deprecated',
        deprecatedOn: '2026-07-01',
        sunsetDate: '2026-10-01',
      },
      {
        version: 2,
        status: 'current',
        releaseDate: '2026-01-15',
      },
    ],
    current: 2,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = app;
```

### Step 5: Migration Helper

Create `src/utils/api-migration.util.js`:

```javascript
const logger = require('../config/logger.config');

/**
 * API Response Transformer
 */
class ApiResponseTransformer {
  /**
   * Transform V1 response to V2
   */
  static transformV1toV2(v1Response) {
    if (Array.isArray(v1Response)) {
      return v1Response.map((item) => this.transformUserV1toV2(item));
    }

    return this.transformUserV1toV2(v1Response);
  }

  /**
   * Transform single user from V1 to V2
   */
  static transformUserV1toV2(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      isActive: user.isActive !== false,
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };
  }

  /**
   * Transform V2 response to V1 (backward compatibility)
   */
  static transformV2toV1(v2Response) {
    if (Array.isArray(v2Response)) {
      return v2Response.map((item) => ({
        id: item.id,
        email: item.email,
        name: item.name,
      }));
    }

    return {
      id: v2Response.id,
      email: v2Response.email,
      name: v2Response.name,
    };
  }
}

/**
 * Migration Status Tracker
 */
class MigrationStatusTracker {
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * Record client migration
   */
  async recordMigration(clientId, fromVersion, toVersion) {
    const key = `migration:${clientId}`;

    const data = {
      fromVersion,
      toVersion,
      migratedAt: Date.now(),
      status: 'in-progress',
    };

    await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(data));

    logger.info('Migration recorded', {
      clientId,
      fromVersion,
      toVersion,
    });
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(clientId) {
    const key = `migration:${clientId}`;
    const data = await this.redis.get(key);

    return data ? JSON.parse(data) : null;
  }

  /**
   * Mark migration complete
   */
  async completeMigration(clientId) {
    const key = `migration:${clientId}`;
    const data = await this.redis.get(key);

    if (data) {
      const parsed = JSON.parse(data);
      parsed.status = 'completed';
      parsed.completedAt = Date.now();

      await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(parsed));

      logger.info('Migration completed', { clientId });
    }
  }
}

module.exports = {
  ApiResponseTransformer,
  MigrationStatusTracker,
};
```

### Step 6: Version Routes

Create `src/routes/versions.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const featureFlagService = require('../services/feature-flag.service');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

/**
 * GET /versions
 * Get API versions and feature flags
 */
router.get('/', (req, res) => {
  res.json({
    versions: [
      {
        number: 1,
        status: 'deprecated',
        deprecatedOn: '2026-07-01',
        sunsetDate: '2026-10-01',
        endpoints: 50,
      },
      {
        number: 2,
        status: 'current',
        releaseDate: '2026-01-15',
        endpoints: 60,
      },
    ],
    currentVersion: 2,
    clientVersion: req.apiVersion,
  });
});

/**
 * GET /features
 * Get feature flags status
 */
router.get('/features', verifyToken, async (req, res, next) => {
  try {
    const features = {
      'new-user-profile': await featureFlagService.isEnabled(
        'new-user-profile',
        req.user.id
      ),
      'advanced-search': await featureFlagService.isEnabled(
        'advanced-search',
        req.user.id
      ),
      'real-time-updates': await featureFlagService.isEnabled(
        'real-time-updates',
        req.user.id
      ),
    };

    res.json({ features });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /features/:feature/enable (admin)
 * Enable feature flag
 */
router.post(
  '/features/:feature/enable',
  verifyToken,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { feature } = req.params;
      const { percentage } = req.body;

      if (percentage !== undefined) {
        await featureFlagService.enablePercentage(feature, percentage);
        res.json({
          message: `Feature ${feature} enabled for ${percentage}% of users`,
        });
      } else {
        await featureFlagService.enableFeature(feature);
        res.json({ message: `Feature ${feature} enabled globally` });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /features/:feature/disable (admin)
 * Disable feature flag
 */
router.post(
  '/features/:feature/disable',
  verifyToken,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { feature } = req.params;
      await featureFlagService.disableFeature(feature);
      res.json({ message: `Feature ${feature} disabled` });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
```

---

## 📋 Versioning Strategy

```
Semantic Versioning: MAJOR.MINOR.PATCH

V1.0 → V1.1 (backward compatible, new optional fields)
V1.1 → V2.0 (breaking changes allowed)
V2.0 → V2.1 (backward compatible enhancements)

Deprecation Policy:
- Announce 6 months in advance
- Provide migration guides
- Support for 12 months after deprecation date
- Clear sunset dates
```

---

## ✅ Checklist

- [ ] Multiple API versions implemented
- [ ] Version parsing from URL/header/query
- [ ] Deprecation warnings configured
- [ ] Feature flags working
- [ ] V1 and V2 endpoints working
- [ ] Response transformers created
- [ ] Migration tracking implemented
- [ ] Version info endpoints available
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Gradual rollout capability added
- [ ] Backward compatibility maintained

---

## 📋 Recipe Metadata

- **Recipe #:** 14/20
- **Category:** API Design
- **Status:** Production-Ready
- **Difficulty:** Intermediate

---

**Next Recipe (#15): Monitoring & Observability**

*Phase 3 Progress: 14/20 recipes complete (70%)*
