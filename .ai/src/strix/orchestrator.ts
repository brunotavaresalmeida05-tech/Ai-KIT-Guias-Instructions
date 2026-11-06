// src/strix/orchestrator.ts
/**
 * Strix - Multi-Agent Orchestrator
 * Coordinates multiple AI agents for complex workflows
 */

import EventEmitter from 'events';
import { randomUUID as uuid } from 'crypto';
import pino from 'pino';

// Types
export interface Agent {
  id: string;
  name: string;
  type: 'worker' | 'coordinator' | 'specialist';
  skills: string[];
  status: 'idle' | 'busy' | 'error' | 'offline';
  capabilities: Record<string, any>;
  maxConcurrent: number;
  currentTasks: number;
}

export interface Task {
  id: string;
  workflowId: string;
  agentId?: string;
  type: string;
  payload: any;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'retrying';
  priority: number; // 1-10, higher = more urgent
  retries: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: Error;
  metadata: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  tasks: Task[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  strategy: 'sequential' | 'parallel' | 'hybrid';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: Error;
  metadata: Record<string, any>;
}

export interface WorkflowDefinition {
  name: string;
  strategy: 'sequential' | 'parallel' | 'hybrid';
  tasks: Array<{
    name: string;
    type: string;
    payload: any;
    requiredSkills?: string[];
    priority?: number;
    retries?: number;
    dependencies?: string[]; // Task names this depends on
    timeout?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface ExecutionContext {
  workflowId: string;
  taskId: string;
  agentId: string;
  previousResults: Map<string, any>;
  metadata: Record<string, any>;
  /** Cooperative cancellation. Handlers must stop their own external work on abort. */
  signal?: AbortSignal;
}

class TaskTimeoutError extends Error {}

// Agent Registry
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.logger.info({ agentId: agent.id }, 'Agent registered');
  }

  deregister(agentId: string): void {
    this.agents.delete(agentId);
    this.logger.info({ agentId }, 'Agent deregistered');
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAgentsBySkill(skill: string): Agent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.skills.includes(skill) && agent.status !== 'offline'
    );
  }

  updateStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.logger.debug({ agentId, status }, 'Agent status updated');
    }
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getHealthStatus(): Record<string, any> {
    const agents = this.getAllAgents();
    return {
      totalAgents: agents.length,
      idleAgents: agents.filter((a) => a.status === 'idle').length,
      busyAgents: agents.filter((a) => a.status === 'busy').length,
      offlineAgents: agents.filter((a) => a.status === 'offline').length,
      totalCapacity: agents.reduce((sum, a) => sum + a.maxConcurrent, 0),
      usedCapacity: agents.reduce((sum, a) => sum + a.currentTasks, 0),
    };
  }
}

// State Machine for Workflow Execution
export class WorkflowStateMachine {
  private currentState: Workflow['status'] = 'pending';
  private transitions: Map<Workflow['status'], Workflow['status'][]> = new Map([
    ['pending', ['running', 'failed']],
    ['running', ['completed', 'failed', 'paused']],
    ['paused', ['running', 'failed']],
    ['completed', []],
    ['failed', ['running']], // Allow retry
  ]);

  canTransition(from: Workflow['status'], to: Workflow['status']): boolean {
    const allowed = this.transitions.get(from) || [];
    return allowed.includes(to);
  }

  transition(from: Workflow['status'], to: Workflow['status']): boolean {
    if (this.canTransition(from, to)) {
      this.currentState = to;
      return true;
    }
    return false;
  }

  getState(): Workflow['status'] {
    return this.currentState;
  }
}

// Task Scheduler with Priority Queue
export class TaskScheduler {
  private queue: Task[] = [];
  private assignedTasks: Map<string, Task[]> = new Map();
  private logger: pino.Logger;

  constructor(logger: pino.Logger) {
    this.logger = logger;
  }

  enqueue(task: Task): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.logger.debug({ taskId: task.id, priority: task.priority }, 'Task enqueued');
  }

  dequeue(): Task | undefined {
    return this.queue.shift();
  }

  assign(task: Task, agentId: string): void {
    if (!this.assignedTasks.has(agentId)) {
      this.assignedTasks.set(agentId, []);
    }
    this.assignedTasks.get(agentId)!.push(task);
    task.agentId = agentId;
    task.status = 'assigned';
    this.logger.debug({ taskId: task.id, agentId }, 'Task assigned to agent');
  }

  complete(taskId: string, result: any): void {
    for (const tasks of this.assignedTasks.values()) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.result = result;
        task.completedAt = new Date();
        this.logger.debug({ taskId }, 'Task completed');
        break;
      }
    }
  }

  fail(taskId: string, error: Error): void {
    for (const tasks of this.assignedTasks.values()) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = 'failed';
        task.error = error;
        task.completedAt = new Date();
        this.logger.debug({ taskId, error: error.message }, 'Task failed');
        break;
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getAssignedTasks(agentId: string): Task[] {
    return this.assignedTasks.get(agentId) || [];
  }
}

