import { Request, Response, Router } from 'express';
import { AppError, badRequest, notFound } from '../../errors';
import { Runtime } from '../../runtime';
import { asyncHandler, validateBody } from '../middleware';
import { actionParamsSchema, createEventSchema } from '../schemas';

export function eventRoutes(runtime: Runtime): Router {
  const router = Router();

  router.post(
    '/events',
    asyncHandler(async (req: Request, res: Response) => {
      const body = validateBody(createEventSchema, req.body);
      const event = await runtime.events.ingestEvent(body);
      res.status(201).json(event);
    })
  );

  router.get('/events', (_req: Request, res: Response) => {
    const events = runtime.events.getEvents();
    res.json({ count: events.length, events });
  });

  router.get('/events/:id', (req: Request, res: Response) => {
    const status = runtime.events.getEventStatus(req.params.id);
    if (!status.event) {
      throw notFound(`Event not found: ${req.params.id}`);
    }
    res.json(status);
  });

  router.post(
    '/events/:id/actions/:actionId',
    asyncHandler(async (req: Request, res: Response) => {
      const body = validateBody(actionParamsSchema, req.body ?? {});
      try {
        const result = await runtime.events.executeAction(
          req.params.id,
          req.params.actionId,
          body.params
        );
        res.json({ eventId: req.params.id, actionId: req.params.actionId, result });
      } catch (error) {
        if ((error as Error).message.startsWith('No handler for action')) {
          throw badRequest((error as Error).message);
        }
        throw new AppError(500, 'action_failed', (error as Error).message);
      }
    })
  );

  return router;
}
