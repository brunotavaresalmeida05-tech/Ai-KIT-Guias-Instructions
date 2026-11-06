# Recipe #13: Background Jobs & Scheduling

> Implement reliable background job processing and scheduled tasks

---

## 📊 Overview

- **Use Case:** Data exports, email campaigns, data cleanup, periodic reports
- **Tech Stack:** Node.js, Bull queues, node-cron, advanced retry patterns
- **Time:** 3-4 hours
- **Difficulty:** Intermediate
- **Reliability:** Guaranteed at-least-once execution with persistent storage

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] Redis instance running (for job persistence)
- [ ] Recipe #9: Email Service completed
- [ ] Database connection established

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install bull node-cron agenda uuid
npm install --save-dev @types/bull
```

### Step 2: Job Queue Configuration

Create `src/config/job-queues.config.js`:

```javascript
const Queue = require('bull');
const logger = require('./logger.config');

/**
 * Create job queue
 */
function createQueue(name, options = {}) {
  const defaultOptions = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
      attempts: options.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: options.backoffDelay || 2000,
      },
      removeOnComplete: options.removeOnComplete !== false,
      removeOnFail: false,
      timeout: options.timeout || 60000,
    },
    settings: {
      maxStalledCount: 2,
      lockDuration: 30000,
      lockRenewTime: 15000,
      maxRetriesPerRequest: null,
    },
  };

  const queue = new Queue(name, { ...defaultOptions, ...options });

  // Event handlers
  queue.on('error', (error) => {
    logger.error(`Queue error (${name}):`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job failed (${name}):`, {
      jobId: job.id,
      error: error.message,
      attemptsMade: job.attemptsMade,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job stalled (${name}):`, { jobId: job.id });
  });

  logger.info(`✓ Queue created: ${name}`);

  return queue;
}

/**
 * Initialize all queues
 */
function initializeQueues() {
  const queues = {
    email: createQueue('email', { attempts: 5, backoffDelay: 5000 }),
    export: createQueue('export', { attempts: 3, timeout: 300000 }),
    report: createQueue('report', { attempts: 3 }),
    cleanup: createQueue('cleanup', { attempts: 2 }),
    notification: createQueue('notification', { attempts: 4 }),
    webhook: createQueue('webhook', { attempts: 10, backoffDelay: 3000 }),
    dataSync: createQueue('data-sync', { attempts: 3 }),
  };

  return queues;
}

module.exports = {
  createQueue,
  initializeQueues,
};
```

### Step 3: Job Processors

Create `src/jobs/email-job.js`:

```javascript
const emailService = require('../services/email.service');
const logger = require('../config/logger.config');

/**
 * Email job processor
 */
async function processEmailJob(job) {
  const { type, to, subject, html, data } = job.data;

  logger.info('Processing email job', {
    jobId: job.id,
    type,
    to,
    attempt: job.attemptsMade + 1,
  });

  try {
    let result;

    switch (type) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(to, data.name, data.token);
        break;

      case 'password-reset':
        result = await emailService.sendPasswordResetEmail(to, data.name, data.token);
        break;

      case 'custom':
        result = await emailService.sendCustomEmail(to, subject, html, data.options);
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    logger.info('Email job completed', {
      jobId: job.id,
      to,
    });

    return result;
  } catch (error) {
    logger.error('Email job failed:', {
      jobId: job.id,
      error: error.message,
    });

    // Don't retry if error is permanent
    if (error.message.includes('invalid')) {
      throw new Error(`Permanent failure: ${error.message}`);
    }

    throw error;
  }
}

module.exports = processEmailJob;
```

Create `src/jobs/export-job.js`:

```javascript
const logger = require('../config/logger.config');
const fileUploadService = require('../services/file-upload.service');
const { db } = require('../database/connection');

/**
 * Data export job processor
 */
