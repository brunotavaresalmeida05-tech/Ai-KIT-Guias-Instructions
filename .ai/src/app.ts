import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Runtime } from './runtime';
import {
  authMiddleware,
  errorHandler,
  loggingMiddleware,
  notFoundHandler,
  rateLimitMiddleware,
  requestContextMiddleware,
} from './api/middleware';
import { systemRoutes } from './api/routes/system';
import { workflowRoutes } from './api/routes/workflows';
import { memoryRoutes } from './api/routes/memory';
import { skillRoutes } from './api/routes/skills';
import { eventRoutes } from './api/routes/events';

export function buildApp(runtime: Runtime): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
    })
  );
  app.use(
    cors({
      origin: runtime.config.corsOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['content-type', 'x-api-key', 'authorization', 'traceparent'],
      exposedHeaders: ['x-request-id', 'traceparent'],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(requestContextMiddleware);
  app.use(loggingMiddleware(runtime.logger, runtime.metrics));

  app.use('/api', rateLimitMiddleware(runtime.config), authMiddleware(runtime.config));

  app.use(systemRoutes(runtime));
  app.use(
    '/api',
    workflowRoutes(runtime),
    memoryRoutes(runtime),
    skillRoutes(runtime),
    eventRoutes(runtime)
  );

  app.use(notFoundHandler);
  app.use(errorHandler(runtime.logger));

  return app;
}
