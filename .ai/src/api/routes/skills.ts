import { Request, Response, Router } from 'express';
import { badRequest, notFound } from '../../errors';
import { Runtime } from '../../runtime';
import { asyncHandler, validateBody } from '../middleware';
import { executeSkillSchema } from '../schemas';

function summary(entry: Runtime['skillCatalog'][number], executable: boolean) {
  return {
    id: entry.id,
    executable,
    valid: Boolean(entry.metadata) && !entry.error,
    error: entry.error,
    name: entry.metadata?.name || entry.id,
    version: entry.metadata?.version,
    category: entry.metadata?.category,
    description: entry.metadata?.description,
    tags: entry.metadata?.tags || [],
    whenToUse: entry.metadata?.when_to_use,
  };
}

export function skillRoutes(runtime: Runtime): Router {
  const router = Router();

  const isExecutable = (id: string): boolean =>
    Boolean(runtime.skillRegistry.getSkillByName(id)) ||
    runtime.skillRegistry
      .getAllSkills()
      .some((skill) => skill.getMetadata().id === id);

  router.get('/skills', (_req: Request, res: Response) => {
    res.json({
      count: runtime.skillCatalog.length,
      skills: runtime.skillCatalog.map((entry) => summary(entry, isExecutable(entry.id))),
      executable: runtime.skillRegistry.getAllSkills().map((skill) => {
        const metadata = skill.getMetadata();
        return {
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          tags: metadata.tags,
          capabilities: metadata.providedCapabilities,
        };
      }),
    });
  });

  router.post('/skills/validate', (_req: Request, res: Response) => {
    res.json(runtime.skillReport);
  });

  router.get('/skills/:id', (req: Request, res: Response) => {
    const entry = runtime.skillCatalog.find((skill) => skill.id === req.params.id);
    if (!entry) {
      throw notFound(`Skill not found: ${req.params.id}`);
    }
    res.json({
      ...summary(entry, isExecutable(entry.id)),
      path: entry.path,
      body: entry.body,
    });
  });

  router.post(
    '/skills/:id/execute',
    asyncHandler(async (req: Request, res: Response) => {
      const body = validateBody(executeSkillSchema, req.body);
      const entry = runtime.skillCatalog.find((skill) => skill.id === req.params.id);
      const skill =
        runtime.skillRegistry.getSkillByName(req.params.id) ||
        runtime.skillRegistry.getSkill(req.params.id);

      if (!skill && !entry) {
        throw notFound(`Skill not found: ${req.params.id}`);
      }
      if (!skill) {
        throw badRequest(
          `Skill '${req.params.id}' is a guidance skill and has no executable handler`
        );
      }

      const output = await runtime.skills.execute(skill.getMetadata().id, body.input);
      res.json({ skill: skill.getMetadata().name, output });
    })
  );

  return router;
}
