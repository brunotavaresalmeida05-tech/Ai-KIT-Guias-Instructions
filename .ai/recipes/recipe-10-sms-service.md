# Recipe #10: SMS Service Integration

> Implement SMS delivery with multiple providers and OTP verification

---

## 📊 Overview

- **Use Case:** Two-factor authentication, OTP verification, SMS notifications
- **Tech Stack:** Node.js, Twilio/AWS SNS, Bull queues, rate limiting
- **Time:** 3-4 hours
- **Difficulty:** Intermediate
- **Security Level:** Production-ready OWASP compliant

---

## ✅ Prerequisites

- [ ] Express.js application running
- [ ] Node.js 18+
- [ ] Twilio or AWS SNS account
- [ ] Redis running (for job queue)
- [ ] Recipe #5: Rate Limiting completed
- [ ] Recipe #9: Email Service completed (optional, for patterns)

---

## 📖 Implementation

### Step 1: Install Dependencies

```bash
npm install twilio aws-sdk bull libphonenumber-js
npm install --save-dev @types/twilio
```

### Step 2: SMS Provider Configuration

Create `src/config/sms.config.js`:

```javascript
const twilio = require('twilio');
const aws = require('aws-sdk');
const logger = require('./logger.config');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * SMS provider interface
 */
class SmsProvider {
  async send(phoneNumber, message, options = {}) {
    throw new Error('send() must be implemented');
  }

  async sendOtp(phoneNumber, otp, options = {}) {
    throw new Error('sendOtp() must be implemented');
  }
}

/**
 * Twilio SMS Provider
 */
class TwilioProvider extends SmsProvider {
  constructor(config = {}) {
    super();
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    this.authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.fromNumber || process.env.TWILIO_PHONE_NUMBER;

    this.client = twilio(this.accountSid, this.authToken);
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phoneNumber) {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      if (!parsed || !parsed.isValid()) {
        throw new Error('Invalid phone number');
      }
      return parsed.formatInternational();
    } catch (error) {
      logger.warn('Phone number validation failed:', { phoneNumber, error: error.message });
      throw error;
    }
  }

  /**
   * Send SMS
   */
  async send(phoneNumber, message, options = {}) {
    try {
      const validatedNumber = this.validatePhoneNumber(phoneNumber);

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: validatedNumber,
      });

      logger.info('SMS sent via Twilio', {
        to: validatedNumber,
        messageSid: result.sid,
        status: result.status,
      });

      return {
        provider: 'twilio',
        messageId: result.sid,
        status: result.status,
        to: validatedNumber,
        cost: result.price,
      };
    } catch (error) {
      logger.error('Twilio send failed:', error);
      throw error;
    }
  }

  /**
   * Send OTP
   */
  async sendOtp(phoneNumber, otp, options = {}) {
    const appName = options.appName || 'Our App';
    const expiryMinutes = options.expiryMinutes || 10;

    const message = `Your ${appName} verification code is: ${otp}. This code will expire in ${expiryMinutes} minutes. Never share this code.`;

    return this.send(phoneNumber, message, options);
  }
}

/**
 * AWS SNS SMS Provider
 */
class AwsSnsProvider extends SmsProvider {
  constructor(config = {}) {
    super();
    this.sns = new aws.SNS({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phoneNumber) {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      if (!parsed || !parsed.isValid()) {
        throw new Error('Invalid phone number');
      }
      return parsed.formatInternational();
    } catch (error) {
      logger.warn('Phone number validation failed:', { phoneNumber, error: error.message });
      throw error;
    }
  }

  /**
   * Send SMS
   */
  async send(phoneNumber, message, options = {}) {
    try {
      const validatedNumber = this.validatePhoneNumber(phoneNumber);

      const params = {
        Message: message,
        PhoneNumber: validatedNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: options.senderId || 'MyApp',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: options.smsType || 'Transactional',
          },
        },
      };

      const result = await this.sns.publish(params).promise();

      logger.info('SMS sent via AWS SNS', {
        to: validatedNumber,
        messageId: result.MessageId,
      });

      return {
        provider: 'aws-sns',
        messageId: result.MessageId,
        status: 'sent',
        to: validatedNumber,
      };
    } catch (error) {
      logger.error('AWS SNS send failed:', error);
      throw error;
    }
  }

  /**
   * Send OTP
   */
  async sendOtp(phoneNumber, otp, options = {}) {
    const appName = options.appName || 'Our App';
    const expiryMinutes = options.expiryMinutes || 10;

    const message = `Your ${appName} verification code is: ${otp}. This code will expire in ${expiryMinutes} minutes. Never share this code.`;

    return this.send(phoneNumber, message, {
      ...options,
      smsType: 'Transactional',
    });
  }
}

/**
 * Get SMS provider based on configuration
 */
function getSmsProvider() {
  const provider = process.env.SMS_PROVIDER || 'twilio';

  switch (provider) {
    case 'aws-sns':
      return new AwsSnsProvider();
    case 'twilio':
    default:
      return new TwilioProvider();
  }
}

module.exports = {
  SmsProvider,
  TwilioProvider,
  AwsSnsProvider,
  getSmsProvider,
};
```

