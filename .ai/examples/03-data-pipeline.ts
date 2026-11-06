// examples/03-data-pipeline.ts
/**
 * Example 3: Skill-Based Data Pipeline
 *
 * Demonstrates:
 * - Complex skill composition
 * - Data transformation pipeline
 * - Conditional execution based on validation
 * - Memory persistence of pipeline results
 * - Error handling in workflows
 */

import {
  SkillRegistry,
  SkillExecutor,
  SkillComposer,
  TextProcessingSkill,
  DataValidationSkill,
  DataTransformationSkill,
  Skill,
  SkillInput,
  SkillOutput,
} from '../src/taste-skill/skill-framework';
import MemoryService, { OllamaEmbeddingProvider } from '../src/claude-mem/memory-service';
import { Pool } from 'pg';
import pino from 'pino';

const logger = pino();

/**
 * Custom Skills for Data Pipeline
 */

class CSVParsingSkill extends Skill {
  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { csvData } = input;

      if (!csvData || typeof csvData !== 'string') {
        return { success: false, error: 'Invalid CSV data' };
      }

      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, any> = {};

        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = isNaN(Number(values[j])) ? values[j] : Number(values[j]);
        }

        rows.push(row);
      }

      return {
        success: true,
        data: {
          headers,
          rows,
          rowCount: rows.length,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

class DataAggregationSkill extends Skill {
  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { data, groupBy, aggregation } = input;

      if (!Array.isArray(data) || !groupBy) {
        return { success: false, error: 'Invalid input' };
      }

      const grouped: Record<string, any[]> = {};

      for (const row of data) {
        const key = row[groupBy];
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(row);
      }

      const results: Record<string, any> = {};

      for (const [key, rows] of Object.entries(grouped)) {
        if (aggregation === 'count') {
          results[key] = rows.length;
        } else if (aggregation === 'sum') {
          results[key] = rows.reduce((sum, r) => sum + (r.value || 0), 0);
        } else if (aggregation === 'average') {
          const sum = rows.reduce((s, r) => s + (r.value || 0), 0);
          results[key] = sum / rows.length;
        }
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

class DataEnrichmentSkill extends Skill {
  async execute(input: SkillInput): Promise<SkillOutput> {
    try {
      const { data } = input;

      if (!Array.isArray(data)) {
        return { success: false, error: 'Data must be an array' };
      }

      const enriched = data.map((row) => ({
        ...row,
        _enriched: true,
        _timestamp: new Date().toISOString(),
        _hash: Math.random().toString(36).substring(7),
        _score: Math.random() * 100,
      }));

      return {
        success: true,
        data: enriched,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

async function runDataPipelineDemo() {
  console.log('🚀 Starting Data Pipeline Demonstration\n');

  // Initialize components
  const skillRegistry = new SkillRegistry(logger);
  const skillExecutor = new SkillExecutor(skillRegistry, logger);
  const skillComposer = new SkillComposer(skillExecutor, logger);

  // Setup database and memory
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost/ai_dev',
  });

  const memoryService = new MemoryService(
    dbPool,
    new OllamaEmbeddingProvider('http://localhost:11434', logger),
    logger
  );

  const session = await memoryService.createSession('data-pipeline', 86400);

  console.log(`📝 Session: ${session.id}\n`);

  // Register skills
  console.log('📚 Registering skills...\n');

  const csvSkill = new CSVParsingSkill(
    {
      name: 'CSVParsing',
      description: 'Parse CSV data into structured format',
      tags: ['data', 'parsing'],
      providedCapabilities: ['csv-parsing'],
      cacheable: true,
      handler: async (input) => csvSkill.execute(input),
    },
    logger
  );

  const textSkill = new TextProcessingSkill(logger);
  const validationSkill = new DataValidationSkill(logger);
  const transformSkill = new DataTransformationSkill(logger);
  const aggregationSkill = new DataAggregationSkill(
    {
      name: 'DataAggregation',
      description: 'Aggregate data by group',
      tags: ['data', 'aggregation'],
      providedCapabilities: ['data-aggregation'],
      handler: async (input) => aggregationSkill.execute(input),
    },
    logger
  );

  const enrichmentSkill = new DataEnrichmentSkill(
    {
      name: 'DataEnrichment',
      description: 'Enrich data with additional fields',
      tags: ['data', 'enrichment'],
      providedCapabilities: ['data-enrichment'],
      handler: async (input) => enrichmentSkill.execute(input),
    },
    logger
  );

  skillRegistry.register(csvSkill);
  skillRegistry.register(textSkill);
  skillRegistry.register(validationSkill);
  skillRegistry.register(transformSkill);
  skillRegistry.register(aggregationSkill);
  skillRegistry.register(enrichmentSkill);

  console.log('✅ 6 skills registered\n');

  // Sample data
  const sampleCSV = `name,category,value,status
Alice,Engineering,95000,active
Bob,Sales,85000,active
Charlie,Engineering,92000,active
Diana,Marketing,80000,inactive
Eve,Sales,88000,active`;

  console.log('📊 Sample Data:\n');
  console.log(sampleCSV);
  console.log('\n');

  // Define pipeline composition
  console.log('⚙️  Defining pipeline...\n');

  const pipeline = skillComposer.defineComposition(
    'DataProcessingPipeline',
    'Parse, validate, aggregate, and enrich employee data',
    [
      {
        skillId: csvSkill.getMetadata().id,
        input: { csvData: sampleCSV },
      },
      {
        skillId: validationSkill.getMetadata().id,
        input: {
          data: { $ref: 'previous.data.rows' },
          schema: {
            name: { required: true, type: 'string' },
            category: { required: true, type: 'string' },
            value: { required: true, type: 'number' },
          },
        },
        onSuccess: (output, context) => {
          console.log(`✅ Step ${context.stepIndex}: Validation passed`);
        },
        onError: (error, context) => {
          console.error(`❌ Step ${context.stepIndex}: ${error.message}`);
        },
      },
      {
        skillId: aggregationSkill.getMetadata().id,
        input: {
          data: { $ref: 'previous.data.rows' },
          groupBy: 'category',
          aggregation: 'average',
        },
      },
      {
        skillId: enrichmentSkill.getMetadata().id,
        input: {
          data: { $ref: 'previous.data.rows' },
        },
      },
      {
        skillId: transformSkill.getMetadata().id,
        input: {
          data: { $ref: 'previous.data' },
          transform: 'flatten',
        },
      },
    ]
  );

  console.log(`Pipeline: ${pipeline.name}`);
  console.log(`Steps: ${pipeline.steps.length}\n`);

  // Execute pipeline
  console.log('🏃 Executing pipeline...\n');
  console.log('───────────────────────────────────────────────────────\n');

  const result = await skillComposer.executeComposition(pipeline, {});

  console.log('\n───────────────────────────────────────────────────────\n');

  if (result.success) {
    console.log('✅ Pipeline executed successfully!\n');

    console.log('📊 Pipeline Results:\n');

    result.data.forEach((stepResult, idx) => {
      console.log(`Step ${idx + 1}:`);

      if (stepResult.success) {
        const dataStr = JSON.stringify(stepResult.data, null, 2);
        if (dataStr.length > 200) {
          console.log(dataStr.substring(0, 200) + '...');
        } else {
          console.log(dataStr);
        }
      } else {
        console.log(`❌ Error: ${stepResult.error}`);
      }

      console.log();
    });

    // Store results in memory
    console.log('💾 Storing results in memory...\n');

    for (let i = 0; i < result.data.length; i++) {
      const stepResult = result.data[i];

      if (stepResult.success) {
        await memoryService.store(
          JSON.stringify(stepResult.data),
          session.id,
          'result',
          {
            pipelineId: pipeline.id,
            step: i,
            timestamp: new Date(),
          }
        );

        console.log(`✅ Step ${i + 1} results stored`);
      }
    }

    // Search memory
    console.log('\n🔍 Searching stored results...\n');

    const searchResults = await memoryService.search({
      query: 'employee data aggregation',
      sessionId: session.id,
      limit: 5,
    });

    console.log(`Found ${searchResults.length} relevant results:`);
    searchResults.forEach((r, idx) => {
      console.log(
        `  ${idx + 1}. ${r.document.metadata.step ? `Step ${r.document.metadata.step}` : 'Result'} (${(r.similarity * 100).toFixed(1)}% match)`
      );
    });

    // Statistics
    console.log('\n📈 Pipeline Statistics:\n');

    const stats = await memoryService.getStats();
    console.log(`Total stored memories: ${stats.totalDocuments}`);
    console.log(`Active sessions: ${stats.activeSessions}`);
    console.log(`Average access count: ${stats.averageAccessCount.toFixed(1)}`);

    // Skill registry info
    console.log('\n🎯 Skill Registry:\n');

    const allSkills = skillRegistry.getAllSkills();
    console.log(`Total skills: ${allSkills.length}`);

    const dataSkills = skillRegistry.getSkillsByTag('data');
    console.log(`Data processing skills: ${dataSkills.length}`);
    console.log(`  - ${dataSkills.map((s) => s.getMetadata().name).join('\n  - ')}`);
  } else {
    console.log(`❌ Pipeline failed: ${result.error}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...\n');

  await memoryService.cleanup();
  await dbPool.end();

  console.log('✅ Data pipeline demo complete!\n');
}

// Run demo
runDataPipelineDemo().catch((error) => {
  logger.error({ error: error.message }, 'Data pipeline demo failed');
  process.exit(1);
});
