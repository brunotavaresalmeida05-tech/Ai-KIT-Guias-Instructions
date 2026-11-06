# Recipe #9: Email Service Integration

> Implement transactional email with multiple providers and templating

---

## 📊 Overview

- **Use Case:** Welcome emails, password reset, notifications, transactional messages
- **Tech Stack:** Node.js, Nodemailer, SendGrid/Mailgun, Bull queues
- **Time:** 3-4 hours
- **Difficulty:** Intermediate
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] SendGrid/Mailgun account (or SMTP server)
- [ ] Redis running (for job queue)
- [ ] Recipe #4: Error Handling & Logging completed

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install nodemailer bull @sendgrid/mail mailgun.js ejs
npm install --save-dev @types/nodemailer
```

### Step 2: Email Provider Configuration

Create `src/config/email.config.js`:

```javascript
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const mailgun = require('mailgun.js');
const FormData = require('form-data');
const logger = require('./logger.config');

/**
 * Email provider interface
 */
class EmailProvider {
  async send(to, subject, html, options = {}) {
    throw new Error('send() must be implemented');
  }
}

/**
 * SMTP Provider (Gmail, custom SMTP)
 */
class SmtpProvider extends EmailProvider {
  constructor(config = {}) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host || process.env.SMTP_HOST,
      port: config.port || process.env.SMTP_PORT,
      secure: config.secure !== false,
      auth: {
        user: config.user || process.env.SMTP_USER,
        pass: config.pass || process.env.SMTP_PASS,
      },
    });
  }

  async send(to, subject, html, options = {}) {
    try {
      const result = await this.transporter.sendMail({
        from: options.from || process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      });

      logger.info('Email sent via SMTP', {
        to,
        subject,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('SMTP send failed:', error);
      throw error;
    }
  }

  async verify() {
    try {
      await this.transporter.verify();
      logger.info('✓ SMTP connection verified');
      return true;
    } catch (error) {
      logger.error('SMTP verification failed:', error);
      return false;
    }
  }
}

/**
 * SendGrid Provider
 */
class SendGridProvider extends EmailProvider {
  constructor(apiKey = process.env.SENDGRID_API_KEY) {
    super();
    sgMail.setApiKey(apiKey);
  }

  async send(to, subject, html, options = {}) {
    try {
      const result = await sgMail.send({
        to,
        from: options.from || process.env.EMAIL_FROM,
        subject,
        html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        trackingSettings: {
          clickTracking: {
            enable: true,
          },
          openTracking: {
            enable: true,
          },
        },
      });

      logger.info('Email sent via SendGrid', {
        to,
        subject,
        messageId: result[0].headers['x-message-id'],
      });

      return result;
    } catch (error) {
      logger.error('SendGrid send failed:', error);
      throw error;
    }
  }
}

/**
 * Mailgun Provider
 */
class MailgunProvider extends EmailProvider {
  constructor(domain = process.env.MAILGUN_DOMAIN) {
    super();
    const client = new mailgun(FormData);
    this.mg = client.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
    });
    this.domain = domain;
  }

  async send(to, subject, html, options = {}) {
    try {
      const result = await this.mg.messages.create(this.domain, {
        from: options.from || process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text: options.text,
        'h:Reply-To': options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachment: options.attachments,
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true,
      });

      logger.info('Email sent via Mailgun', {
        to,
        subject,
        messageId: result.id,
      });

      return result;
    } catch (error) {
      logger.error('Mailgun send failed:', error);
      throw error;
    }
  }
}

/**
 * Get email provider based on configuration
 */
function getEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER || 'smtp';

  switch (provider) {
    case 'sendgrid':
      return new SendGridProvider();
    case 'mailgun':
      return new MailgunProvider();
    case 'smtp':
    default:
      return new SmtpProvider();
  }
}

