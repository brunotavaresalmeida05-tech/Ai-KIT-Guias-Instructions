// tests/memory-service-internals.test.ts
/**
 * Claude-Mem MemoryService — document lifecycle paths
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import MemoryService, {
  OpenAIEmbeddingProvider,
  OllamaEmbeddingProvider,
} from '../src/claude-mem/memory-service';
import axios from 'axios';
import pino from 'pino';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const logger = pino({ level: 'silent' });

function mockPool(): Pool {
  return {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
  } as unknown as Pool;
}

function staticEmbeddings() {
  return {
    embed: jest.fn().mockResolvedValue(Array(384).fill(0.2)),
    embedBatch: jest.fn().mockResolvedValue([Array(384).fill(0.2)]),
  };
}

function memoryRow(id = 'doc-1') {
  return {
    id,
    session_id: 'sess-1',
    type: 'context',
    content: 'updated content',
    embedding: JSON.stringify([0.1, 0.2]),
    metadata: { tag: 'x' },
    created_at: new Date(),
    updated_at: new Date(),
    access_count: 1,
    last_accessed: new Date(),
    ttl: null,
  };
}

describe('MemoryService document lifecycle', () => {
  let pool: Pool;
  let service: MemoryService;

  beforeEach(async () => {
    pool = mockPool();
    service = new MemoryService(pool, staticEmbeddings() as any, logger);
    await service.init();
  });

  it('updates a document and returns it', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [memoryRow()] });

    const doc = await service.update('doc-1', 'updated content', { tag: 'x' });

    expect(doc.id).toBe('doc-1');
    expect(doc.content).toBe('updated content');
    expect(doc.embedding).toEqual([0.1, 0.2]);
  });

  it('throws when updating a missing document', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await expect(service.update('ghost', 'x')).rejects.toThrow('Document not found');
  });

  it('deletes a document', async () => {
    await service.delete('doc-1');

    const calls = (pool.query as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls.some((sql) => String(sql).includes('DELETE FROM memory_documents'))).toBe(true);
  });

  it('lists session documents with optional type filter', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [memoryRow()] });

    const docs = await service.getSessionDocuments('sess-1', 'context');

    expect(docs).toHaveLength(1);
    const sql = String((pool.query as jest.Mock).mock.calls.at(-1)![0]);
    expect(sql).toContain('AND type = $2');
  });

  it('rejects storing when the database fails', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('insert failed'));
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

    await expect(service.store('x', 'sess-1')).rejects.toThrow('insert failed');
  });

  it('rejects search when embedding generation fails', async () => {
    const failing = {
      embed: jest.fn().mockRejectedValue(new Error('embed down')),
      embedBatch: jest.fn(),
    };
    const svc = new MemoryService(pool, failing as any, logger);

    await expect(svc.search({ query: 'x' })).rejects.toThrow('embed down');
  });

  it('reports stats with zero values', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ avg: null }] });

    const stats = await service.getStats();

    expect(stats.totalSessions).toBe('0');
    expect(stats.averageAccessCount).toBe(0);
  });

  it('cleans up gc interval and pool', async () => {
    await service.cleanup();
    expect((pool.end as jest.Mock)).toHaveBeenCalled();
  });
});

describe('Embedding providers (axios)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('OpenAIEmbeddingProvider embeds and caches single text', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: [{ embedding: [1, 2, 3] }] },
    });

    const provider = new OpenAIEmbeddingProvider('key', logger);
    const first = await provider.embed('hello');
    const second = await provider.embed('hello');

    expect(first).toEqual([1, 2, 3]);
    expect(second).toEqual([1, 2, 3]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('OpenAIEmbeddingProvider batches uncached texts', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: [{ embedding: [1] }, { embedding: [2] }] },
    });

    const provider = new OpenAIEmbeddingProvider('key', logger);
    const results = await provider.embedBatch(['a', 'b']);

    expect(results).toEqual([[1], [2]]);

    const cached = await provider.embedBatch(['a', 'b']);
    expect(cached).toEqual([[1], [2]]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('OpenAIEmbeddingProvider surfaces API errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('quota exceeded'));

    const provider = new OpenAIEmbeddingProvider('key', logger);
    await expect(provider.embed('boom')).rejects.toThrow('quota exceeded');
  });

  it('OllamaEmbeddingProvider embeds and caches', async () => {
    mockedAxios.post.mockResolvedValue({ data: { embedding: [0.5, 0.5] } });

    const provider = new OllamaEmbeddingProvider('http://localhost:11434', logger);
    const vector = await provider.embed('local');
    const again = await provider.embed('local');

    expect(vector).toEqual([0.5, 0.5]);
    expect(again).toEqual([0.5, 0.5]);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    const batched = await provider.embedBatch(['local', 'new']);
    expect(batched).toHaveLength(2);
  });

  it('OllamaEmbeddingProvider surfaces API errors', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('connection refused'));

    const provider = new OllamaEmbeddingProvider('http://localhost:11434', logger);
    await expect(provider.embed('x')).rejects.toThrow('connection refused');
  });
});
