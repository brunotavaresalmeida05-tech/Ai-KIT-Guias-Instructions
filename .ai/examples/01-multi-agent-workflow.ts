// examples/01-multi-agent-workflow.ts
/**
 * Example 1: Multi-Agent Code Review Workflow
 *
 * Demonstrates:
 * - Multi-agent orchestration with Strix
 * - Skill composition for data processing
 * - Memory persistence with Claude-Mem
 * - Notification routing with Laya Hub
 */

import Orchestrator from '../src/strix/orchestrator';
import MemoryService, { OllamaEmbeddingProvider } from '../src/claude-mem/memory-service';
import {
  SkillRegistry,
  SkillExecutor,
  SkillComposer,
  TextProcessingSkill,
  DataValidationSkill,
} from '../src/taste-skill/skill-framework';
import LayaHub from '../src/laya/notification-hub';
import { Pool } from 'pg';
import pino from 'pino';

const logger = pino();

/**
 * Workflow: Code Review Pipeline
 *
 * 1. Code Analyzer Agent - Parses and analyzes code
 * 2. Security Scanner Agent - Checks for vulnerabilities
 * 3. Performance Reviewer Agent - Analyzes performance issues
 * 4. Coordinator Agent - Aggregates results
 */
async function runCodeReviewWorkflow() {
  // Initialize components
  const orchestrator = new Orchestrator();
  const notificationHub = new LayaHub(undefined, logger);
  const skillRegistry = new SkillRegistry(logger);
  const skillExecutor = new SkillExecutor(skillRegistry, logger);

  // Setup database and memory
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost/ai_dev',
  });

  const memoryService = new MemoryService(
    dbPool,
    new OllamaEmbeddingProvider('http://localhost:11434', logger),
    logger
  );

  // Create session for this workflow
  const session = await memoryService.createSession('code-review-system', 86400);

  console.log('🚀 Starting Code Review Workflow');
  console.log(`📝 Session ID: ${session.id}`);

  // Register agents
  const codeAnalyzer = orchestrator.registerAgent({
    name: 'CodeAnalyzer',
    type: 'specialist',
    skills: ['ast-parsing', 'code-analysis'],
    status: 'idle',
    capabilities: {
      languages: ['javascript', 'typescript', 'python'],
      maxFileSize: 50000,
    },
    maxConcurrent: 3,
  });

  const securityScanner = orchestrator.registerAgent({
    name: 'SecurityScanner',
    type: 'specialist',
    skills: ['security-scan', 'vulnerability-detection'],
    status: 'idle',
    capabilities: {
      owasp: true,
      cwe: true,
    },
    maxConcurrent: 2,
  });

  const performanceReviewer = orchestrator.registerAgent({
    name: 'PerformanceReviewer',
    type: 'specialist',
    skills: ['performance-analysis', 'benchmarking'],
    status: 'idle',
    capabilities: {
      profiling: true,
      metrics: true,
    },
    maxConcurrent: 2,
  });

  const coordinator = orchestrator.registerAgent({
    name: 'ReviewCoordinator',
    type: 'coordinator',
    skills: ['aggregation', 'reporting'],
    status: 'idle',
    capabilities: {
      reporting: true,
    },
    maxConcurrent: 1,
  });

  // Register skills
  skillRegistry.register(new TextProcessingSkill(logger));
  skillRegistry.register(new DataValidationSkill(logger));

  // Register task handlers
  orchestrator.registerHandler('analyze-code', async (payload) => {
    const lines = payload.code.split('\n').length;
    const complexity = Math.random() * 10; // Simplified

    return {
      success: true,
      data: {
        lines,
        complexity,
        functions: Math.floor(lines / 20),
        comments: Math.floor(lines / 50),
      },
    };
  });

  orchestrator.registerHandler('scan-security', async (payload) => {
    const issues = Math.floor(Math.random() * 5);

    return {
      success: true,
      data: {
        vulnerabilities: issues,
        severity: issues > 3 ? 'HIGH' : 'LOW',
        owasp: {
          'A03': issues % 2 === 0,
          'A05': issues % 3 === 0,
        },
      },
    };
  });

  orchestrator.registerHandler('review-performance', async (payload) => {
    return {
      success: true,
      data: {
        avgResponseTime: `${Math.random() * 500 + 50}ms`,
        memoryUsage: `${Math.random() * 100 + 50}MB`,
        suggestions: ['Add caching', 'Optimize loops'],
      },
    };
  });

  orchestrator.registerHandler('aggregate-review', async (payload, context) => {
    const outputs = context.previousResults;

    return {
      success: true,
      data: {
        summary: 'Code review completed',
        analysis: outputs.get('code-analysis'),
        security: outputs.get('security-scan'),
        performance: outputs.get('performance-review'),
        recommendedActions: [
          'Fix security issues',
          'Optimize hot paths',
          'Add more tests',
        ],
      },
    };
  });

  // Register notification handlers
  notificationHub.registerHandler('deliver-dashboard', async (event, card) => {
    console.log(`📊 Dashboard: ${event.title}`);
    console.log(`   Priority: ${event.priority}`);
    console.log(`   Actions: ${card.actions.map((a) => a.label).join(', ')}`);
  });

  notificationHub.registerHandler('deliver-slack', async (event, card) => {
    console.log(`💬 Slack: ${event.title}`);
    console.log(`   Channel: #code-reviews`);
  });

  // Define code review workflow
  const codeReviewWorkflow = {
    name: 'CodeReviewPipeline',
    strategy: 'hybrid' as const,
    tasks: [
      {
        name: 'code-analysis',
        type: 'analyze-code',
        payload: {
          code: `
function calculateSum(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}`,
        },
        priority: 8,
        requiredSkills: ['ast-parsing'],
      },
      {
        name: 'security-scan',
        type: 'scan-security',
        payload: {
          code: 'provided',
        },
        priority: 9,
        requiredSkills: ['security-scan'],
      },
      {
        name: 'performance-review',
        type: 'review-performance',
        payload: {
          metrics: true,
        },
        priority: 7,
        requiredSkills: ['performance-analysis'],
        dependencies: ['code-analysis'], // Wait for code analysis
      },
      {
        name: 'aggregate-results',
        type: 'aggregate-review',
        payload: {},
        priority: 6,
        requiredSkills: ['aggregation'],
        dependencies: ['security-scan', 'performance-review'],
      },
    ],
  };

  // Execute workflow
  console.log('\n⚙️  Executing workflow...\n');

  const result = await orchestrator.executeWorkflow(codeReviewWorkflow);

  console.log('\n✅ Workflow complete!\n');
  console.log('📋 Results:', JSON.stringify(result.result, null, 2));

  // Store results in memory
  console.log('\n💾 Storing results in memory...');

  await memoryService.store(
    JSON.stringify(result.result),
    session.id,
    'result',
    {
      workflowId: result.id,
      timestamp: new Date(),
    }
  );

  // Send notification
  console.log('\n📬 Routing notifications...\n');

  await notificationHub.ingestEvent({
    source: 'workflow',
    type: 'code-review-complete',
    title: 'Code Review Completed',
    description: `Analysis of ${codeReviewWorkflow.name} complete`,
    payload: result.result,
    priority: 7,
    metadata: {
      workflowId: result.id,
      sessionId: session.id,
    },
  });

  // Query memory
  console.log('\n🔍 Searching memory...\n');

  const searchResults = await memoryService.search({
    query: 'code review results',
    sessionId: session.id,
    limit: 5,
  });

  console.log(`Found ${searchResults.length} relevant memories`);
  searchResults.forEach((r, idx) => {
    console.log(`  ${idx + 1}. (${(r.similarity * 100).toFixed(1)}% match) ${r.document.type}`);
  });

  // Get orchestrator health
  console.log('\n❤️  Orchestrator Health:');
  const health = orchestrator.getHealth();
  console.log(`  Total Agents: ${health.agents.totalAgents}`);
  console.log(`  Idle Agents: ${health.agents.idleAgents}`);
  console.log(`  Used Capacity: ${health.agents.usedCapacity}/${health.agents.totalCapacity}`);

  // Cleanup
  await memoryService.cleanup();
  await dbPool.end();

  console.log('\n🏁 Workflow demo complete!\n');
}

// Run workflow
runCodeReviewWorkflow().catch((error) => {
  logger.error({ error: error.message }, 'Workflow failed');
  process.exit(1);
});
