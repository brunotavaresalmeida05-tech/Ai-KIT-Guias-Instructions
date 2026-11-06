// tests/strix.test.ts
/**
 * Strix Orchestrator Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Orchestrator, {
  Agent,
  Task,
  Workflow,
  WorkflowDefinition,
} from '../src/strix/orchestrator';
import pino from 'pino';

describe('Strix Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  describe('Agent Registration', () => {
    it('should register an agent', () => {
      const agent = orchestrator.registerAgent({
        name: 'DataProcessor',
        type: 'worker',
        skills: ['data-processing', 'validation'],
        status: 'idle',
        capabilities: { languages: ['javascript', 'python'] },
        maxConcurrent: 5,
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('DataProcessor');
      expect(agent.status).toBe('idle');
    });

    it('should retrieve agent by id', () => {
      const agent = orchestrator.registerAgent({
        name: 'Analyst',
        type: 'specialist',
        skills: ['analysis'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 3,
      });

      const retrieved = orchestrator.getAgents().find((a) => a.id === agent.id);
      expect(retrieved).toEqual(agent);
    });

    it('should report orchestrator health', () => {
      orchestrator.registerAgent({
        name: 'Agent1',
        type: 'worker',
        skills: ['test'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      orchestrator.registerAgent({
        name: 'Agent2',
        type: 'worker',
        skills: ['test'],
        status: 'busy',
        capabilities: {},
        maxConcurrent: 3,
      });

      const agents = orchestrator.getAgents();
      expect(agents).toHaveLength(2);
      expect(agents.filter((a) => a.status === 'idle')).toHaveLength(1);
    });
  });

  describe('Task Handlers', () => {
    it('should register and execute task handler', async () => {
      orchestrator.registerHandler('greet', async (payload, context) => {
        return { message: `Hello, ${payload.name}!` };
      });

      orchestrator.registerAgent({
        name: 'Greeter',
        type: 'worker',
        skills: ['greet'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow: WorkflowDefinition = {
        name: 'GreetingWorkflow',
        strategy: 'sequential',
        tasks: [
          {
            name: 'greet-task',
            type: 'greet',
            payload: { name: 'Alice' },
            priority: 5,
          },
        ],
      };

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(result.result).toBeDefined();
    });
  });

  describe('Sequential Workflows', () => {
    it('should execute tasks sequentially', async () => {
      const executionOrder: string[] = [];

      orchestrator.registerHandler('step1', async (payload) => {
        executionOrder.push('step1');
        return { data: 'step1-result' };
      });

      orchestrator.registerHandler('step2', async (payload) => {
        executionOrder.push('step2');
        return { data: 'step2-result' };
      });

      orchestrator.registerAgent({
        name: 'Worker',
        type: 'worker',
        skills: ['step1', 'step2'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow: WorkflowDefinition = {
        name: 'SequentialWorkflow',
        strategy: 'sequential',
        tasks: [
          { name: 'task1', type: 'step1', payload: {} },
          { name: 'task2', type: 'step2', payload: {} },
        ],
      };

      await orchestrator.executeWorkflow(workflow);

      expect(executionOrder).toEqual(['step1', 'step2']);
    });

    it('should respect task dependencies', async () => {
      orchestrator.registerHandler('task', async () => ({
        success: true,
        data: 'completed',
      }));

      orchestrator.registerAgent({
        name: 'Worker',
        type: 'worker',
        skills: ['task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow: WorkflowDefinition = {
        name: 'DependencyWorkflow',
        strategy: 'sequential',
        tasks: [
          { name: 'task-a', type: 'task', payload: {} },
          {
            name: 'task-b',
            type: 'task',
            payload: {},
            dependencies: ['task-a'],
          },
        ],
      };

      const result = await orchestrator.executeWorkflow(workflow);
      expect(result.status).toBe('completed');
    });
  });

  describe('Parallel Workflows', () => {
    it('should execute tasks in parallel', async () => {
      const startTime = Date.now();

      orchestrator.registerHandler('slow-task', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { success: true };
      });

      orchestrator.registerAgent({
        name: 'Worker',
        type: 'worker',
        skills: ['slow-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow: WorkflowDefinition = {
        name: 'ParallelWorkflow',
        strategy: 'parallel',
        tasks: [
          { name: 'task1', type: 'slow-task', payload: {} },
          { name: 'task2', type: 'slow-task', payload: {} },
          { name: 'task3', type: 'slow-task', payload: {} },
        ],
      };

      const result = await orchestrator.executeWorkflow(workflow);
      const elapsed = Date.now() - startTime;

      expect(result.status).toBe('completed');
      // Should complete in ~100ms (parallel) not ~300ms (sequential)
      expect(elapsed).toBeLessThan(300);
    });
  });

  describe('Error Handling & Retries', () => {
    it('should retry failed tasks', async () => {
      let attemptCount = 0;

      orchestrator.registerHandler('flaky-task', async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      orchestrator.registerAgent({
        name: 'Worker',
        type: 'worker',
        skills: ['flaky-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow: WorkflowDefinition = {
        name: 'RetryWorkflow',
        strategy: 'sequential',
        tasks: [
          {
            name: 'retry-task',
            type: 'flaky-task',
            payload: {},
            retries: 3,
          },
        ],
      };

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(attemptCount).toBe(3);
    });
  });

  describe('Workflow Events', () => {
    it('should emit workflow events', async () => {
      const events: string[] = [];

      orchestrator.on('workflow-created', () => events.push('created'));
      orchestrator.on('workflow-completed', () => events.push('completed'));

      orchestrator.registerHandler('simple', async () => ({ success: true }));

      orchestrator.registerAgent({
        name: 'Worker',
        type: 'worker',
        skills: ['simple'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow: WorkflowDefinition = {
        name: 'EventWorkflow',
        strategy: 'sequential',
        tasks: [{ name: 'task', type: 'simple', payload: {} }],
      };

      await orchestrator.executeWorkflow(workflow);

      expect(events).toContain('created');
      expect(events).toContain('completed');
    });
  });

  describe('Concurrency Control (maxConcurrent)', () => {
    it('should allow exactly maxConcurrent tasks to run simultaneously', async () => {
      const runningTasks: string[] = [];
      const completedTasks: string[] = [];
      let maxConcurrent = 0;

      orchestrator.registerHandler('concurrent-task', async (payload: any) => {
        runningTasks.push(payload.taskId);
        maxConcurrent = Math.max(maxConcurrent, runningTasks.length);
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 50));
        const idx = runningTasks.indexOf(payload.taskId);
        if (idx > -1) runningTasks.splice(idx, 1);
        completedTasks.push(payload.taskId);
        return { taskId: payload.taskId, status: 'done' };
      });

      const agent = orchestrator.registerAgent({
        name: 'ConcurrencyTestAgent',
        type: 'worker',
        skills: ['concurrent-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 3,
      });

      // Execute 10 tasks in parallel
      const workflow: WorkflowDefinition = {
        name: 'ConcurrencyWorkflow',
        strategy: 'parallel',
        tasks: Array.from({ length: 10 }, (_, i) => ({
          name: `task-${i}`,
          type: 'concurrent-task',
          payload: { taskId: `task-${i}` },
          priority: 5,
        })),
      };

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(completedTasks).toHaveLength(10);
      // Verify that no more than maxConcurrent tasks ran at once
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      // And that maxConcurrent was actually achieved
      expect(maxConcurrent).toBe(3);
    });

    it('should queue tasks when all agents are at capacity', async () => {
      const agentStatusSequence: string[] = [];

      orchestrator.registerHandler('slow-work', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { done: true };
      });

      // Create an agent with maxConcurrent = 1
      const agent = orchestrator.registerAgent({
        name: 'LimitedAgent',
        type: 'worker',
        skills: ['slow-work'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 1,
      });

      // Queue multiple workflows
      const workflow1 = orchestrator.executeWorkflow({
        name: 'Workflow1',
        strategy: 'sequential',
        tasks: [{ name: 't1', type: 'slow-work', payload: {} }],
      });
      const workflow2 = orchestrator.executeWorkflow({
        name: 'Workflow2',
        strategy: 'sequential',
        tasks: [{ name: 't2', type: 'slow-work', payload: {} }],
      });
      const workflow3 = orchestrator.executeWorkflow({
        name: 'Workflow3',
        strategy: 'sequential',
        tasks: [{ name: 't3', type: 'slow-work', payload: {} }],
      });

      // Immediately after queuing, agent should be busy
      expect(agent.currentTasks).toBe(1);
      expect(agent.status).toBe('busy');

      // Wait for all to complete
      const results = await Promise.all([workflow1, workflow2, workflow3]);
      expect(results.every((r) => r.status === 'completed')).toBe(true);
      expect(agent.currentTasks).toBe(0);
      expect(agent.status).toBe('idle');
    });

    it('should distribute tasks across multiple agents based on capacity', async () => {
      const taskAssignment: Record<string, string[]> = {};

      orchestrator.registerHandler('distributed-task', async (payload: any, context: any) => {
        const agentId = context.agentId;
        taskAssignment[agentId] = taskAssignment[agentId] || [];
        taskAssignment[agentId].push(payload.taskId);
        return { taskId: payload.taskId };
      });

      // Create two agents: one with maxConcurrent=3, one with maxConcurrent=3
      const agent1 = orchestrator.registerAgent({
        name: 'Agent1',
        type: 'worker',
        skills: ['distributed-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 3,
      });

      orchestrator.registerAgent({
        name: 'Agent2',
        type: 'worker',
        skills: ['distributed-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 3,
      });

      // Execute 5 tasks in parallel - should distribute across agents
      const workflow: WorkflowDefinition = {
        name: 'DistributedWorkflow',
        strategy: 'parallel',
        tasks: Array.from({ length: 5 }, (_, i) => ({
          name: `dist-task-${i}`,
          type: 'distributed-task',
          payload: { taskId: `dist-task-${i}` },
          priority: 5,
        })),
      };

      await orchestrator.executeWorkflow(workflow);

      // Should have assigned tasks
      const totalAssigned = Object.values(taskAssignment).flat().length;
      expect(totalAssigned).toBe(5);

      // Verify capacity constraints were respected
      for (const [agentId, tasks] of Object.entries(taskAssignment)) {
        const assignedCount = tasks.length;
        const agent = orchestrator.getAgents().find((a) => a.id === agentId);
        // Each agent should never exceed its maxConcurrent
        expect(assignedCount).toBeLessThanOrEqual(agent?.maxConcurrent || 0);
      }
    });

    it('should respect agent skill requirements when checking capacity', async () => {
      orchestrator.registerHandler('specialized-task', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { done: true };
      });

      // Create specialized agent
      orchestrator.registerAgent({
        name: 'SpecializedAgent',
        type: 'worker',
        skills: ['specialized-task', 'python'],
        status: 'idle',
        capabilities: { language: 'python' },
        maxConcurrent: 1,
      });

      // Create generic agent without the required skill
      const genericAgent = orchestrator.registerAgent({
        name: 'GenericAgent',
        type: 'worker',
        skills: ['data-processing'],
        status: 'idle',
        capabilities: { language: 'javascript' },
        maxConcurrent: 5,
      });

      // Task requires 'specialized-task' skill
      const result = await orchestrator.executeWorkflow({
        name: 'SpecializedWorkflow',
        strategy: 'sequential',
        tasks: [
          {
            name: 'special-task',
            type: 'specialized-task',
            payload: {},
            requiredSkills: ['specialized-task'],
            retries: 0,
          },
        ],
      });

      expect(result.status).toBe('completed');
      // Specialized agent should be the one used
      expect(genericAgent.currentTasks).toBe(0);
    });

    it('should allow same agent to handle multiple tasks when maxConcurrent > 1', async () => {
      const taskOrder: string[] = [];

      orchestrator.registerHandler('serial-task', async (payload: any) => {
        taskOrder.push(payload.taskId);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { taskId: payload.taskId };
      });

      const agent = orchestrator.registerAgent({
        name: 'SerialAgent',
        type: 'worker',
        skills: ['serial-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 3,
      });

      // Execute 3 tasks that complete very quickly
      const workflow: WorkflowDefinition = {
        name: 'SerialWorkflow',
        strategy: 'parallel',
        tasks: Array.from({ length: 3 }, (_, i) => ({
          name: `serial-${i}`,
          type: 'serial-task',
          payload: { taskId: `serial-${i}` },
          priority: 5,
        })),
      };

      const result = await orchestrator.executeWorkflow(workflow);
      expect(result.status).toBe('completed');
      // All 3 tasks should have completed
      expect(taskOrder).toHaveLength(3);
      // Agent should still be idle after all tasks complete
      expect(agent.currentTasks).toBe(0);
      expect(agent.status).toBe('idle');
    });

    it('should wait for capacity before executing new task', async () => {
      const executionOrder: string[] = [];

      orchestrator.registerHandler('wait-capacity-task', async () => {
        executionOrder.push('started');
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push('completed');
        return { done: true };
      });

      const agent = orchestrator.registerAgent({
        name: 'WaitAgent',
        type: 'worker',
        skills: ['wait-capacity-task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 1,
      });

      // First task starts immediately - takes the only slot
      const task1Promise = orchestrator.executeWorkflow({
        name: 'Task1',
        strategy: 'sequential',
        tasks: [{ name: 't1', type: 'wait-capacity-task', payload: {} }],
      });

      // Second task should wait since agent is at capacity
      const task2Promise = orchestrator.executeWorkflow({
        name: 'Task2',
        strategy: 'sequential',
        tasks: [{ name: 't2', type: 'wait-capacity-task', payload: {} }],
      });

      // Wait for both to complete
      const results = await Promise.all([task1Promise, task2Promise]);

      // Both should complete successfully
      expect(results.every((r) => r.status === 'completed')).toBe(true);
      expect(agent.currentTasks).toBe(0);
      expect(agent.status).toBe('idle');

      // Verify both tasks ran
      expect(executionOrder).toContain('started');
      expect(executionOrder).toContain('completed');
    });

    it('should correctly report capacity in health status', async () => {
      // Create agents with different capacities
      const agent1 = orchestrator.registerAgent({
        name: 'HighCapacity',
        type: 'worker',
        skills: ['task'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      orchestrator.registerAgent({
        name: 'LowCapacity',
        type: 'worker',
        skills: ['task'],
        status: 'busy',
        capabilities: {},
        maxConcurrent: 2,
      });

      orchestrator.registerAgent({
        name: 'OfflineAgent',
        type: 'worker',
        skills: ['task'],
        status: 'offline',
        capabilities: {},
        maxConcurrent: 3,
      });

      const health = orchestrator.getHealth();

      expect(health.agents.totalAgents).toBe(3);
      expect(health.agents.totalCapacity).toBe(10); // 5 + 2 + 3
      // busyAgents counts agents with status='busy', not based on currentTasks
      expect(health.agents.busyAgents).toBe(1);
    });
  });
});
