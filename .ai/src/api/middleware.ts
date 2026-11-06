import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ZodType } from 'zod';
import axios from 'axios';
import { AppConfig } from '../config';
import { AppError, badRequest, unauthorized } from '../errors';
import { Metrics } from '../observability/metrics';
import { createRequestContext, RequestContext, withSpan } from '../observability/tracing';
import pino from 'pino';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ctx = createRequestContext(req.headers.traceparent as string | undefined);
  res.locals.requestContext = ctx;
  res.setHeader('x-request-id', ctx.requestId);
  res.setHeader('traceparent', `00-${ctx.traceId}-${ctx.spanId}-01`);
  next();
}

export function loggingMiddleware(
  logger: pino.Logger,
  metrics: Metrics
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    const ctx = res.locals.requestContext as RequestContext | undefined;

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      const route = req.route?.path || req.path;
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      };

      metrics.inc('http_requests_total', labels);
      metrics.observe('http_request_duration_ms', durationMs, {
        method: req.method,
        route,
      });

      logger.info(
        {
          requestId: ctx?.requestId,
          traceId: ctx?.traceId,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        },
        'HTTP request'
      );
    });

    next();
  };
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function authMiddleware(
  config: AppConfig
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!config.apiKey) {
      next();
      return;
    }

    const headerKey = req.header('x-api-key');
    const authorization = req.header('authorization');
    const bearer =
      authorization && authorization.toLowerCase().startsWith('bearer ')
        ? authorization.slice(7).trim()
        : undefined;

    const provided = headerKey || bearer;
    if (!provided || !safeEqual(provided, config.apiKey)) {
      next(unauthorized('A valid x-api-key or bearer token is required'));
      return;
    }

    next();
  };
}

interface ExternalRateLimitCheck {
  success: boolean;
  limit: number;
  remaining: number;
  reset_time: number;
  retry_after: number;
  headers: Record<string, string>;
}

/**
 * External rate limit middleware using Python FastAPI rate limit server.
 * Set ENABLE_EXTERNAL_RATE_LIMIT=true and RATE_LIMIT_SERVER_URL to enable.
 */
export function externalRateLimitMiddleware(config: AppConfig) {
  if (!config.enableExternalRateLimit || !config.rateLimitServerUrl) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const identifier = extractClientIdentifier(req);

    try {
      const response = await axios.post<ExternalRateLimitCheck>(
        `${config.rateLimitServerUrl}/check`,
        {
          identifier,
          layer: determineRateLimitLayer(req),
          cost: determineRequestCost(req),
        },
        { timeout: 1000 }
      );

      const { success, limit, remaining, reset_time, retry_after, headers } = response.data;

      // Add rate limit headers to response
      res.setHeader('x-ratelimit-limit', String(limit));
      res.setHeader('x-ratelimit-remaining', String(remaining));
      res.setHeader('x-ratelimit-reset', String(reset_time));

      if (!success) {
        res.setHeader('retry-after', String(retry_after));
        res.status(429).json({
          error: {
            code: 'rate_limited',
            message: `Rate limit exceeded. Retry in ${retry_after} seconds.`,
          },
          retry_after: retry_after,
        });
        return;
      }

      next();
    } catch (error) {
      // Fail open: if rate limit server is unavailable, allow the request
      const logger = (req as any).logger || pino({ level: 'warn' });
      logger.warn({ error: (error as Error).message }, 'Rate limit server unavailable, allowing request');
      next();
    }
  };
}

export function rateLimitMiddleware(config: AppConfig) {
  // Use external rate limit server if enabled, otherwise use express-rate-limit
  if (config.enableExternalRateLimit && config.rateLimitServerUrl) {
    return externalRateLimitMiddleware(config);
  }

  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        code: 'too_many_requests',
        message: 'Rate limit exceeded',
      },
    },
  });
}

function extractClientIdentifier(req: Request): string {
  const apiKey = req.header('x-api-key') || req.header('authorization')?.replace('Bearer ', '');
  if (apiKey) {
    return `apikey:${apiKey.substring(0, 64)}`;
  }

  const forwardedFor = req.header('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim();
    return `ip:${ip}`;
  }

  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  return `ip:${clientIp}`;
}

function determineRateLimitLayer(req: Request): string {
  const path = req.path;
  const method = req.method;

  // AI routes - strict token bucket
  if (path.match(/^\/api\/ai\/(generate|complete|chat)/)) {
    return 'ai';
  }

  // Streaming - even stricter
  if (path.includes('/api/ai/stream')) {
    return 'ai';
  }

  // Auth routes - very strict
  if (path.match(/^\/api\/auth\/(login|register|password-reset|otp)/)) {
    return 'auth';
  }

  // Login by IP
  if (path.match(/^\/api\/auth\/login/)) {
    return 'login_ip';
  }

  // Default API layer
  return 'api';
}

function determineRequestCost(req: Request): number {
  const path = req.path;

  // Streaming costs more
  if (path.includes('/api/ai/stream')) {
    return 2;
  }

  return 1;
}

export function validateBody<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw badRequest(
      'Request validation failed',
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }
  return result.data;
}

export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const ctx = res.locals.requestContext as RequestContext;
    const spanName = `${req.method} ${req.route?.path || req.path}`;

    withSpan(spanName, ctx, () => handler(req, res)).catch(next);
  };
}

export function errorHandler(
  logger: pino.Logger
): (error: unknown, req: Request, res: Response, next: NextFunction) => void {
  return (error, req, res, _next) => {
    const ctx = res.locals.requestContext as RequestContext | undefined;

    const parserError = error as { type?: string };
    if (parserError?.type === 'entity.parse.failed' || parserError?.type === 'entity.too.large') {
      res.status(parserError.type === 'entity.too.large' ? 413 : 400).json({
        error: { code: 'invalid_body', message: 'Invalid or oversized JSON body' },
      });
      return;
    }

    if (error instanceof AppError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: ctx?.requestId,
        },
      });
      return;
    }

    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack, path: req.originalUrl },
      'Unhandled request error'
    );

    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred',
        requestId: ctx?.requestId,
      },
    });
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'not_found', `Route not found: ${req.method} ${req.path}`));
}
