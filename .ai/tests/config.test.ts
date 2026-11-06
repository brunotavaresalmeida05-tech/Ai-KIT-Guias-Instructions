import path from 'path';
import { loadConfig } from '../src/config';

describe('config', () => {
  const original = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...original };
  });

  afterAll(() => {
    process.env = original;
  });

  it('uses defaults when env is empty', () => {
    delete process.env.NODE_ENV;
    delete process.env.API_HOST;
    delete process.env.API_PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.CORS_ORIGIN;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.MEMORY_BACKEND;
    delete process.env.MEMORY_PATH;
    delete process.env.SQLITE_PATH;
    delete process.env.DATABASE_URL;
    delete process.env.DATA_DIR;
    delete process.env.EMBEDDING_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_EMBEDDING_MODEL;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_EMBEDDING_MODEL;
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_FALLBACK;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.OLLAMA_LLM_MODEL;
    delete process.env.OTEL_ENABLED;
    delete process.env.SKILLS_DIR;

    const config = loadConfig();
    expect(config.nodeEnv).toBe('development');
    expect(config.apiPort).toBe(3000);
    expect(config.embeddingProvider).toBe('hash');
    expect(config.llmProvider).toBe('none');
    expect(config.memoryBackend).toBe('memory');
    expect(config.skillsDir).toContain('skills');
  });

  it('throws when openai embeddings are selected without an api key', () => {
    process.env.EMBEDDING_PROVIDER = 'openai';
    expect(() => loadConfig()).toThrow('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
  });

  it('throws when openai llm is selected without an api key', () => {
    process.env.LLM_PROVIDER = 'openai';
    expect(() => loadConfig()).toThrow('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  });

  it('throws when anthropic llm is selected without an api key', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
  });

  it('throws when postgres memory is selected without a database url', () => {
    process.env.MEMORY_BACKEND = 'postgres';
    expect(() => loadConfig()).toThrow('DATABASE_URL is required when MEMORY_BACKEND=postgres');
  });

  it('creates cors origins from comma separated values', () => {
    process.env.CORS_ORIGIN = 'http://example.com,http://app.test';
    const config = loadConfig();
    expect(config.corsOrigins).toEqual(['http://example.com', 'http://app.test']);
  });

  it('resolves skills and memory paths relative to cwd', () => {
    const config = loadConfig();
    expect(config.memoryPath.endsWith(path.join('data', 'memory.json'))).toBe(true);
    expect(config.dataDir.endsWith(path.join('data'))).toBe(true);
    expect(config.skillsDir.endsWith(path.join('skills'))).toBe(true);
  });

  it('loads fallback providers from a comma separated list', () => {
    process.env.LLM_PROVIDER = 'fallback';
    process.env.LLM_FALLBACK = 'anthropic, openai ';
    const config = loadConfig();
    expect(config.llmFallback).toEqual(['anthropic', 'openai']);
  });

  it('rejects invalid numeric port values', () => {
    process.env.API_PORT = '0';
    expect(() => loadConfig()).toThrow();
  });
});
