// src/claude-mem/memory-service.ts
/**
 * Claude-Mem - Persistent Memory System
 * Semantic search with embeddings, session management, and vector storage
 */

import { randomUUID as uuid } from 'crypto';
import pino from 'pino';
import { Pool } from 'pg';
import axios from 'axios';

// Types
export interface MemoryDocument {
  id: string;
  sessionId: string;
  type: 'context' | 'instruction' | 'feedback' | 'result' | 'reference' | 'content';
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessed: Date;
  ttl?: number; // seconds until auto-delete
}

export interface MemoryQuery {
  query: string;
  sessionId?: string;
  type?: MemoryDocument['type'];
  limit?: number;
  similarity?: number; // threshold 0-1
}

export interface MemorySearchResult {
  document: MemoryDocument;
  similarity: number;
  rank: number;
}

export interface Session {
  id: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
  ttl: number; // seconds
  metadata: Record<string, any>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// OpenAI Embedding Provider
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private logger: pino.Logger;
  private cache: Map<string, number[]> = new Map();

  constructor(apiKey: string, logger: pino.Logger) {
    this.apiKey = apiKey;
    this.logger = logger;
  }

  async embed(text: string): Promise<number[]> {
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: 'text-embedding-3-small',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const embedding = response.data.data[0].embedding;
      this.cache.set(text, embedding);
      return embedding;
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Embedding failed');
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Filter out cached items
    const uncached = texts.filter((t) => !this.cache.has(t));

    if (uncached.length === 0) {
      return texts.map((t) => this.cache.get(t)!);
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: uncached,
          model: 'text-embedding-3-small',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const embeddings = response.data.data.map((item: any) => item.embedding);

      // Cache results
      uncached.forEach((text, idx) => {
        this.cache.set(text, embeddings[idx]);
      });

      // Return in original order
      return texts.map((t) => this.cache.get(t)!);
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Batch embedding failed');
      throw error;
    }
  }
}

// Ollama Embedding Provider (Local/Fallback)
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private logger: pino.Logger;
  private cache: Map<string, number[]> = new Map();

  constructor(baseUrl = 'http://localhost:11434', logger: pino.Logger) {
    this.baseUrl = baseUrl;
    this.model = 'nomic-embed-text';
    this.logger = logger;
  }

  async embed(text: string): Promise<number[]> {
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: this.model,
        prompt: text,
      });

      const embedding = response.data.embedding;
      this.cache.set(text, embedding);
      return embedding;
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Ollama embedding failed');
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(texts.map((t) => this.embed(t)));
    return results;
  }
}

// Vector similarity calculation
export class VectorMath {
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  static l2Distance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
  }
}

// Main Memory Service
export class MemoryService {
  private db: Pool;
  private embeddingProvider: EmbeddingProvider;
  private logger: pino.Logger;
  private sessions: Map<string, Session> = new Map();
  private gcInterval?: ReturnType<typeof setInterval>;
  private initialization?: Promise<void>;
  private closing?: Promise<void>;
  private closed = false;

  constructor(
    dbPool: Pool,
    embeddingProvider: EmbeddingProvider,
    logger: pino.Logger = pino({ name: 'Claude-Mem' })
  ) {
    this.db = dbPool;
    this.embeddingProvider = embeddingProvider;
    this.logger = logger;

  }

  /** Await startup explicitly; direct callers also initialize on their first operation. */
  init(): Promise<void> {
    if (this.closed) return Promise.reject(new Error('Memory service is closed'));
    if (!this.initialization) {
      this.initialization = this.initializeSchema().then(() => {
        if (!this.closed) this.startGarbageCollection();
      });
    }
    return this.initialization;
  }

