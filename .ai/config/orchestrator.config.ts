// config/orchestrator.config.ts
/**
 * Strix Orchestrator Configuration
 */

export const orchestratorConfig = {
  // Worker pool settings
  maxWorkers: parseInt(process.env.STRIX_MAX_WORKERS || '10', 10),
  maxConcurrent: 5,

  // Task execution settings
  taskTimeout: parseInt(process.env.STRIX_TASK_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.STRIX_RETRY_MAX || '3', 10),
  retryBackoff: process.env.STRIX_RETRY_BACKOFF || 'exponential',
  retryBaseDelay: 1000, // ms
  retryMaxDelay: 60000, // ms

  // Queue settings
  queueSize: 1000,
  priorityLevels: 10,

  // Monitoring
  enableMetrics: true,
  metricsInterval: 5000,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default orchestratorConfig;
