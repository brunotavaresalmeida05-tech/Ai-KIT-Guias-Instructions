import pino from 'pino';

export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  json?: boolean;
}

export interface LLMProvider {
  readonly name: string;
  complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<string>;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs = 30000
): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  return response.json();
}

export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl = 'https://api.openai.com/v1',
    private readonly logger?: pino.Logger
  ) {}

  async complete(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<string> {
    const data = await postJson(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1024,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      },
      { authorization: `Bearer ${this.apiKey}` },
      options.timeoutMs
    );

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('OpenAI returned an empty completion');
    }

    this.logger?.debug({ model: this.model }, 'OpenAI completion received');
    return content;
  }
}

export class AnthropicLLMProvider implements LLMProvider {
  readonly name = 'anthropic';

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger?: pino.Logger
  ) {}

  async complete(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<string> {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');

    const conversation = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));

    const data = await postJson(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.2,
        ...(system ? { system } : {}),
        messages: conversation,
      },
      {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      options.timeoutMs
    );

    const content = data?.content?.[0]?.text;
    if (typeof content !== 'string') {
      throw new Error('Anthropic returned an empty completion');
    }

    this.logger?.debug({ model: this.model }, 'Anthropic completion received');
    return content;
  }
}

export class OllamaLLMProvider implements LLMProvider {
  readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly logger?: pino.Logger
  ) {}

  async complete(messages: LLMMessage[], options: LLMCompletionOptions = {}): Promise<string> {
    const data = await postJson(
      `${this.baseUrl.replace(/\/$/, '')}/api/chat`,
      {
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.2,
          num_predict: options.maxTokens ?? 1024,
        },
      },
      {},
      options.timeoutMs
    );

    const content = data?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Ollama returned an empty completion');
    }

    this.logger?.debug({ model: this.model }, 'Ollama completion received');
    return content;
  }
}

export class FallbackLLMProvider implements LLMProvider {
  readonly name = 'fallback';

  constructor(
    private readonly providers: LLMProvider[],
    private readonly logger?: pino.Logger
  ) {}

  async complete(messages: LLMMessage[], options?: LLMCompletionOptions): Promise<string> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.complete(messages, options);
      } catch (error) {
        errors.push(error as Error);
        this.logger?.warn(
          { provider: provider.name, error: (error as Error).message },
          'LLM provider failed, trying fallback'
        );
      }
    }

    throw new AggregateError(errors, 'All LLM providers failed');
  }
}

export interface LLMConfig {
  provider: 'none' | 'openai' | 'anthropic' | 'ollama' | 'fallback';
  openaiApiKey?: string;
  openaiBaseUrl: string;
  openaiModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  fallbackOrder: string[];
}

export function createLLMProvider(
  config: LLMConfig,
  logger: pino.Logger
): LLMProvider | null {
  const build = (name: string): LLMProvider | null => {
    switch (name) {
      case 'openai':
        return config.openaiApiKey
          ? new OpenAILLMProvider(config.openaiApiKey, config.openaiModel, config.openaiBaseUrl, logger)
          : null;
      case 'anthropic':
        return config.anthropicApiKey
          ? new AnthropicLLMProvider(config.anthropicApiKey, config.anthropicModel, logger)
          : null;
      case 'ollama':
        return new OllamaLLMProvider(config.ollamaBaseUrl, config.ollamaModel, logger);
      default:
        return null;
    }
  };

  if (config.provider === 'none') {
    return null;
  }

  if (config.provider === 'fallback') {
    const providers = config.fallbackOrder
      .map(build)
      .filter((provider): provider is LLMProvider => provider !== null);
    return providers.length > 0 ? new FallbackLLMProvider(providers, logger) : null;
  }

  return build(config.provider);
}