module.exports = {
  EmailProvider,
  SmtpProvider,
  SendGridProvider,
  MailgunProvider,
  getEmailProvider,
};
```

### Step 3: Email Templates

Create `src/email/templates/welcome.ejs`:

```ejs
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .header {
      background: #007bff;
      color: white;
      padding: 20px;
      border-radius: 5px 5px 0 0;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 10px;
    }
    .footer {
      border-top: 1px solid #ddd;
      padding-top: 20px;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome!</h1>
    </div>
    <div class="content">
      <h2>Hello <%= name %>,</h2>
      <p>Thank you for joining our platform. We're excited to have you on board!</p>
      <p>To get started, please verify your email address by clicking the button below:</p>
      <a href="<%= verificationUrl %>" class="button">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create this account, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Your Company. All rights reserved.</p>
      <p><a href="<%= unsubscribeUrl %>">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
```

Create `src/email/templates/password-reset.ejs`:

```ejs
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
    .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello <%= name %>,</p>
      <p>We received a password reset request for your account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="<%= resetUrl %>" class="button">Reset Password</a>
      <p><strong>This link will expire in 1 hour.</strong></p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
```

Create `src/email/templates/notification.ejs`:

```ejs
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; }
    .header { background: #28a745; color: white; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><%= title %></h1>
    </div>
    <div class="content">
      <p>Hello <%= name %>,</p>
      <%- message %>
      <% if (actionUrl) { %>
        <a href="<%= actionUrl %>" class="button">View More</a>
      <% } %>
    </div>
  </div>
</body>
</html>
```

### Step 4: Email Service

Create `src/services/email.service.js`:

```javascript
const ejs = require('ejs');
const path = require('path');
const { getEmailProvider } = require('../config/email.config');
const logger = require('../config/logger.config');

class EmailService {
  constructor() {
    this.provider = getEmailProvider();
  }

  /**
   * Render email template
   */
  async renderTemplate(templateName, data) {
    const templatePath = path.join(
      __dirname,
      `../email/templates/${templateName}.ejs`
    );

    try {
      const html = await ejs.renderFile(templatePath, data);
      return html;
    } catch (error) {
      logger.error('Template rendering failed:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to, name, verificationToken) {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;

    const html = await this.renderTemplate('welcome', {
      name,
      verificationUrl,
      unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?email=${encodeURIComponent(to)}`,
    });

    return this.provider.send(to, 'Welcome to Our Platform', html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, name, resetToken) {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    const html = await this.renderTemplate('password-reset', {
      name,
      resetUrl,
    });

    return this.provider.send(to, 'Password Reset Request', html);
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(to, name, code) {
    const html = await this.renderTemplate('notification', {
      name,
      title: 'Verification Code',
      message: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });

    return this.provider.send(to, 'Your Verification Code', html);
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(to, subject, html, options = {}) {
    return this.provider.send(to, subject, html, options);
  }

  /**
   * Send batch emails
   */
  async sendBatch(recipients, subject, html, options = {}) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.provider.send(
          recipient.email,
          subject,
          html,
          options
        );
        results.push({ email: recipient.email, success: true, result });
      } catch (error) {
        logger.error('Batch email send failed:', { email: recipient.email, error });
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new EmailService();
```

### Step 5: Email Queue with Bull

Create `src/config/email-queue.config.js`:

```javascript
const Queue = require('bull');
const redis = require('ioredis');
const emailService = require('../services/email.service');
const logger = require('./logger.config');

/**
 * Create email queue
 */
const emailQueue = new Queue('email', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

/**
 * Process email jobs
 */
emailQueue.process(async (job) => {
  const { type, to, subject, html, data } = job.data;

  logger.info('Processing email job', {
    jobId: job.id,
    type,
    to,
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
      case 'verification-code':
        result = await emailService.sendVerificationCode(to, data.name, data.code);
        break;
      case 'custom':
        result = await emailService.sendCustomEmail(to, subject, html, data.options);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    logger.info('Email sent successfully', {
      jobId: job.id,
      to,
    });

    return result;
  } catch (error) {
    logger.error('Email job failed:', {
      jobId: job.id,
      error: error.message,
      attempt: job.attemptsMade,
    });

    throw error;
  }
});

/**
 * Queue event handlers
 */
emailQueue.on('completed', (job) => {
  logger.debug('Email job completed', { jobId: job.id });
});

emailQueue.on('failed', (job, err) => {
  logger.error('Email job failed permanently', {
    jobId: job.id,
    error: err.message,
  });
});

emailQueue.on('error', (error) => {
  logger.error('Email queue error:', error);
});

/**
 * Add job to queue
 */
async function addEmailJob(type, to, options = {}) {
  const job = await emailQueue.add(
    {
      type,
      to,
      subject: options.subject,
      html: options.html,
      data: options.data,
    },
    {
      delay: options.delay,
      priority: options.priority,
    }
  );

  logger.info('Email job queued', {
    jobId: job.id,
    type,
    to,
  });

  return job;
}

/**
 * Get queue stats
 */
async function getQueueStats() {
  const counts = await emailQueue.getCounts();
  const jobs = await emailQueue.getJobs();

  return {
    counts,
    totalJobs: jobs.length,
  };
}

module.exports = {
  emailQueue,
  addEmailJob,
  getQueueStats,
};
```

### Step 6: Email Routes

Create `src/routes/email.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const emailService = require('../services/email.service');
const { addEmailJob, getQueueStats } = require('../config/email-queue.config');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

/**
 * POST /email/send-welcome
 * Queue welcome email
 */
router.post('/send-welcome', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const { to, name, token } = req.body;

    const job = await addEmailJob('welcome', to, {
      data: { name, token },
    });

    res.json({
      message: 'Welcome email queued',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /email/send-password-reset
 * Queue password reset email
 */
router.post('/send-password-reset', async (req, res, next) => {
  try {
    const { to, name, token } = req.body;

    const job = await addEmailJob('password-reset', to, {
      data: { name, token },
    });

    res.json({
      message: 'Password reset email queued',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /email/send-verification-code
 * Queue verification code email
 */
router.post('/email/send-verification-code', async (req, res, next) => {
  try {
    const { to, name, code } = req.body;

    const job = await addEmailJob('verification-code', to, {
      data: { name, code },
    });

    res.json({
      message: 'Verification code sent',
      jobId: job.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /email/stats
 * Get email queue statistics
 */
router.get('/stats', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 7: Environment Variables

Add to `.env`:

```env
# Email Provider
EMAIL_PROVIDER=smtp # smtp, sendgrid, mailgun
EMAIL_FROM=noreply@example.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mail.example.com

# App URLs
APP_URL=http://localhost:3000
```

---

## 🧪 Testing

Create `src/tests/email.test.js`:

```javascript
const emailService = require('../services/email.service');
const { addEmailJob, getQueueStats } = require('../config/email-queue.config');

describe('Email Service', () => {
  test('should render welcome template', async () => {
    const html = await emailService.renderTemplate('welcome', {
      name: 'Test User',
      verificationUrl: 'http://localhost:3000/verify',
      unsubscribeUrl: 'http://localhost:3000/unsubscribe',
    });

    expect(html).toContain('Test User');
    expect(html).toContain('verify');
  });

  test('should add email to queue', async () => {
    const job = await addEmailJob('welcome', 'test@example.com', {
      data: {
        name: 'Test User',
        token: 'token123',
      },
    });

    expect(job.id).toBeDefined();
  });

  test('should get queue stats', async () => {
    const stats = await getQueueStats();
    expect(stats.counts).toBeDefined();
  });

  test('should send email via service', async () => {
    // Mock provider for testing
    const result = await emailService.sendWelcomeEmail(
      'test@example.com',
      'Test User',
      'token123'
    );

    expect(result).toBeDefined();
  });

  test('should handle batch emails', async () => {
    const recipients = [
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
    ];

    const results = await emailService.sendBatch(
      recipients,
      'Test Subject',
      '<p>Test message</p>'
    );

    expect(results.length).toBe(2);
  });
});
```

---

## ✅ Checklist

- [ ] Email provider configured (SMTP/SendGrid/Mailgun)
- [ ] Email templates created
- [ ] Email service implemented
- [ ] Queue system set up with Bull
- [ ] Retry logic configured
- [ ] Queue monitoring set up
- [ ] Email routes created
- [ ] Environment variables configured
- [ ] Tests passing
- [ ] Welcome email tested
- [ ] Password reset email tested
- [ ] Batch sending tested

---

## 📊 Database Migration

Create migration for email logs:

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('emailLogs', (table) => {
    table.increments('id').primary();
    table.string('to').notNullable();
    table.string('subject').notNullable();
    table.enum('type', ['welcome', 'password-reset', 'notification', 'custom']);
    table.enum('status', ['pending', 'sent', 'failed']).defaultTo('pending');
    table.text('error').nullable();
    table.string('messageId').nullable();
    table.timestamps(true, true);

    table.index('to');
    table.index('status');
    table.index('createdAt');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('emailLogs');
};
```

---

## 🐛 Common Issues

### Issue: "nodemailer connection timeout"
**Solution:** Check SMTP credentials and firewall settings

### Issue: "Queue not processing"
**Solution:** Ensure Redis is running: `redis-server`

### Issue: "Email not received"
**Solution:** Check spam folder, verify SPF/DKIM records

---

## 📋 Recipe Metadata

- **Recipe #:** 9/20
- **Category:** Communication
- **Status:** Production-Ready
- **Difficulty:** Intermediate
- **OWASP:** Compliant ✅

---

**Next Recipe (#10): SMS Service Integration**

*Phase 3 Progress: 9/20 recipes complete (45%)*
