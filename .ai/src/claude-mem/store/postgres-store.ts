import {
  MemoryDocument,
  MemoryQuery,
  MemorySearchResult,
  MemoryService,
  Session,
} from '../memory-service';
import { MemoryBackend } from './types';

export class PostgresBackend implements MemoryBackend {
  readonly kind = 'postgres' as const;

  constructor(private readonly service: MemoryService) {}

  async init(): Promise<void> {
    await this.service.init();
  }

  async createSession(userId?: string, ttl?: number): Promise<Session> {
    return this.service.createSession(userId, ttl);
  }

  async store(
    content: string,
    sessionId: string,
    type?: MemoryDocument['type'],
    metadata?: Record<string, any>
  ): Promise<MemoryDocument> {
    return this.service.store(content, sessionId, type, metadata);
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    return this.service.search(query);
  }

  async getSessionDocuments(
    sessionId: string,
    type?: MemoryDocument['type']
  ): Promise<MemoryDocument[]> {
    return this.service.getSessionDocuments(sessionId, type);
  }

  async getStats(): Promise<Record<string, any>> {
    const stats = await this.service.getStats();
    return { ...stats, backend: this.kind };
  }

  async cleanup(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    await this.service.cleanup();
  }
}
