// config/memory.config.ts
/**
 * Claude-Mem Configuration
 */

export const memoryConfig = {
  // Database settings
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'ai_user',
    password: process.env.DB_PASSWORD || 'ai_password',
    database: process.env.DB_NAME || 'ai_dev',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    },
  },

  // Embedding settings
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || 'ollama',
    dimension: 384, // nomic-embed-text dimension

    // OpenAI settings
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'text-embedding-3-small',
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
    },

    // Ollama settings
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'nomic-embed-text',
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
    },

    // Cache settings
    cache: {
      enabled: true,
      maxSize: 10000,
    },
  },

  // Storage settings
  storage: {
    bufferSize: parseInt(process.env.MEMORY_BUFFER_SIZE || '10', 10),
    bufferInterval: parseInt(process.env.MEMORY_BUFFER_INTERVAL || '1000', 10),
    sessionTTL: parseInt(process.env.MEMORY_SESSION_TTL || '604800', 10), // 7 days
    documentTTL: parseInt(process.env.MEMORY_DOCUMENT_TTL || '2592000', 10), // 30 days
  },

  // Garbage collection
  gc: {
    enabled: true,
    interval: parseInt(process.env.MEMORY_GC_INTERVAL || '60000', 10),
  },

  // Search settings
  search: {
    similarity: {
      threshold: 0.5,
      metric: 'cosine',
    },
    limit: 10,
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default memoryConfig;
