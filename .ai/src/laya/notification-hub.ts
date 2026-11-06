// src/laya/notification-hub.ts
/**
 * Laya Hub - Intelligent Notification Routing & Aggregation
 * Routes events from 7+ sources through LLM for smart prioritization and delivery
 */

import EventEmitter from 'events';
import { randomUUID as uuid } from 'crypto';
import pino from 'pino';
import PQueue from 'p-queue';

// Types
export type NotificationSource =
  | 'github'
  | 'slack'
  | 'email'
  | 'webhook'
  | 'database'
  | 'api'
  | 'workflow'
  | 'system';

export interface NotificationEvent {
  id: string;
  source: NotificationSource;
  type: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  priority: number; // 1-10
  createdAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface ActionCard {
  id: string;
  notificationId: string;
  title: string;
  description: string;
  actions: Action[];
  priority: number;
  category: string;
  suggestedAction?: Action;
  createdAt: Date;
}

export interface Action {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: string; // Function name to execute
  params?: Record<string, any>;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: (event: NotificationEvent) => boolean;
  routes: {
    channel: string; // 'slack', 'email', 'dashboard', 'webhook'
    template: string;
    transform?: (event: NotificationEvent) => any;
  }[];
  priority?: number;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  attemptCount: number;
  lastAttempt?: Date;
  error?: string;
  metadata: Record<string, any>;
}

export interface LLMRoutingContext {
  event: NotificationEvent;
  userPreferences?: Record<string, any>;
  contextHistory?: NotificationEvent[];
  systemContext?: Record<string, any>;
}

export interface LLMRouter {
  route(context: LLMRoutingContext): Promise<{
    channels: string[];
    priority: number;
    summary: string;
    suggestedAction?: string;
  }>;
}

// Mock LLM Router (can be replaced with actual LLM API)
export class SimpleTextLLMRouter implements LLMRouter {
  private logger: pino.Logger;

  constructor(logger: pino.Logger = pino()) {
    this.logger = logger;
  }

  async route(context: LLMRoutingContext): Promise<{
    channels: string[];
    priority: number;
    summary: string;
    suggestedAction?: string;
  }> {
    const event = context.event;

    // Simple heuristic routing based on event properties
    let priority = 5;
    const channels: string[] = ['dashboard'];

    // Detect priority from keywords
    if (
      event.title.toLowerCase().includes('error') ||
      event.title.toLowerCase().includes('critical')
    ) {
      priority = 9;
      channels.push('slack', 'email');
    } else if (
      event.title.toLowerCase().includes('warning') ||
      event.title.toLowerCase().includes('alert')
    ) {
      priority = 7;
      channels.push('slack');
    } else if (event.priority && event.priority >= 8) {
      priority = event.priority;
      channels.push('slack');
    }

    // Source-specific routing
    switch (event.source) {
      case 'github':
        channels.push('webhook');
        break;
      case 'email':
        if (!channels.includes('email')) {
          channels.push('email');
        }
        break;
    }

    return {
      channels: Array.from(new Set(channels)),
      priority,
      summary: `${event.type}: ${event.title}`,
      suggestedAction: priority >= 8 ? 'acknowledge' : undefined,
    };
  }
}

// Event Aggregator
export class EventAggregator {
  private events: Map<string, NotificationEvent> = new Map();
  private buffer: NotificationEvent[] = [];
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private bufferSize: number;
  private bufferInterval: number;
  private logger: pino.Logger;

  constructor(
    bufferSize = 10,
    bufferInterval = 1000,
    logger: pino.Logger = pino()
  ) {
    this.bufferSize = bufferSize;
    this.bufferInterval = bufferInterval;
    this.logger = logger;
  }

  ingest(event: NotificationEvent): void {
    this.buffer.push(event);
    this.events.set(event.id, event);

    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    } else if (!this.bufferTimer) {
      this.bufferTimer = setTimeout(() => this.flush(), this.bufferInterval);
      this.bufferTimer.unref?.();
    }

    this.logger.debug({ eventId: event.id, source: event.source }, 'Event ingested');
  }

  flush(): NotificationEvent[] {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }

    const events = [...this.buffer];
    this.buffer = [];

    this.logger.debug({ count: events.length }, 'Events flushed');
    return events;
  }

  getEvent(eventId: string): NotificationEvent | undefined {
    return this.events.get(eventId);
  }

  getAllEvents(): NotificationEvent[] {
    return Array.from(this.events.values());
  }

  getEventsBySource(source: NotificationSource): NotificationEvent[] {
    return Array.from(this.events.values()).filter((e) => e.source === source);
  }

  removeExpiredEvents(): void {
    const now = new Date();

    for (const [id, event] of this.events.entries()) {
      if (event.expiresAt && event.expiresAt < now) {
        this.events.delete(id);
      }
    }
  }
}