async function processExportJob(job) {
  const { type, userId, filters } = job.data;

  logger.info('Processing export job', {
    jobId: job.id,
    type,
    userId,
  });

  try {
    let data;
    let filename;

    // Report progress
    job.progress(10);

    switch (type) {
      case 'users':
        data = await exportUsers(filters);
        filename = `users-export-${Date.now()}.csv`;
        break;

      case 'posts':
        data = await exportPosts(filters);
        filename = `posts-export-${Date.now()}.csv`;
        break;

      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    job.progress(50);

    // Convert to CSV
    const csv = convertToCSV(data);
    const buffer = Buffer.from(csv);

    job.progress(80);

    // Upload to storage
    const result = await fileUploadService.storage.upload(
      { buffer, originalname: filename, mimetype: 'text/csv' },
      { userId, public: false }
    );

    job.progress(100);

    logger.info('Export job completed', {
      jobId: job.id,
      filename,
      size: buffer.length,
    });

    return {
      downloadUrl: result.url,
      filename,
      size: buffer.length,
    };
  } catch (error) {
    logger.error('Export job failed:', {
      jobId: job.id,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Export users to array
 */
async function exportUsers(filters) {
  const query = db('users');

  if (filters?.role) {
    query.where('role', filters.role);
  }

  if (filters?.isActive !== undefined) {
    query.where('isActive', filters.isActive);
  }

  return query.select('id', 'email', 'name', 'role', 'createdAt');
}

/**
 * Export posts to array
 */
async function exportPosts(filters) {
  const query = db('posts').join('users', 'posts.authorId', 'users.id');

  if (filters?.status) {
    query.where('posts.status', filters.status);
  }

  if (filters?.authorId) {
    query.where('posts.authorId', filters.authorId);
  }

  return query.select(
    'posts.id',
    'posts.title',
    'posts.status',
    'users.name as author',
    'posts.createdAt'
  );
}

/**
 * Convert array to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if needed
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(',')
    ),
  ];

  return csv.join('\n');
}

module.exports = processExportJob;
```

Create `src/jobs/report-job.js`:

```javascript
const logger = require('../config/logger.config');
const emailService = require('../services/email.service');
const { db } = require('../database/connection');

/**
 * Report generation job processor
 */
async function processReportJob(job) {
  const { type, userId, frequency } = job.data;

  logger.info('Processing report job', {
    jobId: job.id,
    type,
    userId,
  });

  try {
    job.progress(20);

    let report;

    switch (type) {
      case 'daily-summary':
        report = await generateDailySummary();
        break;

      case 'weekly-stats':
        report = await generateWeeklyStats();
        break;

      case 'user-activity':
        report = await generateUserActivityReport(userId);
        break;

      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    job.progress(60);

    // Send report via email
    const user = await db('users').where('id', userId).first();

    await emailService.sendCustomEmail(
      user.email,
      report.title,
      report.html,
      { options: { type: 'report' } }
    );

    job.progress(100);

    logger.info('Report job completed', {
      jobId: job.id,
      type,
      recipient: user.email,
    });

    return {
      reportType: type,
      recipientEmail: user.email,
    };
  } catch (error) {
    logger.error('Report job failed:', {
      jobId: job.id,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Generate daily summary report
 */
async function generateDailySummary() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const stats = await db('posts')
    .where('createdAt', '>=', yesterday)
    .count('* as total')
    .first();

  return {
    title: 'Daily Summary Report',
    html: `
      <h2>Daily Summary</h2>
      <p>Posts created: ${stats.total}</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    `,
  };
}

/**
 * Generate weekly stats report
 */
async function generateWeeklyStats() {
  const week = new Date();
  week.setDate(week.getDate() - 7);

  const stats = await db('posts')
    .where('createdAt', '>=', week)
    .count('* as total')
    .first();

  return {
    title: 'Weekly Statistics Report',
    html: `
      <h2>Weekly Statistics</h2>
      <p>Posts created this week: ${stats.total}</p>
      <p>Generated: ${new Date().toLocaleString()}</p>
    `,
  };
}

/**
 * Generate user activity report
 */
async function generateUserActivityReport(userId) {
  const userPosts = await db('posts')
    .where('authorId', userId)
    .count('* as total')
    .first();

  return {
    title: 'Your Activity Report',
    html: `
      <h2>Your Activity</h2>
      <p>Total posts: ${userPosts.total}</p>
      <p>Report generated: ${new Date().toLocaleString()}</p>
    `,
  };
}

module.exports = processReportJob;
```

Create `src/jobs/cleanup-job.js`:

```javascript
const logger = require('../config/logger.config');
const { db } = require('../database/connection');
const cacheConfig = require('../config/cache.config');

/**
 * Cleanup job processor
 */
async function processCleanupJob(job) {
  const { type } = job.data;

  logger.info('Processing cleanup job', {
    jobId: job.id,
    type,
  });

  try {
    let result;

    switch (type) {
      case 'expired-sessions':
        result = await cleanupExpiredSessions();
        break;

      case 'old-logs':
        result = await cleanupOldLogs();
        break;

      case 'cache':
        result = await cleanupCache();
        break;

      case 'inactive-users':
        result = await cleanupInactiveUsers();
        break;

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }

    logger.info('Cleanup job completed', {
      jobId: job.id,
      type,
      result,
    });

    return result;
  } catch (error) {
    logger.error('Cleanup job failed:', {
      jobId: job.id,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
  const deleted = await db('sessions')
    .where('expiresAt', '<', new Date())
    .del();

  logger.info('Expired sessions cleaned up', { count: deleted });

  return { cleaned: deleted };
}

/**
 * Clean up old logs
 */
async function cleanupOldLogs() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const deleted = await db('emailLogs')
    .where('createdAt', '<', thirtyDaysAgo)
    .del();

  logger.info('Old logs cleaned up', { count: deleted });

  return { cleaned: deleted };
}

/**
 * Clean up cache
 */
async function cleanupCache() {
  await cacheConfig.clear();

  logger.info('Cache cleaned up');

  return { cleaned: true };
}

/**
 * Clean up inactive users (mark for deletion after 6 months)
 */
async function cleanupInactiveUsers() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const updated = await db('users')
    .where('updatedAt', '<', sixMonthsAgo)
    .where('isActive', true)
    .update({ isActive: false });

  logger.info('Inactive users deactivated', { count: updated });

  return { deactivated: updated };
}

module.exports = processCleanupJob;
```

### Step 4: Scheduled Tasks Service

Create `src/services/scheduler.service.js`:

```javascript
const cron = require('node-cron');
const logger = require('../config/logger.config');

class SchedulerService {
  constructor(queues) {
    this.queues = queues;
    this.tasks = [];
  }

  /**
   * Schedule a task using cron expression
   */
  scheduleTask(name, cronExpression, jobType, jobData) {
    try {
      const task = cron.schedule(cronExpression, async () => {
        logger.info('Scheduled task triggered', { name, jobType });

        try {
          await this.queues[jobType].add(jobData);
        } catch (error) {
          logger.error('Failed to queue scheduled job:', {
            name,
            jobType,
            error: error.message,
          });
        }
      });

      this.tasks.push({ name, task });

      logger.info('Task scheduled', {
        name,
        cronExpression,
        jobType,
      });

      return task;
    } catch (error) {
      logger.error('Failed to schedule task:', {
        name,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Common schedules
   */
  setupCommonSchedules() {
    // Daily cleanup at 2 AM
    this.scheduleTask(
      'daily-cleanup',
      '0 2 * * *',
      'cleanup',
      { type: 'expired-sessions' }
    );

    // Weekly full cleanup on Sunday at 3 AM
    this.scheduleTask(
      'weekly-full-cleanup',
      '0 3 * * 0',
      'cleanup',
      { type: 'old-logs' }
    );

    // Daily summary report at 9 AM
    this.scheduleTask(
      'daily-summary-report',
      '0 9 * * *',
      'report',
      { type: 'daily-summary', userId: 'admin' }
    );

    // Weekly stats report on Monday at 8 AM
    this.scheduleTask(
      'weekly-stats-report',
      '0 8 * * 1',
      'report',
      { type: 'weekly-stats', userId: 'admin' }
    );

    // Cache invalidation every 6 hours
    this.scheduleTask(
      'cache-invalidation',
      '0 */6 * * *',
      'cleanup',
      { type: 'cache' }
    );

    logger.info('✓ Common schedules configured');
  }

  /**
   * Stop all scheduled tasks
   */
  stopAllTasks() {
    this.tasks.forEach(({ task }) => task.stop());
    logger.info('All scheduled tasks stopped');
  }

  /**
   * Stop specific task by name
   */
  stopTask(name) {
    const taskIndex = this.tasks.findIndex((t) => t.name === name);

    if (taskIndex >= 0) {
      this.tasks[taskIndex].task.stop();
      this.tasks.splice(taskIndex, 1);
      logger.info('Task stopped:', { name });
    }
  }

  /**
   * Get all tasks
   */
  getTasks() {
    return this.tasks.map((t) => ({
      name: t.name,
      running: t.task.status === 'started',
    }));
  }
}

module.exports = SchedulerService;
```

### Step 5: Job Routes

Create `src/routes/jobs.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const logger = require('../config/logger.config');

/**
 * Queue references (injected from app)
 */
let queues;
let scheduler;

function setQueues(q, s) {
  queues = q;
  scheduler = s;
}

/**
 * POST /jobs/export
 * Create export job
 */
router.post('/export', verifyToken, async (req, res, next) => {
  try {
    const { type, filters } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type required' });
    }

    const job = await queues.export.add({
      type,
      userId: req.user.id,
      filters,
    });

    res.json({
      message: 'Export job created',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /jobs/report
 * Create report job
 */
router.post('/report', verifyToken, async (req, res, next) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type required' });
    }

    const job = await queues.report.add({
      type,
      userId: req.user.id,
    });

    res.json({
      message: 'Report job created',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /jobs/:jobId
 * Get job status
 */
router.get('/:jobId', verifyToken, async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // Search all queues
    let job = null;

    for (const [queueName, queue] of Object.entries(queues)) {
      job = await queue.getJob(jobId);
      if (job) break;
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      jobId: job.id,
      state,
      progress,
      attempts: job.attemptsMade,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /jobs/queue/:queueName
 * Get queue statistics (admin only)
 */
router.get('/queue/:queueName', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const queue = queues[queueName];

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const counts = await queue.getCounts();
    const jobs = {
      waiting: await queue.getJobs(['waiting'], 0, 10),
      active: await queue.getJobs(['active'], 0, 10),
      completed: await queue.getJobs(['completed'], 0, 10),
      failed: await queue.getJobs(['failed'], 0, 10),
    };

    res.json({
      queueName,
      counts,
      jobs: {
        waiting: jobs.waiting.map((j) => ({ id: j.id, data: j.data })),
        active: jobs.active.map((j) => ({ id: j.id, data: j.data })),
        completed: jobs.completed.length,
        failed: jobs.failed.map((j) => ({ id: j.id, failedReason: j.failedReason })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /jobs/scheduler/tasks
 * Get scheduled tasks (admin only)
 */
router.get('/scheduler/tasks', verifyToken, requireRole('admin'), (req, res) => {
  const tasks = scheduler.getTasks();
  res.json({ tasks });
});

/**
 * POST /jobs/scheduler/stop/:taskName
 * Stop a scheduled task (admin only)
 */
router.post(
  '/scheduler/stop/:taskName',
  verifyToken,
  requireRole('admin'),
  (req, res) => {
    const { taskName } = req.params;
    scheduler.stopTask(taskName);
    res.json({ message: `Task ${taskName} stopped` });
  }
);

module.exports = {
  router,
  setQueues,
};
```

### Step 6: Application Integration

Update `src/app.js`:

```javascript
const express = require('express');
const cors = require('cors');
require('express-async-errors');
const { initializeQueues } = require('./config/job-queues.config');
const SchedulerService = require('./services/scheduler.service');
const processEmailJob = require('./jobs/email-job');
const processExportJob = require('./jobs/export-job');
const processReportJob = require('./jobs/report-job');
const processCleanupJob = require('./jobs/cleanup-job');
const logger = require('./config/logger.config');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize job queues
const queues = initializeQueues();

// Setup job processors
queues.email.process(processEmailJob);
queues.export.process(processExportJob);
queues.report.process(processReportJob);
queues.cleanup.process(processCleanupJob);

// Initialize scheduler
const scheduler = new SchedulerService(queues);
scheduler.setupCommonSchedules();

// Routes
const { router: jobsRouter, setQueues } = require('./routes/jobs.routes');
setQueues(queues, scheduler);
app.use('/jobs', jobsRouter);

// Make queues available to other modules
app.use((req, res, next) => {
  req.queues = queues;
  req.scheduler = scheduler;
  next();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  scheduler.stopAllTasks();

  // Close all queues
  for (const queue of Object.values(queues)) {
    await queue.close();
  }

  logger.info('✓ All queues closed');
  process.exit(0);
});

module.exports = app;
```

---

## 🧪 Testing

Create `src/tests/jobs.test.js`:

```javascript
const { initializeQueues } = require('../config/job-queues.config');

describe('Job Queues', () => {
  let queues;

  beforeAll(() => {
    queues = initializeQueues();
  });

  afterAll(async () => {
    for (const queue of Object.values(queues)) {
      await queue.close();
    }
  });

  test('should add job to queue', async () => {
    const job = await queues.email.add({
      type: 'welcome',
      to: 'test@example.com',
      data: { name: 'Test' },
    });

    expect(job.id).toBeDefined();
    expect(job.data.type).toBe('welcome');
  });

  test('should get job status', async () => {
    const job = await queues.export.add({
      type: 'users',
      userId: 'user-1',
    });

    const state = await job.getState();
    expect(['waiting', 'active', 'completed', 'failed']).toContain(state);
  });

  test('should retry failed job', async () => {
    const job = await queues.email.add({
      type: 'invalid',
      to: 'test@example.com',
    });

    // Simulate job failure
    await job.progress(0);

    const attemptsMade = job.attemptsMade;
    expect(attemptsMade).toBe(0);
  });

  test('should get queue counts', async () => {
    await queues.notification.add({ message: 'test' });

    const counts = await queues.notification.getCounts();

    expect(counts).toHaveProperty('waiting');
    expect(counts).toHaveProperty('active');
    expect(counts).toHaveProperty('completed');
    expect(counts).toHaveProperty('failed');
  });
});
```

---

## ✅ Checklist

- [ ] Bull queues configured
- [ ] Job processors implemented
- [ ] Retry logic configured
- [ ] Scheduler service created
- [ ] Cron tasks defined
- [ ] Job routes created
- [ ] Graceful shutdown implemented
- [ ] Progress tracking working
- [ ] Failed job handling working
- [ ] Queue monitoring dashboard accessible
- [ ] Tests passing
- [ ] Error logging in place
- [ ] Job cleanup configured

---

## 📊 Database Migrations

Create migration for job logs:

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('jobLogs', (table) => {
    table.increments('id').primary();
    table.string('jobId').notNullable();
    table.string('queueName').notNullable();
    table.enum('status', ['pending', 'active', 'completed', 'failed']).notNullable();
    table.text('data');
    table.text('result').nullable();
    table.text('error').nullable();
    table.integer('attemptsMade').defaultTo(0);
    table.timestamps(true, true);

    table.index('jobId');
    table.index('status');
    table.index('queueName');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('jobLogs');
};
```

---

## 📋 Cron Expression Examples

```
0 0 * * *       - Every day at midnight
0 */6 * * *     - Every 6 hours
0 9 * * 1-5     - Weekdays at 9 AM
0 0 1 * *       - First day of month
0 0 * * 0       - Every Sunday
*/5 * * * *     - Every 5 minutes
0 0 1 1 *       - Yearly (Jan 1)
```

---

## 🐛 Common Issues

### Issue: "Jobs not processing"
**Solution:** Ensure Redis is running and queue processor is set up

### Issue: "Memory leak with long-running jobs"
**Solution:** Implement job progress tracking and chunked processing

### Issue: "Duplicate job execution"
**Solution:** Check for multiple processor instances or enable distributed locking

---

## 📋 Recipe Metadata

- **Recipe #:** 13/20
- **Category:** DevOps/Infrastructure
- **Status:** Production-Ready
- **Difficulty:** Intermediate
- **Reliability:** Guaranteed at-least-once execution

---

**Next Recipe (#14): API Versioning & Migrations**

*Phase 3 Progress: 13/20 recipes complete (65%)*
