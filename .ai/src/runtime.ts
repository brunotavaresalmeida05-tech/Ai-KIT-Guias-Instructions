import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { AppConfig, loadConfig } from './config';
import { createLogger } from './logger';
import { createMemoryBackend } from './claude-mem/store/factory';
import { MemoryBackend } from './claude-mem/store/types';
import {
  DataTransformationSkill,
  DataValidationSkill,
  SkillExecutor,
  SkillRegistry,
  TextProcessingSkill,
} from './taste-skill/skill-framework';
import {
  LayaHub,
  LLMRouter,
  SimpleTextLLMRouter,
} from './laya/notification-hub';
import { Orchestrator } from './strix/orchestrator';
import { WorkflowService } from './workflows/service';
import { Metrics, metrics as defaultMetrics } from './observability/metrics';
import { createLLMProvider, LLMProvider } from './llm/providers';
import { ProviderLLMRouter } from './llm/router';
import {
  SkillEntry,
  ValidationReport,
  loadSkillCatalog,
  validateSkillCatalog,
} from './skills/catalog';

export interface Runtime {
  config: AppConfig;
  logger: pino.Logger;
  metrics: Metrics;
  memory: MemoryBackend;
  skills: SkillExecutor;
  skillRegistry: SkillRegistry;
  skillCatalog: SkillEntry[];
  skillReport: ValidationReport;
  events: LayaHub;
  orchestrator: Orchestrator;
  workflows: WorkflowService;
  llm: LLMProvider | null;
  close: () => Promise<void>;
}

function resolveAgentRegistry(): string | undefined {
  const candidates = [
    path.resolve(__dirname, '..', 'config', 'agent-registry.yml'),
    path.resolve(__dirname, '..', 'orchestrator', 'agent-registry.yml'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

export async function createRuntime(config: AppConfig = loadConfig()): Promise<Runtime> {
  const logger = createLogger('ai-kit', config.logLevel);
  const metrics = defaultMetrics;
  const memory = await createMemoryBackend(config, logger);

  const skillRegistry = new SkillRegistry(logger);
  skillRegistry.register(new TextProcessingSkill(logger));
  skillRegistry.register(new DataValidationSkill(logger));
  skillRegistry.register(new DataTransformationSkill(logger));
  const skills = new SkillExecutor(skillRegistry, logger);

  const skillCatalog = loadSkillCatalog(config.skillsDir);
  const schemaPath = path.join(config.skillsDir, '_framework', 'skill-schema.json');
  const skillReport = fs.existsSync(schemaPath)
    ? validateSkillCatalog(skillCatalog, schemaPath)
    : { total: skillCatalog.length, valid: 0, invalid: skillCatalog.length, issues: [] };

  if (skillReport.invalid > 0) {
    logger.warn(
      { invalid: skillReport.invalid, total: skillReport.total },
      'Some skills failed schema validation'
    );
  }

  const llm = createLLMProvider(
    {
      provider: config.llmProvider,
      openaiApiKey: config.openaiApiKey,
      openaiBaseUrl: config.openaiBaseUrl,
      openaiModel: config.llmModel,
      anthropicApiKey: config.anthropicApiKey,
      anthropicModel: config.anthropicModel,
      ollamaBaseUrl: config.ollamaBaseUrl,
      ollamaModel: config.ollamaLlmModel,
      fallbackOrder: config.llmFallback,
    },
    logger
  );

  const llmRouter: LLMRouter = llm
    ? new ProviderLLMRouter(llm, logger)
    : new SimpleTextLLMRouter(logger);

  const events = new LayaHub(llmRouter, logger);
  events.registerHandler('action-acknowledge', () => ({ acknowledged: true }));
  events.registerHandler('action-dismiss', () => ({ dismissed: true }));

  const orchestrator = new Orchestrator();
  const workflows = new WorkflowService({
    orchestrator,
    memory,
    skills,
    events,
    metrics,
    logger,
    agentRegistryPath: resolveAgentRegistry(),
  });

  logger.info(
    {
      backend: memory.kind,
      embedding: config.embeddingProvider,
      llm: llm?.name || 'none',
      skills: skillCatalog.length,
      skillsValid: skillReport.valid,
    },
    'Runtime initialized'
  );

  return {
    config,
    logger,
    metrics,
    memory,
    skills,
    skillRegistry,
    skillCatalog,
    skillReport,
    events,
    orchestrator,
    workflows,
    llm,
    close: async () => {
      await events.cleanup();
      await memory.close?.();
    },
  };
}