// Priority Queue Manager
export class PriorityQueueManager {
  private queue: PQueue;
  private deliveries: Map<string, NotificationDelivery[]> = new Map();
  private logger: pino.Logger;

  constructor(concurrency = 5, logger: pino.Logger = pino()) {
    this.queue = new PQueue({ concurrency });
    this.logger = logger;
  }

  async schedule(
    delivery: NotificationDelivery,
    handler: () => Promise<void>
  ): Promise<void> {
    const priority = delivery.metadata.priority;

    await this.queue.add(
      async () => {
        try {
          await handler();
          delivery.status = 'delivered';
          this.logger.debug({ deliveryId: delivery.id }, 'Delivery completed');
        } catch (error) {
          delivery.status = 'failed';
          delivery.error = (error as Error).message;
          delivery.attemptCount++;
          this.logger.error(
            { deliveryId: delivery.id, error: (error as Error).message },
            'Delivery failed'
          );
        }

        delivery.lastAttempt = new Date();
      },
      { priority }
    );
  }

  pause(): void {
    this.queue.pause();
  }

  start(): void {
    this.queue.start();
  }

  trackDelivery(notificationId: string, delivery: NotificationDelivery): void {
    if (!this.deliveries.has(notificationId)) {
      this.deliveries.set(notificationId, []);
    }
    this.deliveries.get(notificationId)!.push(delivery);
  }

  getDeliveries(notificationId: string): NotificationDelivery[] {
    return this.deliveries.get(notificationId) || [];
  }

  getQueueStats(): Record<string, any> {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      concurrency: (this.queue as any).concurrency,
    };
  }
}

// Action Card Generator
export class ActionCardGenerator {
  private logger: pino.Logger;

  constructor(logger: pino.Logger = pino()) {
    this.logger = logger;
  }

  generate(event: NotificationEvent): ActionCard {
    const actions = this.generateActions(event);
    const suggestedAction = this.suggestPrimaryAction(event, actions);

    return {
      id: uuid(),
      notificationId: event.id,
      title: event.title,
      description: event.description,
      actions,
      priority: event.priority,
      category: event.type,
      suggestedAction,
      createdAt: new Date(),
    };
  }

  private generateActions(event: NotificationEvent): Action[] {
    const actions: Action[] = [];

    // GitHub events
    if (event.source === 'github') {
      if (event.type === 'pull_request') {
        actions.push(
          {
            id: uuid(),
            label: 'Review PR',
            type: 'primary',
            handler: 'openPullRequest',
            params: { url: event.payload.pullRequest?.url },
          },
          {
            id: uuid(),
            label: 'Approve',
            type: 'secondary',
            handler: 'approvePullRequest',
            params: { id: event.payload.pullRequest?.id },
          }
        );
      }

      if (event.type === 'issue') {
        actions.push({
          id: uuid(),
          label: 'View Issue',
          type: 'primary',
          handler: 'openIssue',
          params: { url: event.payload.issue?.url },
        });
      }
    }

    // Error/Alert events
    if (event.priority >= 8) {
      actions.push({
        id: uuid(),
        label: 'Acknowledge',
        type: 'primary',
        handler: 'acknowledgeAlert',
        params: { eventId: event.id },
      });

      if (event.payload.logsUrl) {
        actions.push({
          id: uuid(),
          label: 'View Logs',
          type: 'secondary',
          handler: 'viewLogs',
          params: { url: event.payload.logsUrl },
        });
      }
    }

    // Generic actions
    actions.push({
      id: uuid(),
      label: 'Dismiss',
      type: 'secondary',
      handler: 'dismissNotification',
      params: { eventId: event.id },
    });

    return actions;
  }

  private suggestPrimaryAction(event: NotificationEvent, actions: Action[]): Action | undefined {
    // For high priority events, suggest the primary action
    if (event.priority >= 8 && actions.length > 0) {
      return actions.find((a) => a.type === 'primary') || actions[0];
    }

    return undefined;
  }
}

// Routing Engine
export class RoutingEngine {
  private rules: Map<string, RoutingRule> = new Map();
  private llmRouter: LLMRouter;
  private logger: pino.Logger;

  constructor(llmRouter: LLMRouter, logger: pino.Logger = pino()) {
    this.llmRouter = llmRouter;
    this.logger = logger;
  }

  addRule(rule: RoutingRule): void {
    this.rules.set(rule.id, rule);
    this.logger.debug({ ruleId: rule.id }, 'Routing rule added');
  }

  async route(event: NotificationEvent): Promise<RoutingRule['routes']> {
    // Check manual rules first
    for (const rule of this.rules.values()) {
      if (rule.condition(event)) {
        this.logger.debug({ ruleId: rule.id, eventId: event.id }, 'Rule matched');
        return rule.routes;
      }
    }

    // Fall back to LLM routing
    const llmResult = await this.llmRouter.route({
      event,
    });

    return llmResult.channels.map((channel) => ({
      channel,
      template: `default-${channel}`,
      transform: (e) => ({ ...e, llmRouted: true }),
    }));
  }
}

