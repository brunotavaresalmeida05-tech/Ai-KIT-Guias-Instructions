import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Pool } from 'pg';
import pino from 'pino';
import { loadConfig } from '../src/config';
import { HashEmbeddingProvider } from '../src/claude-mem/embeddings';
import { MemoryService } from '../src/claude-mem/memory-service';
import { createMemoryBackend } from '../src/claude-mem/store/factory';
import { PostgresBackend } from '../src/claude-mem/store/postgres-store';

jest.mock('pg', () => ({ Pool: jest.fn() }));
const logger = pino({ level: 'silent' });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('PostgreSQL startup and shutdown', () => {
  let query: ReturnType<typeof jest.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>>;
  let end: ReturnType<typeof jest.fn<() => Promise<void>>>;
  let pool: Pool;

  beforeEach(() => {
    jest.useFakeTimers();
    query = jest.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>()
      .mockResolvedValue({ rows: [] });
    end = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    pool = { query, end } as unknown as Pool;
    (Pool as unknown as ReturnType<typeof jest.fn>).mockImplementation(() => pool);
  });

  afterEach(() => { jest.useRealTimers(); });

  it('does not perform I/O in the constructor and waits for schema before operations', async () => {
    let ready!: () => void;
    query.mockImplementationOnce(() => new Promise((resolve) => { ready = () => resolve({ rows: [] }); }));
    const service = new MemoryService(pool, new HashEmbeddingProvider(), logger);
    expect(query).not.toHaveBeenCalled();
    const creating = service.createSession();
    await flush();
    expect(query).toHaveBeenCalledTimes(1);
    ready();
    await creating;
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('INSERT INTO sessions');
    await service.cleanup();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('shares pending initialization and closes exactly once without starting GC after close', async () => {
    let ready!: () => void;
    query.mockImplementationOnce(() => new Promise((resolve) => { ready = () => resolve({ rows: [] }); }));
    const backend = new PostgresBackend(new MemoryService(pool, new HashEmbeddingProvider(), logger));
    const first = backend.init();
    const second = backend.init();
    await flush();
    let initialized = false;
    void first.then(() => { initialized = true; });
    await flush();
    expect(initialized).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    const closing = backend.close();
    ready();
    await Promise.all([first, second, closing, backend.close()]);
    expect(end).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    await expect(backend.createSession()).rejects.toThrow('closed');
  });

  it('does not return a factory backend until PostgreSQL initialization succeeds', async () => {
    let ready!: () => void;
    query.mockImplementationOnce(() => new Promise((resolve) => { ready = () => resolve({ rows: [] }); }));
    let returned = false;
    const creating = createMemoryBackend(loadConfig({ MEMORY_BACKEND: 'postgres', DATABASE_URL: 'postgresql://test/db' }), logger);
    void creating.then(() => { returned = true; });
    await flush();
    expect(returned).toBe(false);
    ready();
    const backend = await creating;
    expect(backend.kind).toBe('postgres');
    await backend.close?.();
  });

  it('propagates schema failure and closes the pool instead of returning a broken backend', async () => {
    query.mockRejectedValueOnce(new Error('extension vector unavailable'));
    await expect(createMemoryBackend(loadConfig({ MEMORY_BACKEND: 'postgres', DATABASE_URL: 'postgresql://test/db' }), logger))
      .rejects.toThrow('extension vector unavailable');
    expect(end).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
