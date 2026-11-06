import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';
import { EmbeddingProvider, MemoryDocument, Session } from '../memory-service';
import { InMemoryBackend } from './memory-store';
import { PersistedState } from './types';

export class JsonFileBackend extends InMemoryBackend {
  readonly kind = 'json' as const;

  // Simple write lock for concurrent access
  private writeLock: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    embedding: EmbeddingProvider,
    logger: pino.Logger
  ) {
    super(embedding, logger);
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const state = JSON.parse(raw) as PersistedState;
      if (state.version !== 1) {
        throw new Error(`Unsupported memory file version: ${String(state.version)}`);
      }
      this.restore(state);
      this.logger.info({ file: this.filePath }, 'JSON memory store loaded');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.persist();
        this.logger.info({ file: this.filePath }, 'JSON memory store created');
        return;
      }
      throw error;
    }
  }

  async createSession(userId?: string, ttl?: number): Promise<Session> {
    const session = await super.createSession(userId, ttl);
    await this.persist();
    return session;
  }

  async store(
    content: string,
    sessionId: string,
    type?: MemoryDocument['type'],
    metadata?: Record<string, any>
  ): Promise<MemoryDocument> {
    const document = await super.store(content, sessionId, type, metadata);
    await this.persist();
    return document;
  }

  async cleanup(): Promise<void> {
    await super.cleanup();
    await this.persist();
  }

  private async persist(): Promise<void> {
    // Queue this write
    const writePromise = this.writeLock.then(async () => {
      const state = this.snapshot();
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8');

      // Remove destination if it exists (needed on Windows)
      try {
        await fs.unlink(this.filePath);
      } catch {
        // File doesn't exist, that's fine
      }

      await fs.rename(tempPath, this.filePath);
    });

    // Update the lock to wait for all previous writes
    this.writeLock = this.writeLock.then(() => writePromise).catch(() => { /* ignore */ });

    return writePromise;
  }
}