import type { DatabaseSync } from 'node:sqlite';
/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import pino from 'pino';
import {
  EmbeddingProvider,
  MemoryDocument,
  MemoryQuery,
  MemorySearchResult,
  Session,
} from '../memory-service';
import { cosineSimilarity, MemoryBackend } from './types';

interface SessionRow {
  id: string;
  user_id: string | null;
  created_at: string;
  last_activity: string;
  ttl: number;
  metadata: string;
}

interface DocumentRow {
  id: string;
  session_id: string;
  type: string;
  content: string;
  embedding: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
  access_count: number;
  last_accessed: string;
  ttl: number | null;
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    createdAt: new Date(row.created_at),
    lastActivity: new Date(row.last_activity),
    ttl: row.ttl,
    metadata: JSON.parse(row.metadata || '{}'),
  };
}

function toDocument(row: DocumentRow): MemoryDocument {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type as MemoryDocument['type'],
    content: row.content,
    embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : undefined,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    accessCount: row.access_count,
    lastAccessed: new Date(row.last_accessed),
    ttl: row.ttl ?? undefined,
  };
}

export class SqliteBackend implements MemoryBackend {
  readonly kind = 'sqlite' as const;
  private db?: DatabaseSyncType;

  constructor(
    private readonly filePath: string,
    private readonly embedding: EmbeddingProvider,
    private readonly logger: pino.Logger
  ) {}

  async init(): Promise<void> {
    if (this.filePath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    }

    const { DatabaseSync } = await import('node:sqlite');
    this.db = new DatabaseSync(this.filePath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
    this.logger.info({ file: this.filePath }, 'SQLite memory store initialized');
  }

  private get database(): DatabaseSyncType {
    if (!this.db) {
      throw new Error('SQLite backend is not initialized');
    }
    return this.db;
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        created_at TEXT NOT NULL,
        last_activity TEXT NOT NULL,
        ttl INTEGER NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS memory_documents (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        last_accessed TEXT NOT NULL,
        ttl INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(last_activity);
      CREATE INDEX IF NOT EXISTS idx_documents_session ON memory_documents(session_id);
      CREATE INDEX IF NOT EXISTS idx_documents_type ON memory_documents(type);
      CREATE INDEX IF NOT EXISTS idx_documents_created ON memory_documents(created_at);
    `);

    this.database
      .prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)')
      .run(1, new Date().toISOString());
  }

  async createSession(userId?: string, ttl = 86400 * 7): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ttl,
      metadata: {},
    };

    this.database
      .prepare(
        'INSERT INTO sessions (id, user_id, created_at, last_activity, ttl, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        session.id,
        session.userId ?? null,
        session.createdAt.toISOString(),
        session.lastActivity.toISOString(),
        session.ttl,
        JSON.stringify(session.metadata)
      );

    return session;
  }

  async store(
    content: string,
    sessionId: string,
    type: MemoryDocument['type'] = 'context',
    metadata: Record<string, any> = {}
  ): Promise<MemoryDocument> {
    const session = this.database
      .prepare('SELECT id FROM sessions WHERE id = ?')
      .get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const document: MemoryDocument = {
      id: randomUUID(),
      sessionId,
      type,
      content,
      embedding: await this.embedding.embed(content),
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
    };

    this.database
      .prepare(
        `INSERT INTO memory_documents
         (id, session_id, type, content, embedding, metadata, created_at, updated_at, access_count, last_accessed, ttl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        document.id,
        document.sessionId,
        document.type,
        document.content,
        JSON.stringify(document.embedding),
        JSON.stringify(document.metadata),
        document.createdAt.toISOString(),
        document.updatedAt.toISOString(),
        document.accessCount,
        document.lastAccessed.toISOString(),
        document.ttl ?? null
      );

    this.database
      .prepare('UPDATE sessions SET last_activity = ? WHERE id = ?')
      .run(new Date().toISOString(), sessionId);

    return document;
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.embedding.embed(query.query);
    const limit = query.limit ?? 10;
    const threshold = query.similarity ?? 0;

    let sql = 'SELECT * FROM memory_documents WHERE embedding IS NOT NULL';
    const params: unknown[] = [];

    if (query.sessionId) {
      sql += ' AND session_id = ?';
      params.push(query.sessionId);
    }
    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    const rows = this.database.prepare(sql).all(...params) as unknown as DocumentRow[];
    const results: MemorySearchResult[] = [];

    for (const row of rows) {
      const document = toDocument(row);
      const similarity = cosineSimilarity(queryEmbedding, document.embedding || []);
      if (similarity >= threshold) {
        results.push({ document, similarity, rank: 0 });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    const ranked = results.slice(0, limit).map((result, index) => {
      result.rank = index + 1;
      result.document.accessCount += 1;
      result.document.lastAccessed = new Date();
      this.database
        .prepare(
          'UPDATE memory_documents SET access_count = access_count + 1, last_accessed = ? WHERE id = ?'
        )
        .run(result.document.lastAccessed.toISOString(), result.document.id);
      return result;
    });

    return ranked;
  }

  async getSessionDocuments(
    sessionId: string,
    type?: MemoryDocument['type']
  ): Promise<MemoryDocument[]> {
    let sql = 'SELECT * FROM memory_documents WHERE session_id = ?';
    const params: unknown[] = [sessionId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = this.database.prepare(sql).all(...params) as unknown as DocumentRow[];
    return rows.map(toDocument);
  }

  async getStats(): Promise<Record<string, any>> {
    const sessions = this.database.prepare('SELECT COUNT(*) AS count FROM sessions').get() as {
      count: number;
    };
    const documents = this.database
      .prepare('SELECT COUNT(*) AS count FROM memory_documents')
      .get() as { count: number };
    const byTypeRows = this.database
      .prepare('SELECT type, COUNT(*) AS count FROM memory_documents GROUP BY type')
      .all() as unknown as Array<{ type: string; count: number }>;

    return {
      backend: this.kind,
      sessions: Number(sessions.count),
      documents: Number(documents.count),
      byType: Object.fromEntries(byTypeRows.map((row) => [row.type, Number(row.count)])),
      file: this.filePath,
    };
  }

  async cleanup(): Promise<void> {
    const now = new Date().toISOString();
    this.database
      .prepare(
        `DELETE FROM memory_documents
         WHERE ttl IS NOT NULL
           AND datetime(last_accessed, '+' || ttl || ' seconds') < datetime(?)`
      )
      .run(now);
    this.database
      .prepare(
        `DELETE FROM sessions
         WHERE datetime(last_activity, '+' || ttl || ' seconds') < datetime(?)`
      )
      .run(now);
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = undefined;
  }
}
