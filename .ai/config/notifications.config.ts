// config/notifications.config.ts
/**
 * Laya Hub Configuration
 */

export const notificationsConfig = {
  // Queue settings
  queue: {
    concurrency: parseInt(process.env.LAYA_QUEUE_CONCURRENCY || '5', 10),
    maxRetries: parseInt(process.env.LAYA_MAX_RETRIES || '3', 10),
    retryDelay: 1000,
  },

  // Aggregator settings
  aggregator: {
    bufferSize: parseInt(process.env.LAYA_BUFFER_SIZE || '20', 10),
    bufferInterval: parseInt(process.env.LAYA_BUFFER_INTERVAL || '500', 10),
  },

  // Channels configuration
  channels: {
    slack: {
      enabled: !!process.env.SLACK_BOT_TOKEN,
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#alerts',
      iconEmoji: process.env.SLACK_ICON_EMOJI || ':robot_face:',
      timeout: 10000,
    },

    email: {
      enabled: !!process.env.SMTP_HOST || !!process.env.SENDGRID_API_KEY,
      provider: process.env.EMAIL_PROVIDER || 'smtp',
      fromName: process.env.SMTP_FROM_NAME || 'AI Development System',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'alerts@company.com',

      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        secure: process.env.SMTP_SECURE === 'true',
        timeout: 10000,
      },

      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
      },

      mailgun: {
        domain: process.env.MAILGUN_DOMAIN,
        apiKey: process.env.MAILGUN_API_KEY,
      },
    },

    webhook: {
      enabled: true,
      timeout: 5000,
      retries: 3,
    },

    dashboard: {
      enabled: true,
      timeout: 1000,
    },
  },

  // Priority settings
  priority: {
    critical: { min: 8, max: 10 },
    high: { min: 6, max: 7 },
    medium: { min: 4, max: 5 },
    low: { min: 1, max: 3 },
  },

  // Event expiration
  expiration: {
    default: 86400000, // 24 hours
    critical: 604800000, // 7 days
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default notificationsConfig;