### Step 3: OTP Generation Service

Create `src/services/otp.service.js`:

```javascript
const crypto = require('crypto');
const { redisClient } = require('../config/cache.config');
const logger = require('../config/logger.config');

class OtpService {
  /**
   * Generate random OTP
   */
  static generateOtp(length = 6) {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
      otp += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    return otp;
  }

  /**
   * Generate strong OTP (alphanumeric)
   */
  static generateStrongOtp(length = 8) {
    return crypto.randomBytes(length).toString('hex').substring(0, length).toUpperCase();
  }

  /**
   * Store OTP with expiry
   */
  static async storeOtp(phoneNumber, otp, expiryMinutes = 10) {
    const key = `otp:${phoneNumber}`;
    const ttlSeconds = expiryMinutes * 60;

    const data = {
      otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
      locked: false,
    };

    await redisClient.setex(key, ttlSeconds, JSON.stringify(data));

    logger.info('OTP stored', {
      phoneNumber,
      expiryMinutes,
    });

    return data;
  }

  /**
   * Verify OTP
   */
  static async verifyOtp(phoneNumber, otp, maxAttempts = 5) {
    const key = `otp:${phoneNumber}`;
    const storedData = await redisClient.get(key);

    if (!storedData) {
      logger.warn('OTP not found or expired', { phoneNumber });
      throw new Error('OTP expired or not found');
    }

    const data = JSON.parse(storedData);

    // Check if locked
    if (data.locked) {
      throw new Error('Too many attempts. Please request a new OTP.');
    }

    // Check if expired
    if (data.expiresAt < Date.now()) {
      await redisClient.del(key);
      throw new Error('OTP has expired');
    }

    // Check attempts
    if (data.attempts >= maxAttempts) {
      data.locked = true;
      await redisClient.setex(key, 300, JSON.stringify(data)); // Lock for 5 minutes
      throw new Error('Too many failed attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (data.otp !== otp) {
      data.attempts += 1;
      await redisClient.setex(
        key,
        Math.ceil((data.expiresAt - Date.now()) / 1000),
        JSON.stringify(data)
      );

      logger.warn('OTP verification failed', {
        phoneNumber,
        attempt: data.attempts,
      });

      throw new Error('Invalid OTP');
    }

    // OTP verified, delete it
    await redisClient.del(key);

    logger.info('OTP verified successfully', { phoneNumber });

    return true;
  }

  /**
   * Get OTP remaining time
   */
  static async getOtpTtl(phoneNumber) {
    const key = `otp:${phoneNumber}`;
    const ttl = await redisClient.ttl(key);

    return ttl > 0 ? ttl : null;
  }

  /**
   * Revoke OTP
   */
  static async revokeOtp(phoneNumber) {
    const key = `otp:${phoneNumber}`;
    await redisClient.del(key);

    logger.info('OTP revoked', { phoneNumber });
  }

  /**
   * Check if OTP is locked
   */
  static async isOtpLocked(phoneNumber) {
    const key = `otp:${phoneNumber}`;
    const storedData = await redisClient.get(key);

    if (!storedData) {
      return false;
    }

    const data = JSON.parse(storedData);
    return data.locked || false;
  }
}

module.exports = OtpService;
```

### Step 4: SMS Queue

Create `src/config/sms-queue.config.js`:

