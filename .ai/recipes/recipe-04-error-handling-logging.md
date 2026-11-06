# Recipe #4: Error Handling & Structured Logging

> Implement production-grade error handling with structured logging

---

## 📊 Overview

- **Use Case:** Centralized error tracking, debugging, monitoring
- **Tech Stack:** Node.js, Winston, Express error middleware
- **Time:** 2-3 hours
- **Difficulty:** Intermediate
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] Filesystem write permissions for logs
- [ ] Understanding of middleware

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install winston winston-daily-rotate-file express-async-errors
npm install --save-dev @types/winston
```

### Step 2: Logger Configuration

Create `src/config/logger.config.js`:

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');

/**
 * Custom error formatting
 */
const errorFormatter = (error) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return error;
};

/**
 * Custom format for structured logging
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.metadata(),
  winston.format.printf((info) => {
    const { timestamp, level, message, metadata, ...rest } = info;

    const baseLog = {
      timestamp,
      level,
      message,
      ...rest,
    };

    if (metadata && Object.keys(metadata).length > 0) {
      baseLog.metadata = metadata;
    }

    return JSON.stringify(baseLog);
  })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console output (always)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // Error logs (daily rotation)
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxDays: 14,
      handleExceptions: true,
    }),

    // Combined logs (daily rotation)
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: 7,
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: 14,
    }),
  ],
});

/**
 * Log levels
 */
logger.levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

module.exports = logger;
```

### Step 3: Custom Error Classes

Create `src/errors/AppError.js`:

```javascript
/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
      },
    };
  }
}

module.exports = AppError;
```

Create `src/errors/ValidationError.js`:

```javascript
const AppError = require('./AppError');

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        errors: this.errors,
        timestamp: this.timestamp,
      },
    };
  }
}

module.exports = ValidationError;
```

Create `src/errors/NotFoundError.js`:

```javascript
const AppError = require('./AppError');

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

module.exports = NotFoundError;
```

Create `src/errors/UnauthorizedError.js`:

```javascript
const AppError = require('./AppError');

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

module.exports = UnauthorizedError;
```

Create `src/errors/ForbiddenError.js`:

```javascript
const AppError = require('./AppError');

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

module.exports = ForbiddenError;
```

### Step 4: Error Handling Middleware

Create `src/middleware/error.middleware.js`:

```javascript
const logger = require('../config/logger.config');
const AppError = require('../errors/AppError');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default error
  let error = err;

  if (!(err instanceof AppError)) {
    // Convert standard errors to AppError
    error = new AppError(
      err.message || 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Log error
  const logContext = {
    method: req.method,
    path: req.path,
    statusCode: error.statusCode,
    errorCode: error.code,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  if (error.statusCode >= 500) {
    logger.error(error.message, {
      ...logContext,
      stack: error.stack,
      originalError: err instanceof AppError ? null : err.toString(),
    });
  } else {
    logger.warn(error.message, logContext);
  }

  // Don't expose internal details in production
  const response = {
    error: {
      message: error.message,
      code: error.code,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    response.error.details = error.errors || null;
  }

  if (error.statusCode >= 500 && process.env.NODE_ENV === 'production') {
    response.error.message = 'Internal server error';
  }

  res.status(error.statusCode).json(response);
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Cannot ${req.method} ${req.path}`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
```

### Step 5: Request Logging Middleware

Create `src/middleware/request-logger.middleware.js`:

```javascript
const logger = require('../config/logger.config');

/**
 * Log incoming requests and outgoing responses
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Attach request ID for tracing
  req.requestId = requestId;

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;

    logger.http('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      userId: req.user?.id,
      ip: req.ip,
      query: req.query,
      body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    });

    originalSend.call(this, data);
  };

  next();
};

module.exports = requestLogger;
```

### Step 6: Express Integration

Update `src/app.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors'); // Handle async errors automatically
const logger = require('./config/logger.config');
const requestLogger = require('./middleware/request-logger.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(requestLogger);

// HTTPS redirect
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Example route with error handling
app.get('/users/:id', async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    const { ValidationError } = require('./errors');
    throw new ValidationError('Invalid user ID', [
      { field: 'id', message: 'Must be a number' },
    ]);
  }

  // Simulate user lookup
  const user = null;
  if (!user) {
    const { NotFoundError } = require('./errors');
    throw new NotFoundError('User');
  }

  res.json(user);
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    promise: promise.toString(),
  });
});

module.exports = app;
```

### Step 7: Logger Service

Create `src/services/logger.service.js`:

```javascript
const logger = require('../config/logger.config');

class LoggerService {
  /**
   * Log info
   */
  static info(message, metadata = {}) {
    logger.info(message, { metadata });
  }

  /**
   * Log warning
   */
  static warn(message, metadata = {}) {
    logger.warn(message, { metadata });
  }

  /**
   * Log error
   */
  static error(message, error = null, metadata = {}) {
    const errorData = {
      ...metadata,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };

    logger.error(message, errorData);
  }

  /**
   * Log debug info
   */
  static debug(message, metadata = {}) {
    logger.debug(message, { metadata });
  }

  /**
   * Log performance metrics
   */
  static performance(operation, duration, metadata = {}) {
    logger.info(`Performance: ${operation}`, {
      metadata: {
        ...metadata,
        operation,
        durationMs: duration,
      },
    });
  }
}

module.exports = LoggerService;
```

---

## 🧪 Testing

Create `src/tests/error-handling.test.js`:

```javascript
const request = require('supertest');
const app = require('../app');

describe('Error Handling', () => {
  test('should return 404 for unknown route', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  test('should return 400 for validation error', async () => {
    const res = await request(app).get('/users/invalid');
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should not expose stack trace in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app).get('/unknown');
    expect(res.body.error.stack).toBeUndefined();
    process.env.NODE_ENV = 'development';
  });
});
```

---

## 📝 Log Analysis Commands

```bash
# Tail real-time logs
tail -f logs/combined-*.log

# Search for errors
grep "error" logs/error-*.log

# Count errors by type
grep "error" logs/combined-*.log | jq '.code' | sort | uniq -c

# Find slow requests (>1s)
grep "http" logs/combined-*.log | jq 'select(.duration > 1000)'

# Monitor specific user
grep "userId.*123" logs/combined-*.log
```

---

## ✅ Checklist

- [ ] Winston logger configured
- [ ] Daily log rotation working
- [ ] Error classes created
- [ ] Error middleware integrated
- [ ] Request logging middleware added
- [ ] Async errors handled
- [ ] 404 handler implemented
- [ ] Tests passing
- [ ] Logs directory created
- [ ] Log queries tested

---

## 🐛 Common Issues

### Issue: "Cannot find module 'winston'"
**Solution:** `npm install winston winston-daily-rotate-file`

### Issue: Logs directory doesn't exist
**Solution:** Logger auto-creates directory on first write

### Issue: Sensitive data in logs
**Solution:** Use metadata filtering, never log passwords or tokens

---

## 📋 Recipe Metadata

- **Recipe #:** 4/20
- **Category:** DevOps/Logging
- **Status:** Production-Ready
- **Difficulty:** Intermediate

---

**Next Recipe (#5): API Rate Limiting**

*Phase 3 Progress: 4/20 recipes complete (20%)*
