import path from 'path';
import { z } from 'zod';

const booleanFromEnv = z
  .string()
  .optional()
  .transform((value) => value === 'true' || value === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  API_KEY: z.string().trim().optional().transform((value) => value || undefined),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // External rate limit server (Python FastAPI service)
  RATE_LIMIT_SERVER_URL: z.string().optional(),
  ENABLE_EXTERNAL_RATE_LIMIT: booleanFromEnv,

  MEMORY_BACKEND: z.enum(['memory', 'json', 'sqlite', 'postgres']).default('memory'),
  MEMORY_PATH: z.string().default('data/memory.json'),
  SQLITE_PATH: z.string().default('data/memory.db'),
  DATABASE_URL: z.string().optional(),
  DATA_DIR: z.string().default('data'),

  EMBEDDING_PROVIDER: z.enum(['hash', 'openai', 'ollama', 'fallback']).default('hash'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),

  LLM_PROVIDER: z.enum(['none', 'openai', 'anthropic', 'ollama', 'fallback']).default('none'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_FALLBACK: z.string().default('openai,anthropic,ollama'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-latest'),
  OLLAMA_LLM_MODEL: z.string().default('mistral'),

  OTEL_ENABLED: booleanFromEnv,
  SKILLS_DIR: z.string().optional(),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  apiHost: string;
  apiPort: number;
  logLevel: string;
  apiKey?: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  enableExternalRateLimit: boolean;
  rateLimitServerUrl?: string;
  memoryBackend: 'memory' | 'json' | 'sqlite' | 'postgres';
  memoryPath: string;
  sqlitePath: string;
  databaseUrl?: string;
  dataDir: string;
  embeddingProvider: 'hash' | 'openai' | 'ollama' | 'fallback';
  openaiApiKey?: string;
  openaiBaseUrl: string;
  openaiEmbeddingModel: string;
  ollamaBaseUrl: string;
  ollamaEmbeddingModel: string;
  llmProvider: 'none' | 'openai' | 'anthropic' | 'ollama' | 'fallback';
  llmModel: string;
  llmFallback: string[];
  anthropicApiKey?: string;
  anthropicModel: string;
  ollamaLlmModel: string;
  otelEnabled: boolean;
  skillsDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }

  const data = parsed.data;
  const cwd = process.cwd();

  if (data.NODE_ENV === 'production') {
    if (!data.API_KEY || data.API_KEY.length < 32) {
      throw new Error('API_KEY must contain at least 32 characters in production');
    }
    if (data.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
      throw new Error('CORS_ORIGIN must use explicit origins in production');
    }
  }

  if (data.EMBEDDING_PROVIDER === 'openai' && !data.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
  }
  if (data.LLM_PROVIDER === 'openai' && !data.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  }
  if (data.LLM_PROVIDER === 'anthropic' && !data.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
  }
  if (data.MEMORY_BACKEND === 'postgres' && !data.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when MEMORY_BACKEND=postgres');
  }

  return {
    nodeEnv: data.NODE_ENV,
    apiHost: data.API_HOST,
    apiPort: data.API_PORT,
    logLevel: data.LOG_LEVEL,
    apiKey: data.API_KEY,
    corsOrigins: data.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: data.RATE_LIMIT_MAX,
    enableExternalRateLimit: data.ENABLE_EXTERNAL_RATE_LIMIT || false,
    rateLimitServerUrl: data.RATE_LIMIT_SERVER_URL,
    memoryBackend: data.MEMORY_BACKEND,
    memoryPath: path.resolve(cwd, data.MEMORY_PATH),
    sqlitePath: path.resolve(cwd, data.SQLITE_PATH),
    databaseUrl: data.DATABASE_URL,
    dataDir: path.resolve(cwd, data.DATA_DIR),
    embeddingProvider: data.EMBEDDING_PROVIDER,
    openaiApiKey: data.OPENAI_API_KEY,
    openaiBaseUrl: data.OPENAI_BASE_URL,
    openaiEmbeddingModel: data.OPENAI_EMBEDDING_MODEL,
    ollamaBaseUrl: data.OLLAMA_BASE_URL,
    ollamaEmbeddingModel: data.OLLAMA_EMBEDDING_MODEL,
    llmProvider: data.LLM_PROVIDER,
    llmModel: data.LLM_MODEL,
    llmFallback: data.LLM_FALLBACK.split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    anthropicApiKey: data.ANTHROPIC_API_KEY,
    anthropicModel: data.ANTHROPIC_MODEL,
    ollamaLlmModel: data.OLLAMA_LLM_MODEL,
    otelEnabled: data.OTEL_ENABLED,
    skillsDir: data.SKILLS_DIR
      ? path.resolve(cwd, data.SKILLS_DIR)
      : path.resolve(__dirname, '..', 'skills'),
  };
}