  private async initializeSchema(): Promise<void> {
    try {
      await this.db.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "vector";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        CREATE EXTENSION IF NOT EXISTS "btree_gin";

        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY,
          user_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          last_activity TIMESTAMP DEFAULT NOW(),
          ttl INT NOT NULL,
          metadata JSONB DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS memory_documents (
          id UUID PRIMARY KEY,
          session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          embedding VECTOR(384),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          access_count INT DEFAULT 0,
          last_accessed TIMESTAMP DEFAULT NOW(),
          ttl INT
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
        CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_documents(type);
        CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_documents(session_id);
        CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        CREATE INDEX IF NOT EXISTS idx_memory_text ON memory_documents USING gin(content gin_trgm_ops);
      `);

      this.logger.info('Database schema initialized');
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Schema initialization failed');
      throw error;
    }
  }

  // Create a session
  async createSession(
    userId?: string,
    ttl: number = 86400 * 7 // 7 days
  ): Promise<Session> {
    await this.init();
    const session: Session = {
      id: uuid(),
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ttl,
      metadata: {},
    };

    await this.db.query(
      'INSERT INTO sessions (id, user_id, created_at, last_activity, ttl) VALUES ($1, $2, $3, $4, $5)',
      [session.id, userId, session.createdAt, session.lastActivity, session.ttl]
    );

    this.sessions.set(session.id, session);
    this.logger.debug({ sessionId: session.id }, 'Session created');

    return session;
  }

  // Store document
  async store(
    content: string,
    sessionId: string,
    type: MemoryDocument['type'] = 'context',
    metadata: Record<string, any> = {}
  ): Promise<MemoryDocument> {
    await this.init();
    try {
      // Generate embedding
      const embedding = await this.embeddingProvider.embed(content);

      const document: MemoryDocument = {
        id: uuid(),
        sessionId,
        type,
        content,
        embedding,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 0,
        lastAccessed: new Date(),
      };

      // Store in database
      await this.db.query(
        `INSERT INTO memory_documents
         (id, session_id, type, content, embedding, metadata, created_at, updated_at, access_count, last_accessed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          document.id,
          sessionId,
          type,
          content,
          JSON.stringify(embedding), // pgvector format
          JSON.stringify(metadata),
          document.createdAt,
          document.updatedAt,
          document.accessCount,
          document.lastAccessed,
        ]
      );

      this.logger.debug({ documentId: document.id, sessionId }, 'Document stored');
      return document;
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Document storage failed');
      throw error;
    }
  }

  // Semantic search
  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    await this.init();
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingProvider.embed(query.query);

      // Build SQL query
      let sql = `
        SELECT id, session_id, type, content, embedding, metadata,
               created_at, updated_at, access_count, last_accessed,
               1 - (embedding <=> $1::vector) as similarity
        FROM memory_documents
        WHERE 1=1
      `;

      const params: any[] = [JSON.stringify(queryEmbedding)];
      let paramCount = 2;

      if (query.sessionId) {
        sql += ` AND session_id = $${paramCount}`;
        params.push(query.sessionId);
        paramCount++;
      }

      if (query.type) {
        sql += ` AND type = $${paramCount}`;
        params.push(query.type);
        paramCount++;
      }

      if (query.similarity) {
        sql += ` AND (1 - (embedding <=> $1::vector)) >= $${paramCount}`;
        params.push(query.similarity);
        paramCount++;
      }

      sql += ` ORDER BY similarity DESC`;

      if (query.limit) {
        sql += ` LIMIT $${paramCount}`;
        params.push(query.limit);
      }

      const result = await this.db.query(sql, params);

      // Update access count
      for (const row of result.rows) {
        await this.db.query(
          'UPDATE memory_documents SET access_count = access_count + 1, last_accessed = NOW() WHERE id = $1',
          [row.id]
        );
      }

      const searchResults: MemorySearchResult[] = result.rows.map((row, rank) => ({
        document: {
          id: row.id,
          sessionId: row.session_id,
          type: row.type,
          content: row.content,
          embedding: JSON.parse(row.embedding),
          metadata: row.metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          accessCount: row.access_count,
          lastAccessed: row.last_accessed,
        },
        similarity: row.similarity,
        rank: rank + 1,
      }));

