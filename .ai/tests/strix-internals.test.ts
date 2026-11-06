// tests/strix-internals.test.ts
/**
 * Strix Orchestrator — internal components and edge paths
 */

import { describe, it, expect } from '@jest/globals';
import Orchestrator, {
  AgentRegistry,
  TaskScheduler,
  WorkflowStateMachine,
  Task,
} from '../src/strix/orchestrator';
import pino from 'pino';

const logger = pino({ level: 'silent' });

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    workflowId: 'wf-1',
    type: 'test',
    payload: {},
    status: 'pending',
    priority: 5,
    retries: 0,
    maxRetries: 3,
    createdAt: new Date(),
    metadata: { name: 'task-1', dependencies: [] },
    ...overrides,
  };
}

describe('AgentRegistry', () => {
  it('registers, retrieves, filters and deregisters agents', () => {
    const registry = new AgentRegistry(logger);

    registry.register({
      id: 'a1',
      name: 'A1',
      type: 'worker',
      skills: ['x'],
      status: 'idle',
      capabilities: {},
      maxConcurrent: 2,
      currentTasks: 0,
    });
    registry.register({
      id: 'a2',
      name: 'A2',
      type: 'worker',
      skills: ['x', 'y'],
      status: 'offline',
      capabilities: {},
      maxConcurrent: 2,
      currentTasks: 2,
    });

    expect(registry.getAgent('a1')?.name).toBe('A1');
    expect(registry.getAgent('missing')).toBeUndefined();
    expect(registry.getAgentsBySkill('x')).toHaveLength(1);
    expect(registry.getAllAgents()).toHaveLength(2);

    registry.updateStatus('a1', 'busy');
    expect(registry.getAgent('a1')?.status).toBe('busy');

    registry.updateStatus('ghost', 'busy');

    const health = registry.getHealthStatus();
    expect(health.totalAgents).toBe(2);
    expect(health.busyAgents).toBe(1);
    expect(health.offlineAgents).toBe(1);
    expect(health.totalCapacity).toBe(4);

    registry.deregister('a1');
    expect(registry.getAllAgents()).toHaveLength(1);
  });
});

describe('WorkflowStateMachine', () => {
  it('allows valid transitions and rejects invalid ones', () => {
    const machine = new WorkflowStateMachine();

    expect(machine.getState()).toBe('pending');
    expect(machine.canTransition('pending', 'running')).toBe(true);
    expect(machine.canTransition('pending', 'completed')).toBe(false);
    expect(machine.transition('pending', 'running')).toBe(true);
    expect(machine.transition('running', 'completed')).toBe(true);
    expect(machine.getState()).toBe('completed');
    expect(machine.transition('completed', 'running')).toBe(false);
    expect(machine.canTransition('unknown' as any, 'running')).toBe(false);
  });

  it('allows retry from failed', () => {
    const machine = new WorkflowStateMachine();
    expect(machine.transition('pending', 'failed')).toBe(true);
    expect(machine.transition('failed', 'running')).toBe(true);
  });
});

describe('TaskScheduler', () => {
  it('enqueues by priority, assigns, completes and fails tasks', () => {
    const scheduler = new TaskScheduler(logger);

    scheduler.enqueue(makeTask({ id: 'low', priority: 1 }));
    scheduler.enqueue(makeTask({ id: 'high', priority: 9 }));
    expect(scheduler.getQueueLength()).toBe(2);

    const first = scheduler.dequeue();
    expect(first?.id).toBe('high');
    expect(scheduler.dequeue()?.id).toBe('low');
    expect(scheduler.dequeue()).toBeUndefined();

    const task = makeTask({ id: 't1' });
    scheduler.enqueue(task);
    scheduler.assign(task, 'agent-1');
    expect(task.status).toBe('assigned');
    expect(task.agentId).toBe('agent-1');
    expect(scheduler.getAssignedTasks('agent-1')).toHaveLength(1);
    expect(scheduler.getAssignedTasks('other')).toHaveLength(0);

    scheduler.complete('t1', { ok: true });
    expect(task.status).toBe('completed');
    expect(task.result).toEqual({ ok: true });

    scheduler.fail('missing', new Error('nope'));

    const t2 = makeTask({ id: 't2' });
    scheduler.assign(t2, 'agent-1');
    scheduler.fail('t2', new Error('boom'));
    expect(t2.status).toBe('failed');
  });
});

