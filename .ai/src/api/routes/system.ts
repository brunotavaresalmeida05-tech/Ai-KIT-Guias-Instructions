import { Request, Response, Router } from 'express';
import { Runtime } from '../../runtime';
import { asyncHandler } from '../middleware';
import { openApiDocument } from '../openapi';
import { dashboardCss, dashboardHtml, dashboardScript } from '../dashboard';

export const VERSION = '2.0.0';

export function systemRoutes(runtime: Runtime): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      backend: runtime.memory.kind,
      embeddingProvider: runtime.config.embeddingProvider,
      llmProvider: runtime.llm?.name || 'none',
    });
  });

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'AI Development System',
      version: VERSION,
      docs: '/openapi.json',
      dashboard: '/dashboard',
      health: '/health',
      api: {
        workflows: '/api/workflows',
        memory: '/api/memory',
        skills: '/api/skills',
        events: '/api/events',
        stats: '/api/system/stats',
      },
    });
  });

  router.get('/metrics', (_req: Request, res: Response) => {
    res.type('text/plain').send(runtime.metrics.render());
  });

  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });

  router.get('/dashboard', (_req: Request, res: Response) => {
    res.type('html').send(dashboardHtml());
  });

  router.get('/dashboard.js', (_req: Request, res: Response) => {
    res.type('application/javascript').send(dashboardScript());
  });

  router.get('/dashboard.css', (_req: Request, res: Response) => {
    res.type('text/css').send(dashboardCss());
  });

  router.get(
    '/api/system/stats',
    asyncHandler(async (_req: Request, res: Response) => {
      res.json({
        version: VERSION,
        uptimeSeconds: Math.round(process.uptime()),
        node: process.version,
        backend: runtime.memory.kind,
        embeddingProvider: runtime.config.embeddingProvider,
        llmProvider: runtime.llm?.name || 'none',
        memory: await runtime.memory.getStats(),
        workflows: runtime.workflows.stats(),
        events: runtime.events.getStats(),
        skills: {
          total: runtime.skillReport.total,
          valid: runtime.skillReport.valid,
          invalid: runtime.skillReport.invalid,
          executable: runtime.skillRegistry.getAllSkills().length,
        },
        security: {
          apiKeyConfigured: Boolean(runtime.config.apiKey),
          corsOrigins: runtime.config.corsOrigins,
          rateLimit: {
            windowMs: runtime.config.rateLimitWindowMs,
            max: runtime.config.rateLimitMax,
          },
        },
      });
    })
  );

  return router;
}
