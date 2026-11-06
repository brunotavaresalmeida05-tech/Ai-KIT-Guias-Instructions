import { createLogger } from '../src/logger';
import {
  FallbackLLMProvider,
  LLMProvider,
  OpenAILLMProvider,
  createLLMProvider,
} from '../src/llm/providers';
import { ProviderLLMRouter } from '../src/llm/router';
import { NotificationEvent, SimpleTextLLMRouter } from '../src/laya/notification-hub';

const logger = createLogger('test', 'silent');

function event(title = 'Critical error', priority = 8): NotificationEvent {
  return {
    id: 'event-1',
    source: 'system',
    type: 'alert',
    title,
    description: 'Something failed',
    payload: { service: 'api' },
    priority,
    createdAt: new Date(),
    metadata: {},
  };
}

class StaticProvider implements LLMProvider {
  readonly name = 'static';

  constructor(private readonly response: string | Error) {}

  async complete(): Promise<string> {
    if (this.response instanceof Error) {
      throw this.response;
    }
    return this.response;
  }
}

describe('LLM providers', () => {
  it('returns null when no provider is configured', () => {
    const provider = createLLMProvider(
      {
        provider: 'none',
        openaiBaseUrl: 'http://localhost',
        openaiModel: 'gpt',
        anthropicModel: 'claude',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaModel: 'mistral',
        fallbackOrder: [],
      },
      logger
    );

    expect(provider).toBeNull();
  });

  it('creates single and fallback providers', () => {
    const config = {
      provider: 'openai' as const,
      openaiApiKey: 'test-key',
      openaiBaseUrl: 'http://localhost',
      openaiModel: 'gpt-4o',
      anthropicApiKey: 'anthropic-key',
      anthropicModel: 'claude-3-5-sonnet',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      fallbackOrder: ['openai', 'anthropic', 'ollama'],
    };

    expect(createLLMProvider(config, logger)?.name).toBe('openai');
    expect(createLLMProvider({ ...config, provider: 'anthropic' }, logger)?.name).toBe('anthropic');
    expect(createLLMProvider({ ...config, provider: 'ollama' }, logger)?.name).toBe('ollama');

    const fallback = createLLMProvider({ ...config, provider: 'fallback' }, logger);
    expect(fallback?.name).toBe('fallback');

    expect(createLLMProvider({ ...config, provider: 'fallback', fallbackOrder: ['invalid'] }, logger)).toBeNull();
  });

  it('falls back to the next provider on failure', async () => {
    const provider = new FallbackLLMProvider(
      [new StaticProvider(new Error('down')), new StaticProvider('ok')],
      logger
    );

    await expect(provider.complete([{ role: 'user', content: 'hi' }])).resolves.toBe('ok');
  });

  it('throws an AggregateError when every provider fails', async () => {
    const provider = new FallbackLLMProvider(
      [new StaticProvider(new Error('one')), new StaticProvider(new Error('two'))],
      logger
    );

    await expect(provider.complete([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(
      AggregateError
    );
  });

  it('parses OpenAI chat completions and handles invalid response', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello' } }] }),
    })) as any;

    try {
      const provider = new OpenAILLMProvider('key', 'gpt-test', 'http://openai.test', logger);
      await expect(provider.complete([{ role: 'user', content: 'hi' }], { json: true })).resolves.toBe('hello');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://openai.test/chat/completions',
        expect.objectContaining({ method: 'POST' })
      );
    } finally {
      global.fetch = originalFetch;
    }

    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    })) as any;

    try {
      const provider = new OpenAILLMProvider('key', 'gpt-test', 'http://openai.test', logger);
      await expect(provider.complete([{ role: 'user', content: 'hi' }])).rejects.toThrow('Provider request failed (400): Bad Request');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('parses Anthropic chat completions', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ content: [{ text: 'anthropic output' }] }),
    })) as any;

    try {
      const provider = createLLMProvider(
        {
          provider: 'anthropic',
          anthropicApiKey: 'anth-key',
          anthropicModel: 'claude-3-5',
          openaiBaseUrl: '',
          openaiModel: '',
          ollamaBaseUrl: '',
          ollamaModel: '',
          fallbackOrder: [],
        },
        logger
      );
      await expect(
        provider?.complete([
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'hi' },
        ])
      ).resolves.toBe('anthropic output');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('parses Ollama chat completions', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ message: { content: 'ollama output' } }),
    })) as any;

    try {
      const provider = createLLMProvider(
        {
          provider: 'ollama',
          ollamaBaseUrl: 'http://localhost:11434',
          ollamaModel: 'llama3',
          openaiBaseUrl: '',
          openaiModel: '',
          anthropicModel: '',
          fallbackOrder: [],
        },
        logger
      );
      await expect(
        provider?.complete([{ role: 'user', content: 'hello' }])
      ).resolves.toBe('ollama output');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('ProviderLLMRouter', () => {
  it('uses the provider decision when it returns valid JSON', async () => {
    const router = new ProviderLLMRouter(
      new StaticProvider(
        JSON.stringify({
          channels: ['slack', 'email', 'invalid-channel'],
          priority: 10,
          summary: 'Critical failure',
          suggestedAction: 'Rollback',
        })
      ),
      logger
    );

    const decision = await router.route({ event: event() });

    expect(decision.channels).toEqual(['slack', 'email']);
    expect(decision.priority).toBe(10);
    expect(decision.summary).toBe('Critical failure');
  });

  it('falls back to heuristic routing when the provider fails', async () => {
    const router = new ProviderLLMRouter(new StaticProvider(new Error('boom')), logger);
    const fallback = await new SimpleTextLLMRouter(logger).route({ event: event() });

    const decision = await router.route({ event: event() });

    expect(decision.priority).toBe(fallback.priority);
    expect(decision.channels).toEqual(fallback.channels);
  });
});
