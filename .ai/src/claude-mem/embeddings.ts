import { createHash } from 'crypto';
import pino from 'pino';
import {
  EmbeddingProvider,
  OllamaEmbeddingProvider,
  OpenAIEmbeddingProvider,
} from './memory-service';

export const EMBEDDING_DIMENSIONS = 384;

export class HashEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly dimensions = EMBEDDING_DIMENSIONS) {}

  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    for (const token of tokens) {
      const digest = createHash('sha256').update(token).digest();
      const index = digest.readUInt32BE(0) % this.dimensions;
      const sign = digest[4] % 2 === 0 ? 1 : -1;
      vector[index] += sign * (1 + Math.min(token.length, 12) / 12);
    }

    const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
    return norm === 0 ? vector : vector.map((value) => value / norm);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }
}

export class FixedDimensionEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly provider: EmbeddingProvider,
    private readonly dimensions = EMBEDDING_DIMENSIONS
  ) {}

  private normalize(vector: number[]): number[] {
    if (vector.length === this.dimensions) {
      return vector;
    }

    if (vector.length > this.dimensions) {
      return vector.slice(0, this.dimensions);
    }

    return [...vector, ...new Array<number>(this.dimensions - vector.length).fill(0)];
  }

  async embed(text: string): Promise<number[]> {
    return this.normalize(await this.provider.embed(text));
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const vectors = await this.provider.embedBatch(texts);
    return vectors.map((vector) => this.normalize(vector));
  }
}

export class FallbackEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly providers: EmbeddingProvider[],
    private readonly logger?: pino.Logger
  ) {}

  private async attempt<T>(operation: (provider: EmbeddingProvider) => Promise<T>): Promise<T> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        return await operation(provider);
      } catch (error) {
        const message = (error as Error).message;
        errors.push(error as Error);
        this.logger?.warn(
          { provider: provider.constructor.name, error: message },
          'Embedding provider failed, trying fallback'
        );
      }
    }

    throw new AggregateError(errors, 'All embedding providers failed');
  }

  async embed(text: string): Promise<number[]> {
    return this.attempt((provider) => provider.embed(text));
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.attempt((provider) => provider.embedBatch(texts));
  }
}

export interface EmbeddingConfig {
  provider: 'hash' | 'openai' | 'ollama' | 'fallback';
  openaiApiKey?: string;
  ollamaBaseUrl: string;
}

export function createEmbeddingProvider(
  config: EmbeddingConfig,
  logger: pino.Logger
): EmbeddingProvider {
  const hash = new HashEmbeddingProvider();
  let provider: EmbeddingProvider;

  switch (config.provider) {
    case 'openai':
      provider = new OpenAIEmbeddingProvider(config.openaiApiKey as string, logger);
      break;
    case 'ollama':
      provider = new OllamaEmbeddingProvider(config.ollamaBaseUrl, logger);
      break;
    case 'fallback': {
      const candidates: EmbeddingProvider[] = [hash];
      if (config.openaiApiKey) {
        candidates.unshift(new OpenAIEmbeddingProvider(config.openaiApiKey, logger));
      }
      candidates.splice(candidates.length - 1, 0, new OllamaEmbeddingProvider(config.ollamaBaseUrl, logger));
      provider = new FallbackEmbeddingProvider(candidates, logger);
      break;
    }
    case 'hash':
    default:
      provider = hash;
      break;
  }

  return new FixedDimensionEmbeddingProvider(provider, EMBEDDING_DIMENSIONS);
}