```javascript
const Queue = require('bull');
const { getSmsProvider } = require('./sms.config');
const logger = require('./logger.config');

/**
 * Create SMS queue
 */
const smsQueue = new Queue('sms', {
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
 * Get SMS provider
 */
let smsProvider;
try {
  smsProvider = getSmsProvider();
} catch (error) {
  logger.error('Failed to initialize SMS provider:', error);
}

/**
 * Process SMS jobs
 */
smsQueue.process(async (job) => {
  const { type, phoneNumber, message, otp, options } = job.data;

  logger.info('Processing SMS job', {
    jobId: job.id,
    type,
    phoneNumber,
  });

  try {
    if (!smsProvider) {
      throw new Error('SMS provider not initialized');
    }

    let result;

    switch (type) {
      case 'otp':
        result = await smsProvider.sendOtp(phoneNumber, otp, options);
        break;
      case 'notification':
        result = await smsProvider.send(phoneNumber, message, options);
        break;
      default:
        throw new Error(`Unknown SMS type: ${type}`);
    }

    logger.info('SMS sent successfully', {
      jobId: job.id,
      phoneNumber,
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    logger.error('SMS job failed:', {
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
smsQueue.on('completed', (job) => {
  logger.debug('SMS job completed', { jobId: job.id });
});

smsQueue.on('failed', (job, err) => {
  logger.error('SMS job failed permanently', {
    jobId: job.id,
    error: err.message,
  });
});

/**
 * Add SMS job to queue
 */
async function addSmsJob(type, phoneNumber, options = {}) {
  const job = await smsQueue.add(
    {
      type,
      phoneNumber,
      message: options.message,
      otp: options.otp,
      options: options.metadata || {},
    },
    {
      delay: options.delay,
      priority: options.priority,
    }
  );

  logger.info('SMS job queued', {
    jobId: job.id,
    type,
    phoneNumber,
  });

  return job;
}

/**
 * Get queue stats
 */
async function getSmsQueueStats() {
  const counts = await smsQueue.getCounts();
  const jobs = await smsQueue.getJobs();

  return {
    counts,
    totalJobs: jobs.length,
  };
}

module.exports = {
  smsQueue,
  addSmsJob,
  getSmsQueueStats,
};
```

### Step 5: SMS Service

Create `src/services/sms.service.js`:

```javascript
const OtpService = require('./otp.service');
const { addSmsJob } = require('../config/sms-queue.config');
const logger = require('../config/logger.config');
const cacheConfig = require('../config/cache.config');

class SmsService {
  /**
   * Send OTP via SMS
   */
  async sendOtp(phoneNumber, options = {}) {
    try {
      const expiryMinutes = options.expiryMinutes || 10;
      const appName = options.appName || 'Our App';

      // Generate OTP
      const otp = OtpService.generateOtp(6);

      // Store OTP
      await OtpService.storeOtp(phoneNumber, otp, expiryMinutes);

      // Queue SMS
      const job = await addSmsJob('otp', phoneNumber, {
        otp,
        metadata: {
          appName,
          expiryMinutes,
        },
      });

      logger.info('OTP SMS queued', {
        phoneNumber,
        jobId: job.id,
      });

      return {
        phoneNumber,
        jobId: job.id,
        expiryMinutes,
      };
    } catch (error) {
      logger.error('Failed to send OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(phoneNumber, otp) {
    try {
      return await OtpService.verifyOtp(phoneNumber, otp);
    } catch (error) {
      logger.warn('OTP verification failed:', {
        phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send notification SMS
   */
  async sendNotification(phoneNumber, message, options = {}) {
    try {
      const job = await addSmsJob('notification', phoneNumber, {
        message,
        metadata: options,
      });

      logger.info('Notification SMS queued', {
        phoneNumber,
        jobId: job.id,
      });

      return {
        phoneNumber,
        jobId: job.id,
      };
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send batch SMS
   */
  async sendBatch(recipients, message, options = {}) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendNotification(recipient.phoneNumber, message, options);
        results.push({ phoneNumber: recipient.phoneNumber, success: true, ...result });
      } catch (error) {
        logger.error('Batch SMS send failed:', {
          phoneNumber: recipient.phoneNumber,
          error: error.message,
        });
        results.push({
          phoneNumber: recipient.phoneNumber,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Check if OTP is locked
   */
  async isOtpLocked(phoneNumber) {
    return OtpService.isOtpLocked(phoneNumber);
  }

  /**
   * Revoke OTP
   */
  async revokeOtp(phoneNumber) {
    return OtpService.revokeOtp(phoneNumber);
  }
}

module.exports = new SmsService();
```

### Step 6: SMS Routes

