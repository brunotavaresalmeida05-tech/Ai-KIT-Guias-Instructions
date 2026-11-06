/**
 * Opt-in integration against a dedicated PostgreSQL database with pgvector.
 *
 * Initialize the test database with db/init.sql before running this suite.
 * The hash embedding provider is deterministic and requires no LLM/network service.
 *
 * POSIX:
 *   INTEGRATION_TESTS=true \
 *     INTEGRATION_DATABASE_URL=postgresql://... \
 *     npm run test:integration
 * PowerShell:
 *   $env:INTEGRATION_TESTS='true'
 *   $env:INTEGRATION_DATABASE_URL='postgresql://...'
 *   npm run test:integration
 * No fallback to in-memory storage: an enabled suite without a test URL fails.
 * Only the session created by this run is deleted during teardown.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Orchestrator from '../src/strix/orchestrator';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { MemoryBackend } from '../src/claude-mem/store/types';
import {
  SkillRegistry,
  SkillExecutor,
  SkillComposer,
  TextProcessingSkill,
  DataValidationSkill,
} from '../src/taste-skill/skill-framework';
import LayaHub, { NotificationEvent } from '../src/laya/notification-hub';
import pino from 'pino';
import { createMemoryBackend } from '../src/claude-mem/store/factory';
import { loadConfig } from '../src/config';

const logger = pino({ level: 'silent' });

const describeIntegration =
  process.env.INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('E2E Integration Tests', () => {
  let orchestrator: Orchestrator;
  let memoryService: MemoryBackend;
  let verificationPool: Pool | undefined;
  let skillRegistry: SkillRegistry;
  let skillExecutor: SkillExecutor;
  let skillComposer: SkillComposer;
  let hub: LayaHub;
  let sessionId: string;

  beforeAll(async () => {
    orchestrator = new Orchestrator();
    skillRegistry = new SkillRegistry(logger);
    skillExecutor = new SkillExecutor(skillRegistry, logger);
    skillComposer = new SkillComposer(skillExecutor, logger);
    hub = new LayaHub(undefined, logger);

    const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('INTEGRATION_DATABASE_URL is required: use a dedicated PostgreSQL test database initialized with db/init.sql');
    }
    verificationPool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    // Verify the real schema exists before starting services; never migrate a guessed DB.
    await verificationPool.query('SELECT embedding FROM memory_documents LIMIT 0');
    const config = loadConfig({
      NODE_ENV: 'test', MEMORY_BACKEND: 'postgres', DATABASE_URL: databaseUrl,
      EMBEDDING_PROVIDER: 'hash', LLM_PROVIDER: 'none', LOG_LEVEL: 'silent',
    });
    memoryService = await createMemoryBackend(config, logger);
    expect(memoryService.kind).toBe('postgres');

    const session = await memoryService.createSession(randomUUID(), 86400);
    sessionId = session.id;

    skillRegistry.register(new TextProcessingSkill(logger));
    skillRegistry.register(new DataValidationSkill(logger));
  });

  afterAll(async () => {
    try {
      if (sessionId && verificationPool) {
        await verificationPool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
      }
    } finally {
      await Promise.all([
        memoryService?.close?.(), hub?.cleanup(), verificationPool?.end(),
      ]);
    }
  });

  describe('Complete Workflow: Orchestrator → Memory → Notifications', () => {
    it('should execute workflow and store results in memory', async () => {
      // Setup agent
      const agent = orchestrator.registerAgent({
        name: 'DataProcessor',
        type: 'worker',
        skills: ['process-data'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      expect(agent).toBeDefined();

      // Register handler
      orchestrator.registerHandler('process-data', async (payload) => {
        return { success: true, data: { processed: payload.text.toUpperCase() } };
      });

      // Execute workflow
      const workflow = await orchestrator.executeWorkflow({
        name: 'TestWorkflow',
        strategy: 'sequential',
        tasks: [
          {
            name: 'process',
            type: 'process-data',
            payload: { text: 'hello world' },
            priority: 5,
          },
        ],
      });

      expect(workflow.status).toBe('completed');
      expect(workflow.result).toBeDefined();

      // Store in memory
      const doc = await memoryService.store(
        JSON.stringify(workflow.result),
        sessionId,
        'result'
      );

      expect(doc).toBeDefined();
      expect(doc.content).toContain('HELLO WORLD');

      // Search memory
      const results = await memoryService.search({
        query: 'hello world result',
        sessionId,
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.id).toBe(doc.id);
    });

    it('should route workflow results as notifications', async () => {
      let actionExecuted = false;

      // Setup handlers
      hub.registerHandler('deliver-dashboard', async (_event) => undefined);

      hub.registerHandler('action-acknowledge', async (_params) => {
        actionExecuted = true;
        return { acknowledged: true };
      });

      orchestrator.registerHandler('test-handler', async () => ({
        success: true,
        data: { message: 'completed' },
      }));

      // Execute workflow
      const workflow = await orchestrator.executeWorkflow({
        name: 'NotificationWorkflow',
        strategy: 'sequential',
        tasks: [
          {
            name: 'simple-task',
            type: 'test-handler',
            payload: {},
            priority: 5,
          },
        ],
      });

      expect(workflow.status).toBe('completed');

      // Send notification
      const event = await hub.ingestEvent({
        source: 'workflow',
        type: 'completion',
        title: 'Workflow Completed Successfully',
        description: workflow.name,
        priority: 6,
        payload: workflow.result,
      });

      expect(event).toBeDefined();

      // Execute action
      await hub.executeAction(event.id, 'acknowledge', {
        userId: 'test-user',
      });

      expect(actionExecuted).toBe(true);
    });
  });

  describe('Skill Composition with Memory', () => {
    it('should compose skills and persist results', async () => {
      // Define composition
      const composition = skillComposer.defineComposition(
        'ProcessAndValidate',
        'Process text then validate',
        [
          {
            skillId: skillRegistry.getSkillByName('TextProcessing')!.getMetadata().id,
            input: { text: 'hello world', operation: 'uppercase' },
          },
          {
            skillId: skillRegistry.getSkillByName('DataValidation')!.getMetadata().id,
            input: {
              data: { text: 'HELLO WORLD' },
              schema: { text: { required: true, type: 'string' } },
            },
          },
        ]
      );

      // Execute composition
      const result = await skillComposer.executeComposition(composition, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ success: true, data: 'HELLO WORLD' });
      expect(result.data[1].success).toBe(true);

      // Store results in memory
      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].success) {
          await memoryService.store(
            JSON.stringify(result.data[i].data),
            sessionId,
            'result',
            { step: i, composition: composition.id }
          );
        }
      }

      // Verify stored
      const docs = await memoryService.getSessionDocuments(sessionId, 'result');
      expect(docs.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Agent Parallel Execution', () => {
    it('should execute multiple agents in parallel', async () => {
      let active = 0;
      let peak = 0;

      // Register agents
      for (let i = 0; i < 3; i++) {
        orchestrator.registerAgent({
          name: `Agent${i}`,
          type: 'worker',
          skills: [`task${i}`],
          status: 'idle',
          capabilities: {},
          maxConcurrent: 5,
        });
      }

      // Register handlers with delays
      for (let i = 0; i < 3; i++) {
        orchestrator.registerHandler(`task${i}`, async () => {
          peak = Math.max(peak, ++active);
          await new Promise((resolve) => setTimeout(resolve, 100));
          active--;
          return { success: true, data: { taskId: i } };
        });
      }

      // Execute in parallel
      const workflow = await orchestrator.executeWorkflow({
        name: 'ParallelWorkflow',
        strategy: 'parallel',
        tasks: [
          { name: 'task0', type: 'task0', payload: {}, priority: 5 },
          { name: 'task1', type: 'task1', payload: {}, priority: 5 },
          { name: 'task2', type: 'task2', payload: {}, priority: 5 },
        ],
      });

      expect(workflow.status).toBe('completed');
      expect(peak).toBe(3);
      expect(active).toBe(0);
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed tasks automatically', async () => {
      let attemptCount = 0;

      orchestrator.registerHandler('flaky-task', async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Simulated failure');
        }
        return { success: true, data: { attempts: attemptCount } };
      });

      orchestrator.registerAgent({
        name: 'RetryAgent',
        type: 'worker',
        skills: ['retry'],
        status: 'idle',
        capabilities: {},
        maxConcurrent: 5,
      });

      const workflow = await orchestrator.executeWorkflow({
        name: 'RetryWorkflow',
        strategy: 'sequential',
        tasks: [
          {
            name: 'retry-task',
            type: 'flaky-task',
            payload: {},
            priority: 5,
            retries: 3,
          },
        ],
      });

      expect(workflow.status).toBe('completed');
      expect(attemptCount).toBe(2);
    });
  });

  describe('Memory Search with Similarity', () => {
    it('should search persisted vectors using deterministic lexical embeddings', async () => {
      // Store various documents
      await memoryService.store('The quick brown fox jumps over the lazy dog', sessionId, 'content');
      await memoryService.store('A fast brown fox leaps over a sleepy dog', sessionId, 'content');
      await memoryService.store('Database optimization for performance', sessionId, 'content');

      // Search for similar content
      const results = await memoryService.search({
        query: 'fast fox jumps dog',
        sessionId,
        limit: 10,
        similarity: 0.3,
      });

      expect(results.length).toBeGreaterThan(0);

      // First results should be about fox/dog
      const topResults = results.slice(0, 2);
      const foxDogResults = topResults.filter((r) =>
        r.document.content.toLowerCase().includes('fox') ||
        r.document.content.toLowerCase().includes('dog')
      );

      expect(foxDogResults.length).toBeGreaterThan(0);
    });
  });

  describe('Event Aggregation and Routing', () => {
    it('should aggregate and route multiple events', async () => {
      const deliveryLog: string[] = [];

      // Register handlers to track deliveries
      hub.registerHandler('deliver-dashboard', async (event) => {
        deliveryLog.push(`dashboard:${event.type}`);
      });

      hub.registerHandler('deliver-webhook', async (event) => {
        deliveryLog.push(`webhook:${event.type}`);
      });

      // Send multiple events
      const events: Array<Partial<NotificationEvent>> = [
        { source: 'api', type: 'error', priority: 9 },
        { source: 'api', type: 'warning', priority: 6 },
        { source: 'api', type: 'info', priority: 2 },
      ];

      for (const event of events) {
        await hub.ingestEvent({
          ...event,
          title: `Event: ${event.type}`,
          description: `Test ${event.type}`,
          payload: {},
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(deliveryLog.length).toBeGreaterThan(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should report orchestrator health', () => {
      const health = orchestrator.getHealth();

      expect(health.agents).toBeDefined();
      expect(health.agents.totalAgents).toBeGreaterThan(0);
      expect(health.queueLength).toBeGreaterThanOrEqual(0);
      expect(health.activeWorkflows).toBeGreaterThanOrEqual(0);
    });

    it('should report memory statistics', async () => {
      const stats = await memoryService.getStats();

      expect(Number(stats.totalSessions)).toBeGreaterThan(0);
      expect(Number(stats.totalDocuments)).toBeGreaterThanOrEqual(0);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(0);
    });

    it('should report hub statistics', () => {
      const stats = hub.getStats();

      expect(stats.events).toBeGreaterThanOrEqual(0);
      expect(stats.queue).toBeDefined();
      expect(stats.handlers).toBeGreaterThan(0);
    });
  });
});
