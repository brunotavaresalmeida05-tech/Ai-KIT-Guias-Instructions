import pino from 'pino';
import {
  ExecutionContext,
  Orchestrator,
  Workflow,
  WorkflowDefinition,
} from '../strix/orchestrator';
import { MemoryBackend } from '../claude-mem/store/types';
import { SkillExecutor } from '../taste-skill/skill-framework';
import { LayaHub } from '../laya/notification-hub';
import { Metrics } from '../observability/metrics';
import { loadAgentSeeds } from '../agents/registry';

export interface WorkflowServiceDeps {
  orchestrator: Orchestrator;
  memory: MemoryBackend;
  skills: SkillExecutor;
  events: LayaHub;
  metrics: Metrics;
  logger: pino.Logger;
  agentRegistryPath?: string;
}

type Handler = (payload: any, context?: ExecutionContext) => any | Promise<any>;

const REFERENCE = /^\$\{([^}]+)\}$/;

function lookup(reference: string, previousResults: Map<string, any>): any {
  const [taskName, ...pathParts] = reference.split('.');
  let value = previousResults.get(taskName);

  for (const part of pathParts) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[part];
  }

  return value;
}

export function resolvePayload(payload: any, context?: ExecutionContext): any {
  if (!context) {
    return payload;
  }

  if (typeof payload === 'string') {
    const match = payload.match(REFERENCE);
    if (match) {
      return lookup(match[1], context.previousResults);
    }
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => resolvePayload(item, context));
  }

  if (payload && typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, resolvePayload(value, context)])
    );
  }

  return payload;
}

export function serializeWorkflow(workflow: Workflow): Record<string, any> {
  return {
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
    strategy: workflow.strategy,
    createdAt: workflow.createdAt,
    startedAt: workflow.startedAt,
    completedAt: workflow.completedAt,
    result: workflow.result,
    error: workflow.error ? workflow.error.message : undefined,
    metadata: workflow.metadata,
    tasks: workflow.tasks.map((task) => ({
      id: task.id,
      name: task.metadata.name,
      type: task.type,
      status: task.status,
      priority: task.priority,
      retries: task.retries,
      result: task.result,
      error: task.error ? task.error.message : undefined,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    })),
  };
}

export class WorkflowService {
  private readonly orchestrator: Orchestrator;
  private readonly memory: MemoryBackend;
  private readonly skills: SkillExecutor;
  private readonly events: LayaHub;
  private readonly metrics: Metrics;
  private readonly logger: pino.Logger;
  private readonly workflows = new Map<string, Workflow>();

  constructor(deps: WorkflowServiceDeps) {
    this.orchestrator = deps.orchestrator;
    this.memory = deps.memory;
    this.skills = deps.skills;
    this.events = deps.events;
    this.metrics = deps.metrics;
    this.logger = deps.logger;

    this.registerHandlers();
    this.registerAgents(deps.agentRegistryPath);
  }

  private registerAgents(registryPath?: string): void {
    const seeds = registryPath ? loadAgentSeeds(registryPath) : [];
    for (const seed of seeds) {
      this.orchestrator.registerAgent(seed);
    }

    this.orchestrator.registerAgent({
      name: 'kit-worker',
      type: 'worker',
      skills: ['echo', 'delay', 'memory.store', 'memory.search', 'skill.execute', 'event.ingest'],
      status: 'idle',
      capabilities: { role: 'Built-in task worker' },
      maxConcurrent: 20,
    });

    this.logger.info(
      { configured: seeds.length, builtIn: 1 },
      'Workflow agents registered'
    );
  }

  private handler(name: string, fn: Handler): void {
    this.orchestrator.registerHandler(name, (payload: any, context?: ExecutionContext) =>
      fn(resolvePayload(payload, context), context)
    );
  }

  private registerHandlers(): void {
    this.handler('echo', (payload) => ({ echo: payload }));

    this.handler('delay', async (payload) => {
      const ms = Math.min(30000, Math.max(0, Number(payload?.ms) || 0));
      await new Promise((resolve) => setTimeout(resolve, ms));
      return { delayedMs: ms };
    });

    this.handler('memory.store', async (payload) => {
      if (!payload?.content || !payload?.sessionId) {
        throw new Error('memory.store requires content and sessionId');
      }
      return this.memory.store(
        String(payload.content),
        String(payload.sessionId),
        payload.type,
        payload.metadata
      );
    });

    this.handler('memory.search', async (payload) => {
      if (!payload?.query) {
        throw new Error('memory.search requires query');
      }
      return this.memory.search({
        query: String(payload.query),
        sessionId: payload.sessionId,
        type: payload.type,
        limit: payload.limit,
        similarity: payload.similarity,
      });
    });

    this.handler('skill.execute', async (payload) => {
      const skillName = payload?.skill;
      if (!skillName) {
        throw new Error('skill.execute requires skill');
      }

      const output = await this.skills.executeByName(String(skillName), payload.input || {});
      return output;
    });

    this.handler('event.ingest', async (payload) => {
      return this.events.ingestEvent(payload?.event || payload);
    });
  }

  async execute(definition: WorkflowDefinition): Promise<Workflow> {
    const started = Date.now();
    const workflow = await this.orchestrator.executeWorkflow(definition);

    this.workflows.set(workflow.id, workflow);
    this.metrics.inc('workflow_executions_total', {
      status: workflow.status,
      strategy: workflow.strategy,
    });
    this.metrics.observe('workflow_duration_ms', Date.now() - started, {
      strategy: workflow.strategy,
    });

    return workflow;
  }

  list(): Workflow[] {
    return Array.from(this.workflows.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  get(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  stats(): Record<string, any> {
    const byStatus: Record<string, number> = {};
    for (const workflow of this.workflows.values()) {
      byStatus[workflow.status] = (byStatus[workflow.status] || 0) + 1;
    }

    return {
      total: this.workflows.size,
      byStatus,
    };
  }
}