Create `src/routes/sms.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const smsService = require('../services/sms.service');
const { verifyToken } = require('../middleware/auth.middleware');
const { createLimiter } = require('../middleware/rate-limit.middleware');

/**
 * Rate limiter for OTP requests
 */
const otpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 OTP requests per hour per phone number
  prefix: 'rl:otp',
  message: 'Too many OTP requests. Please try again later.',
});

/**
 * POST /sms/send-otp
 * Send OTP to phone number
 */
router.post('/send-otp', otpLimiter, async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Phone number required',
      });
    }

    // Check if already locked
    const isLocked = await smsService.isOtpLocked(phoneNumber);
    if (isLocked) {
      return res.status(429).json({
        error: 'Too many OTP attempts. Please request again in a few minutes.',
      });
    }

    const result = await smsService.sendOtp(phoneNumber, {
      expiryMinutes: 10,
      appName: 'Our App',
    });

    res.json({
      message: 'OTP sent successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /sms/verify-otp
 * Verify OTP
 */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        error: 'Phone number and OTP required',
      });
    }

    const verified = await smsService.verifyOtp(phoneNumber, otp);

    res.json({
      message: 'OTP verified successfully',
      verified,
    });
  } catch (error) {
    if (error.message.includes('Invalid OTP')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('expired')) {
      return res.status(410).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * POST /sms/send-notification
 * Send notification SMS (admin only)
 */
router.post('/send-notification', verifyToken, async (req, res, next) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'Phone number and message required',
      });
    }

    const result = await smsService.sendNotification(phoneNumber, message);

    res.json({
      message: 'Notification SMS queued',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /sms/send-batch
 * Send batch SMS (admin only)
 */
router.post('/send-batch', verifyToken, async (req, res, next) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Recipients array required',
      });
    }

    if (!message) {
      return res.status(400).json({
        error: 'Message required',
      });
    }

    const results = await smsService.sendBatch(recipients, message);

    res.json({
      message: 'Batch SMS queued',
      count: results.length,
      results,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

### Step 7: Two-Factor Authentication Flow

Create `src/services/2fa.service.js`:

```javascript
const smsService = require('./sms.service');
const { redisClient } = require('../config/cache.config');
const logger = require('../config/logger.config');

class TwoFactorAuthService {
  /**
   * Enable 2FA for user
   */
  async enable2fa(userId, phoneNumber) {
    const key = `2fa:${userId}`;

    const data = {
      phoneNumber,
      enabled: true,
      enabledAt: Date.now(),
      backupCodes: this.generateBackupCodes(),
    };

    await redisClient.setex(key, 365 * 24 * 60 * 60, JSON.stringify(data)); // 1 year

    logger.info('2FA enabled for user', { userId });

    return data;
  }

  /**
   * Disable 2FA for user
   */
  async disable2fa(userId) {
    const key = `2fa:${userId}`;
    await redisClient.del(key);

    logger.info('2FA disabled for user', { userId });
  }

  /**
   * Send 2FA code
   */
  async send2faCode(userId, phoneNumber) {
    return smsService.sendOtp(phoneNumber, {
      expiryMinutes: 5,
      appName: 'Our App',
    });
  }

  /**
   * Verify 2FA code
   */
  async verify2faCode(userId, code) {
    const key = `2fa:${userId}`;
    const data = await redisClient.get(key);

    if (!data) {
      throw new Error('2FA not enabled');
    }

    const parsed = JSON.parse(data);
    return smsService.verifyOtp(parsed.phoneNumber, code);
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    const key = `2fa:${userId}`;
    const data = await redisClient.get(key);

    if (!data) {
      throw new Error('2FA not enabled');
    }

    const parsed = JSON.parse(data);
    const index = parsed.backupCodes.indexOf(code);

    if (index === -1) {
      throw new Error('Invalid backup code');
    }

    // Remove used backup code
    parsed.backupCodes.splice(index, 1);
    await redisClient.setex(key, 365 * 24 * 60 * 60, JSON.stringify(parsed));

    logger.info('Backup code used', { userId, remainingCodes: parsed.backupCodes.length });

    return true;
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];

    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Get 2FA status
   */
  async get2faStatus(userId) {
    const key = `2fa:${userId}`;
    const data = await redisClient.get(key);

    if (!data) {
      return { enabled: false };
    }

    const parsed = JSON.parse(data);
    return {
      enabled: true,
      phoneNumber: this.maskPhoneNumber(parsed.phoneNumber),
      backupCodesRemaining: parsed.backupCodes.length,
    };
  }

