import pino from 'pino';
import {
  LLMRouter,
  LLMRoutingContext,
  SimpleTextLLMRouter,
} from '../laya/notification-hub';
import { LLMProvider } from './providers';

interface RoutingDecision {
  channels: string[];
  priority: number;
  summary: string;
  suggestedAction?: string;
}

const ALLOWED_CHANNELS = new Set(['dashboard', 'slack', 'email', 'webhook']);

export class ProviderLLMRouter implements LLMRouter {
  private readonly fallbackRouter: SimpleTextLLMRouter;

  constructor(
    private readonly provider: LLMProvider,
    private readonly logger: pino.Logger
  ) {
    this.fallbackRouter = new SimpleTextLLMRouter(logger);
  }

  async route(context: LLMRoutingContext): Promise<RoutingDecision> {
    const event = context.event;
    const prompt = [
      'You are the routing engine of Laya Hub, an event notification system.',
      'Choose delivery channels and a priority for the event.',
      'Allowed channels: dashboard, slack, email, webhook.',
      'Respond with JSON only: {"channels": string[], "priority": number, "summary": string, "suggestedAction"?: string}.',
      'Priority is an integer from 1 (lowest) to 10 (highest).',
      '',
      `Title: ${event.title}`,
      `Type: ${event.type}`,
      `Source: ${event.source}`,
      `Description: ${event.description}`,
      `Payload: ${JSON.stringify(event.payload).slice(0, 2000)}`,
    ].join('\n');

    try {
      const raw = await this.provider.complete(
        [
          { role: 'system', content: 'Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0, maxTokens: 300, json: true }
      );

      const parsed = JSON.parse(raw) as Partial<RoutingDecision>;
      const channels = Array.isArray(parsed.channels)
        ? parsed.channels.filter((channel): channel is string => ALLOWED_CHANNELS.has(channel))
        : [];

      if (channels.length === 0) {
        throw new Error('LLM returned no valid channels');
      }

      const priority = Math.min(10, Math.max(1, Number(parsed.priority) || event.priority));

      return {
        channels: Array.from(new Set(channels)),
        priority,
        summary: typeof parsed.summary === 'string' && parsed.summary ? parsed.summary : event.title,
        suggestedAction:
          typeof parsed.suggestedAction === 'string' ? parsed.suggestedAction : undefined,
      };
    } catch (error) {
      this.logger.warn(
        { error: (error as Error).message },
        'LLM routing failed, using heuristic fallback'
      );
      return this.fallbackRouter.route(context);
    }
  }
}
