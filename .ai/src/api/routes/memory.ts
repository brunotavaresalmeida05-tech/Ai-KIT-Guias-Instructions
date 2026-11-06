import { Request, Response, Router } from 'express';
import { badRequest } from '../../errors';
import { Runtime } from '../../runtime';
import { asyncHandler, validateBody } from '../middleware';
import {
  createDocumentSchema,
  createSessionSchema,
  searchQuerySchema,
} from '../schemas';

export function memoryRoutes(runtime: Runtime): Router {
  const router = Router();

  router.post(
    '/memory/sessions',
    asyncHandler(async (req: Request, res: Response) => {
      const body = validateBody(createSessionSchema, req.body);
      const session = await runtime.memory.createSession(body.userId, body.ttl);
      res.status(201).json(session);
    })
  );

  router.post(
    '/memory/documents',
    asyncHandler(async (req: Request, res: Response) => {
      const body = validateBody(createDocumentSchema, req.body);
      const document = await runtime.memory.store(
        body.content,
        body.sessionId,
        body.type,
        body.metadata
      );
      res.status(201).json(document);
    })
  );

  router.get(
    '/memory/search',
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = searchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(
          'Invalid search parameters',
          parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          }))
        );
      }

      const { q, ...filters } = parsed.data;
      const results = await runtime.memory.search({ query: q, ...filters });
      res.json({
        query: q,
        count: results.length,
        results: results.map((result) => ({
          similarity: result.similarity,
          rank: result.rank,
          document: result.document,
        })),
      });
    })
  );

  router.get(
    '/memory/sessions/:id/documents',
    asyncHandler(async (req: Request, res: Response) => {
      const documents = await runtime.memory.getSessionDocuments(
        req.params.id,
        req.query.type as any
      );
      res.json({ sessionId: req.params.id, count: documents.length, documents });
    })
  );

  return router;
}
