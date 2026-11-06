import { Request, Response, Router } from 'express';
import { notFound } from '../../errors';
import { Runtime } from '../../runtime';
import { serializeWorkflow } from '../../workflows/service';
import { asyncHandler, validateBody } from '../middleware';
import { workflowDefinitionSchema } from '../schemas';

export function workflowRoutes(runtime: Runtime): Router {
  const router = Router();

  router.post(
    '/workflows',
    asyncHandler(async (req: Request, res: Response) => {
      const definition = validateBody(workflowDefinitionSchema, req.body);
      const workflow = await runtime.workflows.execute(definition);
      res.status(201).json(serializeWorkflow(workflow));
    })
  );

  router.get('/workflows', (_req: Request, res: Response) => {
    res.json({
      workflows: runtime.workflows.list().map(serializeWorkflow),
    });
  });

  router.get('/workflows/:id', (req: Request, res: Response) => {
    const workflow = runtime.workflows.get(req.params.id);
    if (!workflow) {
      throw notFound(`Workflow not found: ${req.params.id}`);
    }
    res.json(serializeWorkflow(workflow));
  });

  return router;
}
