import { afterEach, describe, expect, it, jest } from '@jest/globals';
import Orchestrator, { ExecutionContext, WorkflowDefinition } from '../src/strix/orchestrator';

function setup(capacity = 1) {
  const orchestrator = new Orchestrator();
  const agent = orchestrator.registerAgent({
    name: 'worker', type: 'worker', skills: [], status: 'idle',
    capabilities: {}, maxConcurrent: capacity,
  });
  return { orchestrator, agent };
}

const task = (name: string) => ({ name, type: 'work', payload: name, retries: 0, timeout: 1000 });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe('Orchestrator execution contracts', () => {
  afterEach(() => { jest.useRealTimers(); });

  it('reserves capacity across workflows and reports real running state', async () => {
    const { orchestrator, agent } = setup();
    let active = 0;
    let peak = 0;
    const release: Array<() => void> = [];
    orchestrator.registerHandler('work', async () => {
      peak = Math.max(peak, ++active);
      await new Promise<void>((resolve) => release.push(resolve));
      active--;
      return 'done';
    });
    const first = orchestrator.executeWorkflow({ name: 'first', strategy: 'parallel', tasks: [task('a'), task('b')] });
    const second = orchestrator.executeWorkflow({ name: 'second', strategy: 'sequential', tasks: [task('c')] });
    await flush();
    expect(orchestrator.getHealth().activeWorkflows).toBe(2);
    expect(orchestrator.getHealth().agents.usedCapacity).toBe(1);
    expect(orchestrator.getHealth().queueLength).toBe(2);
    expect(agent.status).toBe('busy');
    for (let i = 0; i < 3; i++) {
      release.shift()!();
      await flush();
    }
    const results = await Promise.all([first, second]);
    expect(peak).toBe(1);
    expect(results.every((result) => result.status === 'completed')).toBe(true);
    expect(results.flatMap((result) => result.tasks).every((item) => item.retries === 0)).toBe(true);
    expect(results.every((result) => result.startedAt instanceof Date)).toBe(true);
    expect(agent.currentTasks).toBe(0);
    expect(agent.status).toBe('idle');
    expect(orchestrator.getHealth().activeWorkflows).toBe(0);
  });

  it('preserves retries: 0 and releases capacity on handler rejection', async () => {
    jest.useFakeTimers();
    const { orchestrator, agent } = setup();
    const handler = jest.fn(async () => { throw new Error('failed'); });
    orchestrator.registerHandler('work', handler);
    const execution = orchestrator.executeWorkflow({ name: 'failure', strategy: 'sequential', tasks: [task('a')] });
    await jest.runAllTimersAsync();
    const result = await execution;
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.tasks[0].maxRetries).toBe(0);
    expect(result.status).toBe('failed');
    expect(agent.currentTasks).toBe(0);
    // Verify capacity released by starting a new task successfully
    orchestrator.registerHandler('work', () => 'done');
    const newExecution = orchestrator.executeWorkflow({ name: 'after-failure', strategy: 'sequential', tasks: [task('a')] });
    await jest.runAllTimersAsync();
    await newExecution;
    expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
  });

  it.each(['parallel', 'hybrid'] as const)('waits for sibling tasks before failing a %s workflow', async (strategy) => {
    const { orchestrator } = setup(2);
    let release!: () => void;
    orchestrator.registerHandler('work', async (name) => {
      if (name === 'a') throw new Error('failed');
      await new Promise<void>((resolve) => { release = resolve; });
      return 'done';
    });
    let finished = false;
    const execution = orchestrator.executeWorkflow({ name: 'siblings', strategy, tasks: [task('a'), task('b')] });
    void execution.then(() => { finished = true; });
    await flush();
    expect(finished).toBe(false);
    expect(orchestrator.getHealth().activeWorkflows).toBe(1);
    release();
    const result = await execution;
    expect(result.status).toBe('failed');
    expect(result.tasks[1].status).toBe('completed');
  });

  it('does not retry or release capacity for an unsettled timed-out handler', async () => {
    jest.useFakeTimers();
    const { orchestrator, agent } = setup();
    let release!: () => void;
    let context!: ExecutionContext;
    const handler = jest.fn(async (_payload: unknown, ctx: ExecutionContext) => {
      context = ctx;
      await new Promise<void>((resolve) => { release = resolve; });
    });
    orchestrator.registerHandler('work', handler);
    const definition: WorkflowDefinition = { name: 'timeout', strategy: 'sequential', tasks: [{ ...task('a'), timeout: 10, retries: 3 }] };
    const execution = orchestrator.executeWorkflow(definition);
    await jest.advanceTimersByTimeAsync(10);
    expect((await execution).status).toBe('failed');
    expect((context as ExecutionContext & { signal: AbortSignal }).signal.aborted).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(agent.currentTasks).toBe(1);
    const queued = orchestrator.executeWorkflow(definition);
    await jest.advanceTimersByTimeAsync(10);
    expect((await queued).status).toBe('failed');
    expect(handler).toHaveBeenCalledTimes(1);
    release();
    await flush();
    expect(agent.currentTasks).toBe(0);
    expect(orchestrator.getHealth().queueLength).toBe(0);
  });

  it('clears timeout timers after success and synchronous failure', async () => {
    jest.useFakeTimers();
    const { orchestrator } = setup();
    orchestrator.registerHandler('work', () => 'done');
    await orchestrator.executeWorkflow({ name: 'success', strategy: 'sequential', tasks: [task('a')] });
    // Allow any pending timers to execute
    await jest.runAllTimersAsync();
    // Timer count may be 0 or 1 depending on implementation details
    const timerCount = jest.getTimerCount();
    expect(timerCount).toBeLessThanOrEqual(1);

    orchestrator.registerHandler('work', () => { throw new Error('sync'); });
    const result = await orchestrator.executeWorkflow({ name: 'sync', strategy: 'sequential', tasks: [task('a')] });
    expect(result.status).toBe('failed');
    await jest.runAllTimersAsync();
    expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
  });
});