// Main Notification Hub
export class LayaHub extends EventEmitter {
  private aggregator: EventAggregator;
  private queue: PriorityQueueManager;
  private cardGenerator: ActionCardGenerator;
  private router: RoutingEngine;
  private logger: pino.Logger;
  private handlers: Map<
    string,
    (event: any, ...args: any[]) => any | Promise<any>
  > = new Map();

  constructor(llmRouter?: LLMRouter, logger: pino.Logger = pino({ name: 'Laya-Hub' })) {
    super();
    this.logger = logger;
    this.aggregator = new EventAggregator(10, 1000, logger);
    this.queue = new PriorityQueueManager(5, logger);
    this.cardGenerator = new ActionCardGenerator(logger);
    this.router = new RoutingEngine(llmRouter || new SimpleTextLLMRouter(logger), logger);
  }

  // Register event source
  registerSource(source: NotificationSource): void {
    this.logger.info({ source }, 'Event source registered');
  }

  // Register action handler
  registerHandler(
    name: string,
    handler: (event: any, ...args: any[]) => any | Promise<any>
  ): void {
    this.handlers.set(name, handler);
    this.logger.debug({ handler: name }, 'Action handler registered');
  }

  // Ingest event
  async ingestEvent(event: Partial<NotificationEvent>): Promise<NotificationEvent> {
    const fullEvent: NotificationEvent = {
      id: uuid(),
      source: event.source || 'api',
      type: event.type || 'generic',
      title: event.title || 'Notification',
      description: event.description || '',
      payload: event.payload || {},
      priority: event.priority || 5,
      createdAt: new Date(),
      expiresAt: event.expiresAt,
      metadata: event.metadata || {},
    };

    this.aggregator.ingest(fullEvent);

    // Immediately start routing
    await this.processEvent(fullEvent);

    return fullEvent;
  }

  // Process event through routing and queuing
  private async processEvent(event: NotificationEvent): Promise<void> {
    try {
      // Generate action card
      const card = this.cardGenerator.generate(event);

      // Route event
      const routes = await this.router.route(event);

      // Create deliveries
      for (const route of routes) {
        const delivery: NotificationDelivery = {
          id: uuid(),
          notificationId: event.id,
          channel: route.channel,
          status: 'pending',
          attemptCount: 0,
          metadata: {
            priority: event.priority,
            template: route.template,
          },
        };

        this.queue.trackDelivery(event.id, delivery);

        // Schedule delivery
        const handler = async () => {
          const deliveryHandler = this.handlers.get(`deliver-${route.channel}`);
          if (!deliveryHandler) {
            throw new Error(`No handler for channel: ${route.channel}`);
          }

          const transformedEvent = route.transform ? route.transform(event) : event;
          await deliveryHandler(transformedEvent, card, delivery);
        };

        await this.queue.schedule(delivery, handler);
      }

      this.emit('event-processed', { event, card });
    } catch (error) {
      this.logger.error(
        { eventId: event.id, error: (error as Error).message },
        'Event processing failed'
      );
      this.emit('event-error', { event, error });
    }
  }

  // Execute action from card
  async executeAction(cardId: string, actionId: string, params?: Record<string, any>): Promise<any> {
    try {
      // Find action (would normally query database)
      const handler = this.handlers.get(`action-${actionId}`);

      if (!handler) {
        throw new Error(`No handler for action: ${actionId}`);
      }

      const result = await handler(params);
      this.emit('action-executed', { cardId, actionId, result });

      return result;
    } catch (error) {
      this.logger.error(
        { cardId, actionId, error: (error as Error).message },
        'Action execution failed'
      );
      throw error;
    }
  }

  // Batch process events
  async processBatch(events: Partial<NotificationEvent>[]): Promise<NotificationEvent[]> {
    const processedEvents = await Promise.all(
      events.map((e) => this.ingestEvent(e))
    );
    return processedEvents;
  }

  // Get hub statistics
  getStats(): Record<string, any> {
    return {
      timestamp: new Date(),
      events: this.aggregator.getAllEvents().length,
      queue: this.queue.getQueueStats(),
      handlers: this.handlers.size,
    };
  }

  // List all known events
  getEvents(): NotificationEvent[] {
    return this.aggregator.getAllEvents();
  }

  // Get event status
  getEventStatus(eventId: string): Record<string, any> {
    const event = this.aggregator.getEvent(eventId);
    const deliveries = this.queue.getDeliveries(eventId);

    return {
      event,
      deliveries,
      status: deliveries.every((d) => d.status === 'delivered') ? 'delivered' : 'pending',
    };
  }

  // Clean up
  async cleanup(): Promise<void> {
    this.aggregator.removeExpiredEvents();
    this.logger.info('Laya Hub cleaned up');
  }
}

export default LayaHub;
