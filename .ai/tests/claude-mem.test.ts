// tests/claude-mem.test.ts
/**
 * Claude-Mem Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Pool } from 'pg';
import MemoryService, {
  OpenAIEmbeddingProvider,
  OllamaEmbeddingProvider,
  VectorMath,
} from '../src/claude-mem/memory-service';
import pino from 'pino';

// Mock PostgreSQL Pool
const mockPool = {
  query: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

describe('Claude-Mem Memory Service', () => {
  let memoryService: MemoryService;
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    (mockPool.query as jest.Mock).mockClear();
  });

  describe('Session Management', () => {
    it('should create a session', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      memoryService = new MemoryService(
        mockPool,
        new OllamaEmbeddingProvider('http://localhost:11434', logger),
        logger
      );

      const session = await memoryService.createSession('user-123', 86400);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.ttl).toBe(86400);
    });

    it('should track active sessions', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      memoryService = new MemoryService(
        mockPool,
        new OllamaEmbeddingProvider('http://localhost:11434', logger),
        logger
      );

      await memoryService.createSession('user-1');
      await memoryService.createSession('user-2');

      expect((mockPool.query as jest.Mock).mock.calls.length).toBeGreaterThan(2);
    });
  });

  describe('Document Storage', () => {
    it('should store a document with embedding', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const embeddingProvider = {
        embed: jest.fn().mockResolvedValue(Array(384).fill(0.1)),
        embedBatch: jest.fn(),
      };

      memoryService = new MemoryService(
        mockPool,
        embeddingProvider as any,
        logger
      );

      const session = await memoryService.createSession('user-123');

      const doc = await memoryService.store(
        'This is test content',
        session.id,
        'context',
        { source: 'test' }
      );

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.content).toBe('This is test content');
      expect(doc.type).toBe('context');
      expect(doc.embedding).toBeDefined();
    });

    it('should store documents with different types', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const embeddingProvider = {
        embed: jest.fn().mockResolvedValue(Array(384).fill(0.1)),
        embedBatch: jest.fn(),
      };

      memoryService = new MemoryService(
        mockPool,
        embeddingProvider as any,
        logger
      );

      const session = await memoryService.createSession();

      const contextDoc = await memoryService.store(
        'Context content',
        session.id,
        'context'
      );
      const feedbackDoc = await memoryService.store(
        'Feedback content',
        session.id,
        'feedback'
      );

      expect(contextDoc.type).toBe('context');
      expect(feedbackDoc.type).toBe('feedback');
    });
  });

  describe('Semantic Search', () => {
    it('should search documents by similarity', async () => {
      const mockEmbedding = Array(384).fill(0.1);

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'doc-1',
            session_id: 'session-1',
            type: 'context',
            content: 'Test content',
            embedding: JSON.stringify(mockEmbedding),
            metadata: {},
            created_at: new Date(),
            updated_at: new Date(),
            access_count: 5,
            last_accessed: new Date(),
            similarity: 0.95,
          },
        ],
      });

      const embeddingProvider = {
        embed: jest.fn().mockResolvedValue(mockEmbedding),
        embedBatch: jest.fn(),
      };

      memoryService = new MemoryService(
        mockPool,
        embeddingProvider as any,
        logger
      );

      const results = await memoryService.search({
        query: 'test query',
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.95);
      expect(results[0].document.content).toBe('Test content');
    });

    it('should filter search by type', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const embeddingProvider = {
        embed: jest.fn().mockResolvedValue(Array(384).fill(0.1)),
        embedBatch: jest.fn(),
      };

      memoryService = new MemoryService(
        mockPool,
        embeddingProvider as any,
        logger
      );

      await memoryService.search({
        query: 'test',
        type: 'feedback',
        limit: 5,
      });

      const lastCall = (mockPool.query as jest.Mock).mock.calls[
        (mockPool.query as jest.Mock).mock.calls.length - 1
      ][0];

      expect(lastCall).toContain('type');
    });
  });

  describe('Vector Math', () => {
    it('should calculate cosine similarity', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      const similarity = VectorMath.cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(1.0);
    });

    it('should calculate orthogonal vectors as 0 similarity', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const similarity = VectorMath.cosineSimilarity(a, b);
      expect(similarity).toBeCloseTo(0.0);
    });

    it('should calculate L2 distance', () => {
      const a = [0, 0];
      const b = [3, 4];
      const distance = VectorMath.l2Distance(a, b);
      expect(distance).toBe(5); // 3-4-5 triangle
    });
  });

  describe('Statistics', () => {
    it('should report memory statistics', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // schema init
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // session count
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // document count
        .mockResolvedValueOnce({ rows: [{ avg: '3.5' }] }); // avg access

      const embeddingProvider = {
        embed: jest.fn().mockResolvedValue(Array(384).fill(0.1)),
        embedBatch: jest.fn(),
      };

      memoryService = new MemoryService(
        mockPool,
        embeddingProvider as any,
        logger
      );

      const stats = await memoryService.getStats();

      expect(stats.totalSessions).toBeDefined();
      expect(stats.totalDocuments).toBeDefined();
      expect(stats.averageAccessCount).toBeDefined();
    });
  });
});
