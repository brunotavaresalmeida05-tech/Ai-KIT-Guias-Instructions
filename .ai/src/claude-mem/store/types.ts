import {
  MemoryDocument,
  MemoryQuery,
  MemorySearchResult,
  Session,
} from '../memory-service';

export type MemoryBackendKind = 'memory' | 'json' | 'sqlite' | 'postgres';

export interface MemoryBackend {
  readonly kind: MemoryBackendKind;
  init(): Promise<void>;
  createSession(userId?: string, ttl?: number): Promise<Session>;
  store(
    content: string,
    sessionId: string,
    type?: MemoryDocument['type'],
    metadata?: Record<string, any>
  ): Promise<MemoryDocument>;
  search(query: MemoryQuery): Promise<MemorySearchResult[]>;
  getSessionDocuments(
    sessionId: string,
    type?: MemoryDocument['type']
  ): Promise<MemoryDocument[]>;
  getStats(): Promise<Record<string, any>>;
  cleanup(): Promise<void>;
  close?(): Promise<void>;
}

export interface PersistedState {
  version: 1;
  sessions: Session[];
  documents: MemoryDocument[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
