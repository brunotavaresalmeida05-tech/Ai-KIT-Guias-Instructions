import pino from 'pino';
import { Pool } from 'pg';
import { AppConfig } from '../../config';
import { MemoryService } from '../memory-service';
import { createEmbeddingProvider } from '../embeddings';
import { InMemoryBackend } from './memory-store';
import { JsonFileBackend } from './json-store';
import { SqliteBackend } from './sqlite-store';
import { PostgresBackend } from './postgres-store';
import { MemoryBackend } from './types';

export async function createMemoryBackend(
  config: AppConfig,
  logger: pino.Logger
): Promise<MemoryBackend> {
  const embedding = createEmbeddingProvider(
    {
      provider: config.embeddingProvider,
      openaiApiKey: config.openaiApiKey,
      ollamaBaseUrl: config.ollamaBaseUrl,
    },
    logger
  );

  let backend: MemoryBackend;

  switch (config.memoryBackend) {
    case 'json':
      backend = new JsonFileBackend(config.memoryPath, embedding, logger);
      break;
    case 'sqlite':
      backend = new SqliteBackend(config.sqlitePath, embedding, logger);
      break;
    case 'postgres': {
      const pool = new Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
      backend = new PostgresBackend(new MemoryService(pool, embedding, logger));
      break;
    }
    case 'memory':
    default:
      backend = new InMemoryBackend(embedding, logger);
      break;
  }

  try {
    await backend.init();
    return backend;
  } catch (error) {
    try {
      await backend.close?.();
    } catch (closeError) {
      logger.warn({ error: (closeError as Error).message }, 'Failed to close backend after initialization failure');
    }
    throw error;
  }
}

export { MemoryBackend } from './types';