describe('Orchestrator edge paths', () => {
  const worker = (o: Orchestrator, skills: string[] = []) =>
    o.registerAgent({
      name: 'W',
      type: 'worker',
      skills,
      status: 'idle',
      capabilities: {},
      maxConcurrent: 5,
    });

  it('fails workflow when no handler is registered (after retries)', async () => {
    const orchestrator = new Orchestrator();
    worker(orchestrator);

    const result = await orchestrator.executeWorkflow({
      name: 'NoHandler',
      strategy: 'sequential',
      tasks: [{ name: 't', type: 'missing-handler', payload: {}, retries: 0 }],
    });

    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('No handler for task type');
    expect(orchestrator.getWorkflow(result.id)?.status).toBe('failed');
  });

  it('fails workflow when no agent is available', async () => {
    const orchestrator = new Orchestrator();
    orchestrator.registerHandler('t', async () => ({ ok: true }));

    const result = await orchestrator.executeWorkflow({
      name: 'NoAgent',
      strategy: 'sequential',
      tasks: [{ name: 't', type: 't', payload: {}, retries: 0, requiredSkills: ['missing-skill'] }],
    });

    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('No available agent');
  });

  it('fails sequential workflow with unmet dependencies', async () => {
    const orchestrator = new Orchestrator();
    worker(orchestrator);
    orchestrator.registerHandler('t', async () => ({ ok: true }));

    const result = await orchestrator.executeWorkflow({
      name: 'BadDeps',
      strategy: 'sequential',
      tasks: [
        { name: 'b', type: 't', payload: {}, dependencies: ['a'], retries: 0 },
      ],
    });

    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('unmet dependencies');
  });

  it('detects circular dependencies in hybrid strategy', async () => {
    const orchestrator = new Orchestrator();
    worker(orchestrator);
    orchestrator.registerHandler('t', async () => ({ ok: true }));

    const result = await orchestrator.executeWorkflow({
      name: 'Circular',
      strategy: 'hybrid',
      tasks: [
        { name: 'a', type: 't', payload: {}, dependencies: ['b'] },
        { name: 'b', type: 't', payload: {}, dependencies: ['a'] },
      ],
    });

    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('Circular dependencies');
  });

  it('executes hybrid workflow respecting dependency order', async () => {
    const order: string[] = [];
    const orchestrator = new Orchestrator();
    worker(orchestrator);

    orchestrator.registerHandler('t', async (payload: any) => {
      order.push(payload.label);
      return { ok: true, label: payload.label };
    });

    const result = await orchestrator.executeWorkflow({
      name: 'Hybrid',
      strategy: 'hybrid',
      tasks: [
        { name: 'a', type: 't', payload: { label: 'a' } },
        { name: 'b', type: 't', payload: { label: 'b' } },
        { name: 'c', type: 't', payload: { label: 'c' }, dependencies: ['a', 'b'] },
      ],
    });

    expect(result.status).toBe('completed');
    expect(order.indexOf('c')).toBeGreaterThan(order.indexOf('a'));
    expect(Object.keys(result.result)).toHaveLength(3);
  });

  it('times out a hanging handler', async () => {
    const orchestrator = new Orchestrator();
    worker(orchestrator);

    orchestrator.registerHandler('hang', () => new Promise(() => undefined));

    const result = await orchestrator.executeWorkflow({
      name: 'Timeout',
      strategy: 'sequential',
      tasks: [{ name: 'h', type: 'hang', payload: {}, timeout: 200, retries: 0 }],
    });

    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('Task timeout');
  });

  it('emits agent-registered and workflow-failed events', async () => {
    const orchestrator = new Orchestrator();
    const events: string[] = [];
    orchestrator.on('agent-registered', () => events.push('agent'));
    orchestrator.on('workflow-failed', () => events.push('failed'));

    worker(orchestrator);
    await orchestrator.executeWorkflow({
      name: 'Fail',
      strategy: 'sequential',
      tasks: [{ name: 't', type: 'ghost', payload: {}, retries: 0 }],
    });

    expect(events).toEqual(['agent', 'failed']);
    expect(orchestrator.getWorkflow('nope')).toBeUndefined();

    const health = orchestrator.getHealth();
    expect(health.totalWorkflows).toBe(1);
    expect(health.activeWorkflows).toBe(0);
  });

  it('parallel strategy propagates task failure', async () => {
    const orchestrator = new Orchestrator();
    worker(orchestrator);
    orchestrator.registerHandler('boom', async () => {
      throw new Error('kaput');
    });

    const result = await orchestrator.executeWorkflow({
      name: 'ParallelFail',
      strategy: 'parallel',
      tasks: [{ name: 'x', type: 'boom', payload: {}, retries: 0 }],
    });

    expect(result.status).toBe('failed');
    expect(result.error?.message).toBe('kaput');
  });
});
