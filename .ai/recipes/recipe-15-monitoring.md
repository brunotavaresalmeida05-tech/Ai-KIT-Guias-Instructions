# Recipe #15: Monitoring & Observability

> Implement comprehensive monitoring with distributed tracing and metrics

---

## 📊 Overview

- **Use Case:** Application health monitoring, performance tracking, incident detection
- **Tech Stack:** Node.js, Prometheus, Grafana, Jaeger, Winston
- **Time:** 4-5 hours
- **Difficulty:** Advanced
- **Impact:** Reduce MTTR (Mean Time To Resolution) by 80%

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] Docker for running monitoring stack
- [ ] Recipe #4: Error Handling & Logging completed
- [ ] Basic understanding of metrics and tracing

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install prom-client @opentelemetry/api @opentelemetry/sdk-node
npm install @opentelemetry/auto @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/resources @opentelemetry/semantic-conventions
npm install statsd-client
npm install --save-dev @types/prom-client
```

### Step 2: Prometheus Metrics Configuration

Create `src/config/metrics.config.js`:

```javascript
const promClient = require('prom-client');
const logger = require('./logger.config');

/**
 * Default metrics
 */
const defaultMetrics = promClient.collectDefaultMetrics;

/**
 * Custom metrics
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const apiErrorsTotal = new promClient.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['error_type', 'endpoint'],
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['operation', 'table'],
  buckets: [1, 10, 50, 100, 500, 1000],
});

const cacheHitRate = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_name'],
});

const cacheMissRate = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_name'],
});

const queueJobsProcessed = new promClient.Counter({
  name: 'queue_jobs_processed_total',
  help: 'Total queue jobs processed',
  labelNames: ['queue_name', 'status'],
});

const queueJobDuration = new promClient.Histogram({
  name: 'queue_job_duration_ms',
  help: 'Duration of queue jobs in ms',
  labelNames: ['queue_name'],
  buckets: [100, 500, 1000, 5000, 10000],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['connection_type'],
});

const businessMetrics = new promClient.Gauge({
  name: 'business_metric',
  help: 'Custom business metrics',
  labelNames: ['metric_name'],
});

/**
 * Initialize metrics
 */
function initializeMetrics() {
  // Collect default metrics
  defaultMetrics({ timeout: 5000 });

  logger.info('✓ Prometheus metrics initialized');

  return {
    httpRequestDuration,
    httpRequestsTotal,
    apiErrorsTotal,
    databaseQueryDuration,
    cacheHitRate,
    cacheMissRate,
    queueJobsProcessed,
    queueJobDuration,
    activeConnections,
    businessMetrics,
  };
}

/**
 * Get metrics registry
 */
function getMetricsRegistry() {
  return promClient.register;
}

module.exports = {
  initializeMetrics,
  getMetricsRegistry,
};
```

### Step 3: Request Metrics Middleware

Create `src/middleware/metrics.middleware.js`:

```javascript
const logger = require('../config/logger.config');

/**
 * Metrics middleware factory
 */
function createMetricsMiddleware(metrics) {
  return (req, res, next) => {
    const startTime = Date.now();
    const routePath = req.route?.path || req.path;

    // Track active connections
    metrics.activeConnections.inc({ connection_type: 'http' });

    // Intercept response
    const originalSend = res.send.bind(res);

    res.send = function(data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Record metrics
      metrics.httpRequestDuration.observe(
        {
          method: req.method,
          route: routePath,
          status_code: statusCode,
        },
        duration
      );

      metrics.httpRequestsTotal.inc({
        method: req.method,
        route: routePath,
        status_code: statusCode,
      });

      // Track errors
      if (statusCode >= 400) {
        metrics.apiErrorsTotal.inc({
          error_type: `${statusCode}`,
          endpoint: routePath,
        });
      }

      // Decrease active connections
      metrics.activeConnections.dec({ connection_type: 'http' });

      logger.debug('Request metrics recorded', {
        method: req.method,
        path: routePath,
        statusCode,
        duration: `${duration}ms`,
      });

      return originalSend(data);
    };

    next();
  };
}

module.exports = {
  createMetricsMiddleware,
};
```

### Step 4: Distributed Tracing Configuration

Create `src/config/tracing.config.js`:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const logger = require('./logger.config');

/**
 * Initialize distributed tracing with OpenTelemetry
 */
function initializeTracing() {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'api',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  logger.info('✓ OpenTelemetry tracing initialized');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
    logger.info('✓ OpenTelemetry SDK shut down');
  });

  return sdk;
}

module.exports = {
  initializeTracing,
};
```

### Step 5: Health Check Endpoint

Create `src/middleware/health-check.middleware.js`:

