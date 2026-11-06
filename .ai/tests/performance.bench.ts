// tests/performance.bench.ts
/**
 * Performance Benchmarks
 * Measure throughput and latency across systems
 */

import Orchestrator from '../src/strix/orchestrator';
import MemoryService, { OllamaEmbeddingProvider } from '../src/claude-mem/memory-service';
import { SkillRegistry, SkillExecutor, TextProcessingSkill } from '../src/taste-skill/skill-framework';
import LayaHub from '../src/laya/notification-hub';
import { Pool } from 'pg';
import pino from 'pino';

const logger = pino({ level: 'silent' });

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // ops/sec
}

function benchmark(name: string, fn: () => Promise<void>, iterations = 100): BenchmarkResult {
  const times: number[] = [];

  return new Promise<void>((resolve) => {
    const startTotal = Date.now();

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      const duration = Date.now() - start;
      times.push(duration);
    }

    const totalTime = Date.now() - startTotal;
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    resolve({
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      throughput: (iterations / totalTime) * 1000, // ops/sec
    });
  });
}

async function runBenchmarks() {
  console.log('🚀 Performance Benchmarks\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: BenchmarkResult[] = [];

  // 1. Orchestrator Benchmarks
  console.log('📊 Strix Orchestrator Benchmarks\n');

  const orchestrator = new Orchestrator();

  orchestrator.registerAgent({
    name: 'Worker',
    type: 'worker',
    skills: ['test'],
    status: 'idle',
    capabilities: {},
    maxConcurrent: 5,
  });

  orchestrator.registerHandler('test', async () => ({
    success: true,
    data: { result: 'ok' },
  }));

  // Benchmark: Sequential workflow
  const seqResult = await benchmark(
    'Sequential Workflow (3 tasks)',
    async () => {
      await orchestrator.executeWorkflow({
        name: 'Test',
        strategy: 'sequential',
        tasks: [
          { name: 't1', type: 'test', payload: {}, priority: 5 },
          { name: 't2', type: 'test', payload: {}, priority: 5 },
          { name: 't3', type: 'test', payload: {}, priority: 5 },
        ],
      });
    },
    20
  );
  results.push(seqResult);
  console.log(`  Sequential: ${seqResult.avgTime.toFixed(2)}ms avg (${seqResult.throughput.toFixed(2)} workflows/sec)\n`);

  // Benchmark: Parallel workflow
  const parResult = await benchmark(
    'Parallel Workflow (3 tasks)',
    async () => {
      await orchestrator.executeWorkflow({
        name: 'Test',
        strategy: 'parallel',
        tasks: [
          { name: 't1', type: 'test', payload: {}, priority: 5 },
          { name: 't2', type: 'test', payload: {}, priority: 5 },
          { name: 't3', type: 'test', payload: {}, priority: 5 },
        ],
      });
    },
    20
  );
  results.push(parResult);
  console.log(`  Parallel: ${parResult.avgTime.toFixed(2)}ms avg (${parResult.throughput.toFixed(2)} workflows/sec)\n`);

  const speedup = (seqResult.avgTime / parResult.avgTime).toFixed(2);
  console.log(`  ✅ Speedup: ${speedup}x faster with parallelism\n`);

  // 2. Memory Benchmarks
  console.log('📊 Claude-Mem Benchmarks\n');

  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://ai_user:ai_password@localhost/ai_dev',
  });

  const memoryService = new MemoryService(
    dbPool,
    new OllamaEmbeddingProvider('http://localhost:11434', logger),
    logger
  );

  const session = await memoryService.createSession('benchmark', 86400);

  // Benchmark: Store documents
  const storeResult = await benchmark(
    'Store Document (with embedding)',
    async () => {
      await memoryService.store(`Document content ${Math.random()}`, session.id);
    },
    50
  );
  results.push(storeResult);
  console.log(`  Store: ${storeResult.avgTime.toFixed(2)}ms avg (${storeResult.throughput.toFixed(2)} docs/sec)\n`);

  // Benchmark: Search
  const searchResult = await benchmark(
    'Search (semantic similarity)',
    async () => {
      await memoryService.search({
        query: 'test search query',
        sessionId: session.id,
        limit: 10,
      });
    },
    50
  );
  results.push(searchResult);
  console.log(`  Search: ${searchResult.avgTime.toFixed(2)}ms avg (${searchResult.throughput.toFixed(2)} searches/sec)\n`);

  // 3. Skill Benchmarks
  console.log('📊 Taste-Skill Benchmarks\n');

  const skillRegistry = new SkillRegistry(logger);
  const skillExecutor = new SkillExecutor(skillRegistry, logger);

  skillRegistry.register(new TextProcessingSkill(logger));
  const skill = new TextProcessingSkill(logger);

  const skillResult = await benchmark(
    'Text Processing Skill',
    async () => {
      await skillExecutor.execute(skill.getMetadata().id, {
        text: 'hello world test',
        operation: 'uppercase',
      });
    },
    100
  );
  results.push(skillResult);
  console.log(`  Skill: ${skillResult.avgTime.toFixed(2)}ms avg (${skillResult.throughput.toFixed(2)} executions/sec)\n`);

  // 4. Notification Benchmarks
  console.log('📊 Laya Hub Benchmarks\n');

  const hub = new LayaHub(undefined, logger);
  hub.registerHandler('deliver-dashboard', async () => undefined);

  const eventResult = await benchmark(
    'Ingest Event',
    async () => {
      await hub.ingestEvent({
        source: 'test',
        type: 'benchmark',
        title: 'Test Event',
        description: 'Benchmark event',
        priority: 5,
        payload: {},
      });
    },
    100
  );
  results.push(eventResult);
  console.log(`  Event: ${eventResult.avgTime.toFixed(2)}ms avg (${eventResult.throughput.toFixed(2)} events/sec)\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📋 Benchmark Summary\n');

  console.log('Component          | Avg Time | Throughput');
  console.log('───────────────────|──────────|──────────');

  results.forEach((r) => {
    const throughputStr = r.throughput.toFixed(2);
    const timeStr = r.avgTime.toFixed(2);
    console.log(`${r.name.padEnd(18)} | ${timeStr.padStart(7)}ms | ${throughputStr.padStart(8)} ops/sec`);
  });

  console.log('\n✅ Benchmarks complete!\n');

  // Cleanup
  await memoryService.cleanup();
  await dbPool.end();
}

// Run benchmarks
runBenchmarks().catch((error) => {
  console.error('Benchmark failed:', error.message);
  process.exit(1);
});
