import { randomUUID } from 'crypto';
import pino from 'pino';
import {
  EmbeddingProvider,
  MemoryDocument,
  MemoryQuery,
  MemorySearchResult,
  Session,
} from '../memory-service';
import {
  cosineSimilarity,
  MemoryBackend,
  MemoryBackendKind,
  PersistedState,
} from './types';

export class InMemoryBackend implements MemoryBackend {
  readonly kind: MemoryBackendKind = 'memory';
  protected sessions = new Map<string, Session>();
  protected documents = new Map<string, MemoryDocument>();

  constructor(
    protected readonly embedding: EmbeddingProvider,
    protected readonly logger: pino.Logger
  ) {}

  async init(): Promise<void> {
    this.logger.debug('In-memory backend initialized');
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
    this.sessions.set(session.id, session);
    return session;
  }

  async store(
    content: string,
    sessionId: string,
    type: MemoryDocument['type'] = 'context',
    metadata: Record<string, any> = {}
  ): Promise<MemoryDocument> {
    const session = this.sessions.get(sessionId);
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

    session.lastActivity = new Date();
    this.documents.set(document.id, document);
    return document;
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.embedding.embed(query.query);
    const limit = query.limit ?? 10;
    const threshold = query.similarity ?? 0;

    const results: MemorySearchResult[] = [];

    for (const document of this.documents.values()) {
      if (query.sessionId && document.sessionId !== query.sessionId) {
        continue;
      }
      if (query.type && document.type !== query.type) {
        continue;
      }
      if (!document.embedding) {
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, document.embedding);
      if (similarity < threshold) {
        continue;
      }

      results.push({ document, similarity, rank: 0 });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    const ranked = results.slice(0, limit).map((result, index) => {
      result.rank = index + 1;
      result.document.accessCount += 1;
      result.document.lastAccessed = new Date();
      return result;
    });

    return ranked;
  }

  async getSessionDocuments(
    sessionId: string,
    type?: MemoryDocument['type']
  ): Promise<MemoryDocument[]> {
    return Array.from(this.documents.values())
      .filter((document) => document.sessionId === sessionId && (!type || document.type === type))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getStats(): Promise<Record<string, any>> {
    const byType: Record<string, number> = {};
    for (const document of this.documents.values()) {
      byType[document.type] = (byType[document.type] || 0) + 1;
    }

    return {
      backend: this.kind,
      sessions: this.sessions.size,
      documents: this.documents.size,
      byType,
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();

    for (const [id, session] of this.sessions) {
      const expiresAt = session.lastActivity.getTime() + session.ttl * 1000;
      if (expiresAt < now) {
        this.sessions.delete(id);
        for (const [documentId, document] of this.documents) {
          if (document.sessionId === id) {
            this.documents.delete(documentId);
          }
        }
      }
    }

    for (const [id, document] of this.documents) {
      if (document.ttl) {
        const expiresAt = document.lastAccessed.getTime() + document.ttl * 1000;
        if (expiresAt < now) {
          this.documents.delete(id);
        }
      }
    }
  }

  protected snapshot(): PersistedState {
    return {
      version: 1,
      sessions: Array.from(this.sessions.values()),
      documents: Array.from(this.documents.values()),
    };
  }

  protected restore(state: PersistedState): void {
    this.sessions.clear();
    this.documents.clear();

    for (const session of state.sessions || []) {
      this.sessions.set(session.id, {
        ...session,
        createdAt: new Date(session.createdAt),
        lastActivity: new Date(session.lastActivity),
      });
    }

    for (const document of state.documents || []) {
      this.documents.set(document.id, {
        ...document,
        createdAt: new Date(document.createdAt),
        updatedAt: new Date(document.updatedAt),
        lastAccessed: new Date(document.lastAccessed),
      });
    }
  }
}