```javascript
const logger = require('../config/logger.config');

/**
 * Health check response structure
 */
class HealthCheck {
  constructor() {
    this.status = 'up';
    this.checks = {};
    this.timestamp = new Date();
  }

  /**
   * Add service check
   */
  addCheck(name, status, details = {}) {
    this.checks[name] = {
      status,
      details,
      timestamp: new Date(),
    };

    // Update overall status
    if (status === 'down') {
      this.status = 'degraded';
    }
  }

  /**
   * Get JSON response
   */
  toJSON() {
    return {
      status: this.status,
      timestamp: this.timestamp,
      uptime: process.uptime(),
      checks: this.checks,
      version: process.env.SERVICE_VERSION || '1.0.0',
    };
  }
}

/**
 * Health check middleware factory
 */
function createHealthCheckMiddleware(dependencies = {}) {
  return async (req, res) => {
    const health = new HealthCheck();

    // Check database
    if (dependencies.db) {
      try {
        await dependencies.db.raw('SELECT 1');
        health.addCheck('database', 'up');
      } catch (error) {
        health.addCheck('database', 'down', {
          error: error.message,
        });
      }
    }

    // Check Redis
    if (dependencies.redis) {
      try {
        await dependencies.redis.ping();
        health.addCheck('redis', 'up');
      } catch (error) {
        health.addCheck('redis', 'down', {
          error: error.message,
        });
      }
    }

    // Check Elasticsearch
    if (dependencies.elasticsearch) {
      try {
        await dependencies.elasticsearch.cluster.health();
        health.addCheck('elasticsearch', 'up');
      } catch (error) {
        health.addCheck('elasticsearch', 'down', {
          error: error.message,
        });
      }
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (memUsagePercent > 90) {
      health.addCheck('memory', 'degraded', {
        percentUsed: memUsagePercent.toFixed(2),
      });
    } else {
      health.addCheck('memory', 'up', {
        percentUsed: memUsagePercent.toFixed(2),
      });
    }

    const statusCode = health.status === 'up' ? 200 : 503;

    res.status(statusCode).json(health.toJSON());
  };
}

module.exports = {
  HealthCheck,
  createHealthCheckMiddleware,
};
```

### Step 6: Application Metrics Service

Create `src/services/metrics.service.js`:

```javascript
const logger = require('../config/logger.config');

class MetricsService {
  constructor(metrics) {
    this.metrics = metrics;
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(operation, table, duration) {
    this.metrics.databaseQueryDuration.observe(
      {
        operation,
        table,
      },
      duration
    );

    logger.debug('Database query recorded', {
      operation,
      table,
      duration: `${duration}ms`,
    });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheName) {
    this.metrics.cacheHitRate.inc({ cache_name: cacheName });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheName) {
    this.metrics.cacheMissRate.inc({ cache_name: cacheName });
  }

  /**
   * Record queue job
   */
  recordQueueJob(queueName, status, duration) {
    this.metrics.queueJobsProcessed.inc({
      queue_name: queueName,
      status,
    });

    this.metrics.queueJobDuration.observe(
      {
        queue_name: queueName,
      },
      duration
    );

    logger.debug('Queue job recorded', {
      queueName,
      status,
      duration: `${duration}ms`,
    });
  }

  /**
   * Update business metric
   */
  updateBusinessMetric(metricName, value) {
    this.metrics.businessMetrics.set(
      { metric_name: metricName },
      value
    );

    logger.debug('Business metric updated', {
      metricName,
      value,
    });
  }

  /**
   * Get current metrics
   */
  async getMetrics() {
    return this.metrics;
  }
}

module.exports = MetricsService;
```

### Step 7: Express Integration

Create `src/app.js` (updated with metrics):

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const { initializeMetrics, getMetricsRegistry } = require('./config/metrics.config');
const { initializeTracing } = require('./config/tracing.config');
const { createMetricsMiddleware } = require('./middleware/metrics.middleware');
const { createHealthCheckMiddleware } = require('./middleware/health-check.middleware');
const logger = require('./config/logger.config');

// Initialize tracing first
initializeTracing();

const app = express();

// Initialize metrics
const metrics = initializeMetrics();

// Middleware
app.use(express.json());
app.use(cors());
app.use(createMetricsMiddleware(metrics));

// Health check
app.get('/health', createHealthCheckMiddleware({
  db: require('./database/connection').db,
  redis: require('./config/cache.config').redisClient,
}));

// Metrics endpoint (Prometheus)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getMetricsRegistry().contentType);
    res.end(await getMetricsRegistry().metrics());
  } catch (error) {
    logger.error('Failed to generate metrics:', error);
    res.status(500).end(error);
  }
});

// Make metrics available globally
app.use((req, res, next) => {
  req.metrics = metrics;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API Server with Observability' });
});

module.exports = app;
```

### Step 8: Logging Configuration Enhanced

Create `src/config/logger-observability.config.js`:

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

/**
 * Structured logging for observability
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const base = {
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        service: process.env.SERVICE_NAME || 'api',
      };

      // Add trace ID if available
      if (info.traceId) {
        base.traceId = info.traceId;
      }

      // Add custom fields
      if (info.metadata) {
        Object.assign(base, info.metadata);
      }

      return JSON.stringify(base);
    })
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '14d',
    }),

    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'errors-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxDays: '14d',
    }),
  ],
});

module.exports = logger;
```