// Main Orchestrator
export class Orchestrator extends EventEmitter {
  private registry: AgentRegistry;
  private scheduler: TaskScheduler;
  private workflows: Map<string, Workflow> = new Map();
  private logger: pino.Logger;
  private capacityWaiters = new Set<() => void>();
  private handlers: Map<
    string,
    (payload: any, ...args: any[]) => any | Promise<any>
  > = new Map();

  constructor() {
    super();
    this.logger = pino({
      name: 'Strix-Orchestrator',
      level: process.env.LOG_LEVEL || 'info',
    });
    this.registry = new AgentRegistry(this.logger);
    this.scheduler = new TaskScheduler(this.logger);
  }

  // Register an agent
  registerAgent(agentConfig: Omit<Agent, 'id' | 'currentTasks'>): Agent {
    if (!Number.isInteger(agentConfig.maxConcurrent) || agentConfig.maxConcurrent < 1) {
      throw new Error('maxConcurrent must be a positive integer');
    }
    const agent: Agent = {
      ...agentConfig,
      id: uuid(),
      currentTasks: 0,
    };
    this.registry.register(agent);
    this.notifyCapacity();
    this.emit('agent-registered', agent);
    return agent;
  }

  // Register a task handler
  registerHandler(
    taskType: string,
    handler: (payload: any, ...args: any[]) => any | Promise<any>
  ): void {
    this.handlers.set(taskType, handler);
    this.logger.debug({ taskType }, 'Task handler registered');
  }

