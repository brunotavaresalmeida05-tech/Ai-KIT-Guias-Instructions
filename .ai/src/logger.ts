import pino from 'pino';

export function createLogger(name = 'ai-kit', level = process.env.LOG_LEVEL || 'info'): pino.Logger {
  return pino({
    name,
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        'password',
        'token',
        'apiKey',
        '*.password',
        '*.token',
        '*.apiKey',
      ],
      censor: '[redacted]',
    },
  });
}