      this.logger.debug({ query: query.query, results: searchResults.length }, 'Search completed');
      return searchResults;
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Search failed');
      throw error;
    }
  }

  // Get all documents for session
  async getSessionDocuments(
    sessionId: string,
    type?: MemoryDocument['type']
  ): Promise<MemoryDocument[]> {
    await this.init();
    try {
      let sql = 'SELECT * FROM memory_documents WHERE session_id = $1';
      const params: any[] = [sessionId];

      if (type) {
        sql += ' AND type = $2';
        params.push(type);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await this.db.query(sql, params);

      return result.rows.map((row) => ({
        id: row.id,
        sessionId: row.session_id,
        type: row.type,
        content: row.content,
        embedding: JSON.parse(row.embedding),
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accessCount: row.access_count,
        lastAccessed: row.last_accessed,
        ttl: row.ttl,
      }));
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Get session documents failed');
      throw error;
    }
  }

  // Update document
  async update(
    documentId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<MemoryDocument> {
    await this.init();
    try {
      // Generate new embedding
      const embedding = await this.embeddingProvider.embed(content);

      const result = await this.db.query(
        `UPDATE memory_documents
         SET content = $1, embedding = $2, metadata = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          content,
          JSON.stringify(embedding),
          JSON.stringify(metadata || {}),
          documentId,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        sessionId: row.session_id,
        type: row.type,
        content: row.content,
        embedding: JSON.parse(row.embedding),
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accessCount: row.access_count,
        lastAccessed: row.last_accessed,
        ttl: row.ttl,
      };
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Document update failed');
      throw error;
    }
  }

  // Delete document
  async delete(documentId: string): Promise<void> {
    await this.init();
    try {
      await this.db.query('DELETE FROM memory_documents WHERE id = $1', [documentId]);
      this.logger.debug({ documentId }, 'Document deleted');
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Document deletion failed');
      throw error;
    }
  }

  // Garbage collection
  private startGarbageCollection(): void {
    this.gcInterval = setInterval(async () => {
      try {
        // Delete expired sessions
        await this.db.query(`
          DELETE FROM sessions
          WHERE (last_activity + INTERVAL '1 second' * ttl) < NOW()
        `);

        // Delete expired documents
        await this.db.query(`
          DELETE FROM memory_documents
          WHERE ttl IS NOT NULL
          AND (created_at + INTERVAL '1 second' * ttl) < NOW()
        `);

        this.logger.debug('Garbage collection completed');
      } catch (error) {
        this.logger.error({ error: (error as Error).message }, 'Garbage collection failed');
      }
    }, 60000); // Run every minute
    this.gcInterval.unref?.();
  }

  // Get memory stats
  async getStats(): Promise<Record<string, any>> {
    await this.init();
    try {
      const sessionCount = await this.db.query('SELECT COUNT(*) FROM sessions');
      const documentCount = await this.db.query('SELECT COUNT(*) FROM memory_documents');
      const avgAccessCount = await this.db.query(
        'SELECT AVG(access_count) FROM memory_documents'
      );

      return {
        totalSessions: sessionCount.rows[0].count,
        totalDocuments: documentCount.rows[0].count,
        averageAccessCount: parseFloat(avgAccessCount.rows[0].avg || 0),
        activeSessions: this.sessions.size,
      };
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Stats retrieval failed');
      throw error;
    }
  }

  // Cleanup
  cleanup(): Promise<void> {
    if (this.closing) return this.closing;
    this.closed = true;
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
    }
    this.closing = (async () => {
      // Initialization failures are propagated by init(); shutdown must still close the pool.
      await this.initialization?.catch(() => undefined);
      await this.db.end();
      this.logger.info('Memory service cleaned up');
    })();
    return this.closing;
  }
}

export default MemoryService;