  // Create and execute workflow
  async executeWorkflow(definition: WorkflowDefinition): Promise<Workflow> {
    const workflowId = uuid();
    const workflow: Workflow = {
      id: workflowId,
      name: definition.name,
      tasks: [],
      status: 'pending',
      strategy: definition.strategy,
      createdAt: new Date(),
      metadata: definition.metadata || {},
    };

    // Create tasks from definition
    for (const taskDef of definition.tasks) {
      const task: Task = {
        id: uuid(),
        workflowId,
        type: taskDef.type,
        payload: taskDef.payload,
        status: 'pending',
        priority: taskDef.priority || 5,
        retries: 0,
        maxRetries: taskDef.retries ?? 3,
        createdAt: new Date(),
        metadata: {
          name: taskDef.name,
          dependencies: taskDef.dependencies || [],
          requiredSkills: taskDef.requiredSkills,
          timeout: taskDef.timeout || 30000,
        },
      };
      workflow.tasks.push(task);
    }

    this.workflows.set(workflowId, workflow);
    this.emit('workflow-created', workflow);
    workflow.status = 'running';
    workflow.startedAt = new Date();

    // Execute based on strategy
    try {
      if (definition.strategy === 'sequential') {
        await this.executeSequential(workflow);
      } else if (definition.strategy === 'parallel') {
        await this.executeParallel(workflow);
      } else {
        await this.executeHybrid(workflow);
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      this.emit('workflow-completed', workflow);
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error as Error;
      workflow.completedAt = new Date();
      this.emit('workflow-failed', { workflow, error });
    }

    return workflow;
  }

  // Sequential execution
  private async executeSequential(workflow: Workflow): Promise<void> {
    const results = new Map<string, any>();

    for (const task of workflow.tasks) {
      // Check dependencies
      const dependencies = task.metadata.dependencies || [];
      const canExecute = dependencies.every((dep: string) => results.has(dep));

      if (!canExecute) {
        throw new Error(`Task ${task.id} has unmet dependencies`);
      }

      const result = await this.executeTask(task, results);
      results.set(task.metadata.name, result);
    }

    workflow.result = Object.fromEntries(results);
  }

  // Parallel execution
  private async executeParallel(workflow: Workflow): Promise<void> {
    const promises = workflow.tasks.map((task) =>
      this.executeTask(task, new Map()).catch((error) => {
        this.logger.error({ taskId: task.id, error: error.message }, 'Task failed');
        throw error;
      })
    );

    const results = await this.settleTasks(promises);
    workflow.result = Object.fromEntries(
      workflow.tasks.map((task, idx) => [task.metadata.name, results[idx]])
    );
  }

  // Hybrid execution (parallel with dependencies)
  private async executeHybrid(workflow: Workflow): Promise<void> {
    const results = new Map<string, any>();
    const executed = new Set<string>();
    const inProgress = new Set<string>();

    while (executed.size < workflow.tasks.length) {
      const ready = workflow.tasks.filter((task) => {
        if (executed.has(task.id) || inProgress.has(task.id)) {
          return false;
        }
        const dependencies = task.metadata.dependencies || [];
        return dependencies.every((dep: string) => results.has(dep));
      });

      if (ready.length === 0 && inProgress.size === 0) {
        throw new Error('Circular dependencies detected');
      }

      const promises = ready.map(async (task) => {
        inProgress.add(task.id);
        try {
          const result = await this.executeTask(task, results);
          results.set(task.metadata.name, result);
          executed.add(task.id);
        } finally {
          inProgress.delete(task.id);
        }
      });

      await this.settleTasks(promises);
    }

    workflow.result = Object.fromEntries(results);
  }

  // Execute single task with retry logic
  private async executeTask(
    task: Task,
    previousResults: Map<string, any>
  ): Promise<any> {
    const maxRetries = task.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const handler = this.handlers.get(task.type);
        if (!handler) throw new Error(`No handler for task type: ${task.type}`);
        const agent = await this.acquireAgent(task);
        const controller = new AbortController();

        // Create execution context
        const context: ExecutionContext = {
          workflowId: task.workflowId,
          taskId: task.id,
          agentId: agent.id,
          previousResults,
          metadata: task.metadata,
          signal: controller.signal,
        };
        task.agentId = agent.id;
        task.status = 'running';
        task.startedAt = new Date();

        // The slot belongs to the actual handler, not the timeout race. Releasing it
        // early would allow another task to overlap an uncancellable operation.
        const operation = Promise.resolve().then(() => handler(task.payload, context));
        const release = () => {
          agent.currentTasks--;
          if (agent.status === 'busy' && agent.currentTasks === 0) agent.status = 'idle';
          this.notifyCapacity();
        };
        void operation.then(release, release);
        let timer: ReturnType<typeof setTimeout> | undefined;
        let result: any;
        try {
          result = await Promise.race([
            operation,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                reject(new TaskTimeoutError('Task timeout; handler cancellation requested'));
                controller.abort();
              }, task.metadata.timeout ?? 30000);
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }

        task.status = 'completed';
        task.completedAt = new Date();
        task.result = result;
        this.scheduler.complete(task.id, result);
        return result;
      } catch (error) {
        // Timeout does not prove the handler stopped; retrying can duplicate effects.
        if (attempt < maxRetries && !(error instanceof TaskTimeoutError)) {
          task.retries++;
          task.status = 'retrying';
          this.logger.warn(
            { taskId: task.id, attempt, error: (error as Error).message },
            'Task failed, retrying'
          );
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        } else {
          task.status = 'failed';
          task.completedAt = new Date();
          task.error = error as Error;
          this.scheduler.fail(task.id, error as Error);
          throw error;
        }
      }
    }
  }

  // Select best agent for task
  private selectAgent(task: Task): Agent | undefined {
    const requiredSkills = task.metadata.requiredSkills || [];
    const candidates = this.registry
      .getAllAgents()
      .filter(
        (agent) =>
          agent.status !== 'offline' && agent.status !== 'error' &&
          agent.currentTasks < agent.maxConcurrent &&
          (requiredSkills.length === 0 ||
            requiredSkills.every((skill: string) => agent.skills.includes(skill)))
      )
      .sort((a, b) => a.currentTasks - b.currentTasks);

    return candidates[0];
  }

  private notifyCapacity(): void {
    for (const wake of [...this.capacityWaiters]) wake();
  }

  private acquireAgent(task: Task): Promise<Agent> {
    const requiredSkills: string[] = task.metadata.requiredSkills || [];
    const hasCandidate = this.registry.getAllAgents().some((agent) =>
      agent.status !== 'offline' && agent.status !== 'error' &&
      requiredSkills.every((skill) => agent.skills.includes(skill))
    );
    if (!hasCandidate) return Promise.reject(new Error('No available agent for task'));

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.capacityWaiters.delete(reserve);
        if (timer) clearTimeout(timer);
      };
      const reserve = () => {
        const agent = this.selectAgent(task);
        if (!agent) return;
        agent.currentTasks++;
        agent.status = 'busy';
        cleanup();
        resolve(agent);
      };
      this.capacityWaiters.add(reserve);
      const timer = setTimeout(() => {
        cleanup();
        reject(new TaskTimeoutError('Task timeout waiting for agent capacity'));
      }, task.metadata.timeout ?? 30000);
      reserve();
    });
  }

  private async settleTasks<T>(promises: Promise<T>[]): Promise<T[]> {
    const settled = await Promise.allSettled(promises);
    const failed = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failed) throw failed.reason;
    return settled.map((result) => (result as PromiseFulfilledResult<T>).value);
  }

  // Get workflow status
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  // Get orchestrator health
  getHealth(): Record<string, any> {
    return {
      timestamp: new Date(),
      agents: this.registry.getHealthStatus(),
      queueLength: this.capacityWaiters.size,
      activeWorkflows: Array.from(this.workflows.values()).filter(
        (w) => w.status === 'running'
      ).length,
      totalWorkflows: this.workflows.size,
    };
  }

  // List all agents
  getAgents(): Agent[] {
    return this.registry.getAllAgents();
  }
}

export default Orchestrator;
