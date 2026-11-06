// config/skills.config.ts
/**
 * Taste-Skill Framework Configuration
 */

export const skillsConfig = {
  // Registry settings
  registry: {
    autoDiscover: true,
    discoveryPath: './src/taste-skill/skills',
  },

  // Execution settings
  execution: {
    defaultTimeout: 30000,
    maxRetries: 3,
    retryBackoff: 'exponential',
    retryBaseDelay: 1000,
    concurrency: 10,
  },

  // Caching
  cache: {
    enabled: true,
    defaultTTL: 3600000, // 1 hour
    maxSize: 1000,
  },

  // Composition settings
  composition: {
    maxSteps: 50,
    maxDepth: 10,
    enableConditions: true,
    enableCallbacks: true,
  },

  // Built-in skills
  builtIn: {
    textProcessing: {
      enabled: true,
      timeout: 5000,
      cacheable: true,
    },
    dataValidation: {
      enabled: true,
      timeout: 5000,
      cacheable: true,
    },
    dataTransformation: {
      enabled: true,
      timeout: 10000,
      cacheable: true,
    },
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default skillsConfig;