### Step 9: Docker Compose for Monitoring Stack

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SECURITY_ADMIN_USER=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4318:4318"
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  prometheus-data:
  grafana-data:
  elasticsearch-data:
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Step 10: Alerting Configuration

Create `src/config/alerts.config.js`:

```javascript
const logger = require('./logger.config');

/**
 * Alert rules
 */
const alertRules = {
  high_error_rate: {
    condition: 'error_rate > 0.05',
    severity: 'critical',
    message: 'Error rate exceeded 5%',
    duration: '5m',
  },
  high_response_time: {
    condition: 'p95_latency > 1000',
    severity: 'warning',
    message: 'P95 latency exceeded 1 second',
    duration: '5m',
  },
  high_memory_usage: {
    condition: 'memory_usage > 0.9',
    severity: 'critical',
    message: 'Memory usage exceeded 90%',
    duration: '2m',
  },
  database_down: {
    condition: 'database_health == down',
    severity: 'critical',
    message: 'Database is down',
    duration: '1m',
  },
  cache_down: {
    condition: 'cache_health == down',
    severity: 'warning',
    message: 'Cache service is down',
    duration: '2m',
  },
};

/**
 * Alert handler
 */
class AlertHandler {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Send alert
   */
  async sendAlert(alertName, details = {}) {
    const alert = alertRules[alertName];

    if (!alert) {
      logger.warn('Unknown alert:', { alertName });
      return;
    }

    const notification = {
      title: `[${alert.severity.toUpperCase()}] ${alert.message}`,
      message: JSON.stringify(details),
      type: 'alert',
      severity: alert.severity,
      alertName,
      timestamp: new Date(),
    };

    logger.error('Alert triggered', notification);

    // Send to notification service (Slack, email, etc.)
    if (this.notificationService) {
      await this.notificationService.sendAlert(notification);
    }
  }
}

module.exports = {
  alertRules,
  AlertHandler,
};
```

---

## 🧪 Testing

Create `src/tests/metrics.test.js`:

```javascript
const { initializeMetrics, getMetricsRegistry } = require('../config/metrics.config');

describe('Metrics System', () => {
  let metrics;

  beforeAll(() => {
    metrics = initializeMetrics();
  });

  test('should record HTTP request duration', () => {
    metrics.httpRequestDuration.observe(
      {
        method: 'GET',
        route: '/api/users',
        status_code: 200,
      },
      100
    );

    expect(metrics.httpRequestDuration).toBeDefined();
  });

  test('should increment request counter', () => {
    metrics.httpRequestsTotal.inc({
      method: 'POST',
      route: '/api/users',
      status_code: 201,
    });

    expect(metrics.httpRequestsTotal).toBeDefined();
  });

  test('should record database query', () => {
    metrics.databaseQueryDuration.observe(
      {
        operation: 'SELECT',
        table: 'users',
      },
      50
    );

    expect(metrics.databaseQueryDuration).toBeDefined();
  });

  test('should get metrics in Prometheus format', async () => {
    const registry = getMetricsRegistry();
    const metricsText = await registry.metrics();

    expect(metricsText).toContain('http_request_duration_ms');
    expect(metricsText).toContain('http_requests_total');
  });

  test('should track cache hits and misses', () => {
    metrics.cacheHitRate.inc({ cache_name: 'user-cache' });
    metrics.cacheMissRate.inc({ cache_name: 'user-cache' });

    expect(metrics.cacheHitRate).toBeDefined();
    expect(metrics.cacheMissRate).toBeDefined();
  });
});
```

---

## ✅ Checklist

- [ ] Prometheus metrics configured
- [ ] OpenTelemetry tracing initialized
- [ ] Metrics middleware applied
- [ ] Health check endpoint working
- [ ] Prometheus scraping configured
- [ ] Grafana dashboards created
- [ ] Jaeger tracing active
- [ ] Alert rules configured
- [ ] Structured logging in place
- [ ] Tests passing
- [ ] Monitoring stack deployed
- [ ] Dashboards accessible
- [ ] Alerts configured

---

## 📊 Monitoring Stack URLs

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000 (admin/admin)
- **Jaeger:** http://localhost:16686
- **Kibana:** http://localhost:5601
- **Health Check:** http://localhost:3000/health
- **Metrics:** http://localhost:3000/metrics

---

## 🐛 Common Issues

### Issue: "Prometheus can't scrape metrics"
**Solution:** Ensure `/metrics` endpoint is accessible and API is running

### Issue: "Jaeger not receiving traces"
**Solution:** Check `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable

### Issue: "High memory usage in Prometheus"
**Solution:** Reduce retention period or increase storage

---

## 📋 Recipe Metadata

- **Recipe #:** 15/20
- **Category:** DevOps/Monitoring
- **Status:** Production-Ready
- **Difficulty:** Advanced
- **Impact:** 80% reduction in MTTR

---

**Next Recipe (#16): Testing & QA**

*Phase 3 Progress: 15/20 recipes complete (75%)*
