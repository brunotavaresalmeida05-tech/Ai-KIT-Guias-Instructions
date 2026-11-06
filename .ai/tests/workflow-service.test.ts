import { createLogger } from '../src/logger';
import { HashEmbeddingProvider } from '../src/claude-mem/embeddings';
import { InMemoryBackend } from '../src/claude-mem/store/memory-store';
import { LayaHub, SimpleTextLLMRouter } from '../src/laya/notification-hub';
import { Orchestrator } from '../src/strix/orchestrator';
import { Metrics } from '../src/observability/metrics';
import {
  DataTransformationSkill,
  DataValidationSkill,
  SkillExecutor,
  SkillRegistry,
  TextProcessingSkill,
} from '../src/taste-skill/skill-framework';
import {
  WorkflowService,
  resolvePayload,
  serializeWorkflow,
} from '../src/workflows/service';

const logger = createLogger('test', 'silent');

async function makeService(): Promise<{
  service: WorkflowService;
  memory: InMemoryBackend;
}> {
  const memory = new InMemoryBackend(new HashEmbeddingProvider(), logger);
  await memory.init();

  const registry = new SkillRegistry(logger);
  registry.register(new TextProcessingSkill(logger));
  registry.register(new DataValidationSkill(logger));
  registry.register(new DataTransformationSkill(logger));

  const service = new WorkflowService({
    orchestrator: new Orchestrator(),
    memory,
    skills: new SkillExecutor(registry, logger),
    events: new LayaHub(new SimpleTextLLMRouter(logger), logger),
    metrics: new Metrics(),
    logger,
  });

  return { service, memory };
}

describe('resolvePayload', () => {
  it('resolves task references recursively', () => {
    const context = {
      workflowId: 'w',
      taskId: 't',
      agentId: 'a',
      previousResults: new Map<string, any>([
        ['first', { value: 42, nested: { text: 'ok' } }],
      ]),
      metadata: {},
    };

    expect(
      resolvePayload(
        { direct: '${first.value}', nested: ['${first.nested.text}'], plain: 'x' },
        context as any
      )
    ).toEqual({ direct: 42, nested: ['ok'], plain: 'x' });
  });
});

describe('WorkflowService', () => {
  it('executes sequential workflows and passes results forward', async () => {
    const { service } = await makeService();

    const workflow = await service.execute({
      name: 'sequential',
      strategy: 'sequential',
      tasks: [
        { name: 'one', type: 'echo', payload: { value: 7 } },
        { name: 'two', type: 'echo', payload: { copied: '${one.echo.value}' } },
      ],
    });

    expect(workflow.status).toBe('completed');
    expect(workflow.result.two.echo.copied).toBe(7);
    expect(service.list()).toHaveLength(1);
    expect(service.stats().total).toBe(1);
  });

  it('stores and searches memory inside a workflow', async () => {
    const { service, memory } = await makeService();
    const session = await memory.createSession('tester');

    const workflow = await service.execute({
      name: 'memory',
      strategy: 'sequential',
      tasks: [
        {
          name: 'stored',
          type: 'memory.store',
          payload: {
            content: 'Architecture notes for the workflow engine',
            sessionId: session.id,
            type: 'reference',
          },
        },
        {
          name: 'found',
          type: 'memory.search',
          payload: { query: 'architecture', sessionId: session.id },
        },
      ],
    });

    expect(workflow.status).toBe('completed');
    expect(workflow.result.found.length).toBeGreaterThan(0);
  });

  it('marks workflows as failed when a task fails', async () => {
    const { service } = await makeService();

    const workflow = await service.execute({
      name: 'failure',
      strategy: 'sequential',
      tasks: [
        {
          name: 'bad',
          type: 'memory.store',
          payload: { content: 'x', sessionId: '00000000-0000-0000-0000-000000000000' },
          retries: 0,
        },
      ],
    });

    expect(workflow.status).toBe('failed');
    expect(workflow.error?.message).toMatch(/Session not found/);
    expect(serializeWorkflow(workflow).error).toMatch(/Session not found/);
  });
});
