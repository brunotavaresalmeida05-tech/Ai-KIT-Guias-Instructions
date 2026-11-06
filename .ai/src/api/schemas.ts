import { z } from 'zod';

const memoryType = z.enum([
  'context',
  'instruction',
  'feedback',
  'result',
  'reference',
  'content',
]);

const metadata = z.record(z.string(), z.any()).default({});

export const workflowTaskSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
  payload: z.any().default({}),
  requiredSkills: z.array(z.string().min(1)).max(20).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  retries: z.number().int().min(0).max(5).optional(),
  dependencies: z.array(z.string().min(1)).max(50).optional(),
  timeout: z.number().int().positive().max(300000).optional(),
});

export const workflowDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  strategy: z.enum(['sequential', 'parallel', 'hybrid']).default('sequential'),
  tasks: z.array(workflowTaskSchema).min(1).max(50),
  metadata: z.record(z.string(), z.any()).default({}),
});

export const createSessionSchema = z.object({
  userId: z.string().min(1).max(200).optional(),
  ttl: z.number().int().min(60).max(31536000).optional(),
});

export const createDocumentSchema = z.object({
  content: z.string().min(1).max(100000),
  sessionId: z.string().uuid(),
  type: memoryType.default('context'),
  metadata,
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  type: memoryType.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  similarity: z
    .preprocess(
      (value) => (value === '' || value === undefined ? undefined : Number(value)),
      z.number().min(0).max(1).optional()
    )
    .optional(),
});

export const executeSkillSchema = z.object({
  input: z.record(z.string(), z.any()).default({}),
});

export const createEventSchema = z.object({
  source: z.enum([
    'github',
    'slack',
    'email',
    'webhook',
    'database',
    'api',
    'workflow',
    'system',
  ]),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).default(''),
  payload: z.record(z.string(), z.any()).default({}),
  priority: z.number().int().min(1).max(10).optional(),
  metadata,
  expiresAt: z.coerce.date().optional(),
});

export const actionParamsSchema = z.object({
  params: z.record(z.string(), z.any()).default({}),
});

export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionSchema>;
