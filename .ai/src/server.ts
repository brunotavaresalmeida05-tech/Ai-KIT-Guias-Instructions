import 'dotenv/config';
import http from 'http';
import { buildApp } from './app';
import { createRuntime, Runtime } from './runtime';

export interface RunningServer {
  server: http.Server;
  runtime: Runtime;
}

export async function startServer(): Promise<RunningServer> {
  const runtime = await createRuntime();
  const app = buildApp(runtime);

  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(runtime.config.apiPort, runtime.config.apiHost, () => {
      server.off('error', reject);
      resolve();
    });
  });

  runtime.logger.info(
    {
      host: runtime.config.apiHost,
      port: runtime.config.apiPort,
      dashboard: `http://localhost:${runtime.config.apiPort}/dashboard`,
    },
    'AI-KIT API listening'
  );

  const shutdown = async (signal: string): Promise<void> => {
    runtime.logger.info({ signal }, 'Shutting down');
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await runtime.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  return { server, runtime };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