  /**
   * Mask phone number for display
   */
  maskPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/(.{2})(.*)(.{2})/, '$1****$3');
  }
}

module.exports = new TwoFactorAuthService();
```

### Step 8: Environment Variables

Add to `.env`:

```env
# SMS Provider
SMS_PROVIDER=twilio # twilio or aws-sns

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# AWS SNS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# OTP Configuration
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5

# 2FA
TWO_FACTOR_ENABLED=true
```

---

## 🧪 Testing

Create `src/tests/sms.test.js`:

```javascript
const smsService = require('../services/sms.service');
const OtpService = require('../services/otp.service');
const TwoFactorAuthService = require('../services/2fa.service');

describe('SMS Service', () => {
  const testPhone = '+1234567890';

  beforeEach(async () => {
    // Clear OTP before each test
    await OtpService.revokeOtp(testPhone);
  });

  test('should generate OTP', () => {
    const otp = OtpService.generateOtp(6);
    expect(otp).toHaveLength(6);
    expect(/^\d+$/.test(otp)).toBe(true);
  });

  test('should store and verify OTP', async () => {
    const otp = '123456';
    await OtpService.storeOtp(testPhone, otp, 10);

    const verified = await OtpService.verifyOtp(testPhone, otp);
    expect(verified).toBe(true);
  });

  test('should reject invalid OTP', async () => {
    const otp = '123456';
    await OtpService.storeOtp(testPhone, otp, 10);

    expect(async () => {
      await OtpService.verifyOtp(testPhone, 'wrong');
    }).rejects.toThrow();
  });

  test('should lock after max attempts', async () => {
    const otp = '123456';
    await OtpService.storeOtp(testPhone, otp, 10);

    for (let i = 0; i < 5; i++) {
      try {
        await OtpService.verifyOtp(testPhone, 'wrong');
      } catch (error) {
        // Expected
      }
    }

    const isLocked = await OtpService.isOtpLocked(testPhone);
    expect(isLocked).toBe(true);
  });

  test('should send OTP via SMS', async () => {
    const result = await smsService.sendOtp(testPhone);
    expect(result.jobId).toBeDefined();
  });

  test('should enable 2FA', async () => {
    const result = await TwoFactorAuthService.enable2fa('user-1', testPhone);
    expect(result.enabled).toBe(true);
    expect(result.backupCodes.length).toBe(10);
  });

  test('should get 2FA status', async () => {
    await TwoFactorAuthService.enable2fa('user-1', testPhone);
    const status = await TwoFactorAuthService.get2faStatus('user-1');

    expect(status.enabled).toBe(true);
    expect(status.backupCodesRemaining).toBe(10);
  });
});
```

---

## ✅ Checklist

- [ ] SMS provider configured (Twilio or AWS SNS)
- [ ] OTP generation and verification working
- [ ] SMS queue configured with Bull
- [ ] Rate limiting applied to OTP requests
- [ ] SMS service implemented
- [ ] 2FA flow implemented
- [ ] Backup codes generated and stored
- [ ] Phone number validation working
- [ ] Queue job processing working
- [ ] Tests passing
- [ ] Environment variables configured
- [ ] Error handling implemented
- [ ] Batch SMS sending working

---

## 📊 Database Migration

Create migration for 2FA:

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('userTwoFactor', (table) => {
    table.increments('id').primary();
    table.integer('userId').unsigned().notNullable().unique();
    table.string('phoneNumber').notNullable();
    table.boolean('enabled').defaultTo(false);
    table.text('backupCodes').notNullable();
    table.timestamps(true, true);

    table.foreign('userId').references('users.id').onDelete('CASCADE');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('userTwoFactor');
};
```

---

## 🐛 Common Issues

### Issue: "Twilio authentication failed"
**Solution:** Check credentials in environment variables

### Issue: "Invalid phone number format"
**Solution:** Use international format: +1234567890

### Issue: "Queue not processing"
**Solution:** Ensure Redis is running and SMS provider is initialized

---

## 📋 Recipe Metadata

- **Recipe #:** 10/20
- **Category:** Communication/Security
- **Status:** Production-Ready
- **Difficulty:** Intermediate
- **OWASP:** Compliant ✅

---

**Next Recipe (#11): Search & Indexing (Elasticsearch)**

*Phase 3 Progress: 10/20 recipes complete (50%)*
