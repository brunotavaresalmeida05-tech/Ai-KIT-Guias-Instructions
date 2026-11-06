// tests/laya.test.ts
/**
 * Laya Hub Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import LayaHub, {
  EventAggregator,
  PriorityQueueManager,
  ActionCardGenerator,
  RoutingEngine,
  SimpleTextLLMRouter,
  NotificationEvent,
} from '../src/laya/notification-hub';
import pino from 'pino';

describe('Laya Hub - Notification System', () => {
  let hub: LayaHub;
  let logger: pino.Logger;

  beforeEach(() => {
    logger = pino({ level: 'silent' });
    hub = new LayaHub(new SimpleTextLLMRouter(logger), logger);
  });

  describe('Event Aggregation', () => {
    it('should ingest events into aggregator', () => {
      const aggregator = new EventAggregator(10, 1000, logger);

      const event: NotificationEvent = {
        id: 'test-1',
        source: 'api',
        type: 'test',
        title: 'Test Event',
        description: 'Test description',
        payload: {},
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      aggregator.ingest(event);

      const retrieved = aggregator.getEvent('test-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Event');
    });

    it('should buffer events and flush', () => {
      const aggregator = new EventAggregator(10, 1000, logger);

      const event1: NotificationEvent = {
        id: 'test-1',
        source: 'api',
        type: 'test',
        title: 'Event 1',
        description: '',
        payload: {},
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      const event2: NotificationEvent = {
        id: 'test-2',
        source: 'api',
        type: 'test',
        title: 'Event 2',
        description: '',
        payload: {},
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      aggregator.ingest(event1);
      aggregator.ingest(event2);

      const flushed = aggregator.flush();

      expect(flushed).toHaveLength(2);
    });

    it('should filter events by source', () => {
      const aggregator = new EventAggregator(10, 1000, logger);

      const githubEvent: NotificationEvent = {
        id: 'gh-1',
        source: 'github',
        type: 'push',
        title: 'Push',
        description: '',
        payload: {},
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      const slackEvent: NotificationEvent = {
        id: 'slack-1',
        source: 'slack',
        type: 'message',
        title: 'Message',
        description: '',
        payload: {},
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      aggregator.ingest(githubEvent);
      aggregator.ingest(slackEvent);

      const github = aggregator.getEventsBySource('github');
      expect(github).toHaveLength(1);
      expect(github[0].source).toBe('github');
    });
  });

  describe('Action Card Generation', () => {
    it('should generate action cards for GitHub events', () => {
      const generator = new ActionCardGenerator(logger);

      const event: NotificationEvent = {
        id: 'gh-1',
        source: 'github',
        type: 'pull_request',
        title: 'PR Opened',
        description: 'New pull request',
        payload: {
          pullRequest: {
            id: 'pr-123',
            url: 'https://github.com/repo/pull/123',
          },
        },
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      const card = generator.generate(event);

      expect(card.title).toBe('PR Opened');
      expect(card.actions.length).toBeGreaterThan(0);
      expect(card.actions.some((a) => a.label === 'Review PR')).toBe(true);
    });

    it('should generate actions for high-priority alerts', () => {
      const generator = new ActionCardGenerator(logger);

      const event: NotificationEvent = {
        id: 'alert-1',
        source: 'system',
        type: 'error',
        title: 'CRITICAL: Server Down',
        description: 'Server is down',
        payload: { logsUrl: 'https://logs.example.com/error' },
        priority: 9,
        createdAt: new Date(),
        metadata: {},
      };

      const card = generator.generate(event);

      expect(card.actions.some((a) => a.label === 'Acknowledge')).toBe(true);
      expect(card.suggestedAction).toBeDefined();
    });

    it('should include dismiss action on all cards', () => {
      const generator = new ActionCardGenerator(logger);

      const event: NotificationEvent = {
        id: 'test-1',
        source: 'api',
        type: 'info',
        title: 'Info',
        description: '',
        payload: {},
        priority: 2,
        createdAt: new Date(),
        metadata: {},
      };

      const card = generator.generate(event);

      expect(card.actions.some((a) => a.label === 'Dismiss')).toBe(true);
    });
  });

  describe('Routing Engine', () => {
    it('should route high-priority events to multiple channels', async () => {
      const router = new RoutingEngine(new SimpleTextLLMRouter(logger), logger);

      const event: NotificationEvent = {
        id: 'critical-1',
        source: 'system',
        type: 'error',
        title: 'CRITICAL: Database Down',
        description: 'Database connection lost',
        payload: {},
        priority: 9,
        createdAt: new Date(),
        metadata: {},
      };

      const routes = await router.route(event);

      expect(routes.length).toBeGreaterThan(0);
      expect(routes.some((r) => r.channel === 'slack')).toBe(true);
      expect(routes.some((r) => r.channel === 'email')).toBe(true);
    });

    it('should apply custom routing rules', async () => {
      const router = new RoutingEngine(new SimpleTextLLMRouter(logger), logger);

      router.addRule({
        id: 'github-only',
        name: 'GitHub to Webhook',
        condition: (event) => event.source === 'github',
        routes: [
          {
            channel: 'webhook',
            template: 'github-webhook',
          },
        ],
      });

      const event: NotificationEvent = {
        id: 'gh-1',
        source: 'github',
        type: 'push',
        title: 'Push',
        description: '',
        payload: {},
        priority: 5,
        createdAt: new Date(),
        metadata: {},
      };

      const routes = await router.route(event);

      expect(routes.some((r) => r.channel === 'webhook')).toBe(true);
    });
  });

  describe('Priority Queue', () => {
    it('should process deliveries by priority', async () => {
      const queue = new PriorityQueueManager(1, logger); // Sequential to test ordering

      const executionOrder: number[] = [];

      const delivery1 = {
        id: 'd1',
        notificationId: 'n1',
        channel: 'slack',
        status: 'pending' as const,
        attemptCount: 0,
        metadata: { priority: 5 },
      };

      const delivery2 = {
        id: 'd2',
        notificationId: 'n2',
        channel: 'email',
        status: 'pending' as const,
        attemptCount: 0,
        metadata: { priority: 9 }, // Higher priority
      };

      // Pause so both deliveries are queued before processing starts
      queue.pause();

      // Queue lower priority first
      const first = queue.schedule(delivery1, async () => {
        executionOrder.push(1);
      });

      // Queue higher priority second
      const second = queue.schedule(delivery2, async () => {
        executionOrder.push(2);
      });

      queue.start();
      await Promise.all([first, second]);

      // Higher priority should execute first
      expect(executionOrder).toEqual([2, 1]);
    });
  });

  describe('Notification Hub', () => {
    it('should ingest and route events', async () => {
      let routed = false;

      hub.registerHandler('deliver-dashboard', async () => {
        routed = true;
      });

      const event = await hub.ingestEvent({
        source: 'api',
        type: 'test',
        title: 'Test Event',
        description: 'Test',
        priority: 5,
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();

      // Wait for async routing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(routed).toBe(true);
    });

    it('should track event status', async () => {
      hub.registerHandler('deliver-dashboard', async () => undefined);

      const event = await hub.ingestEvent({
        source: 'api',
        type: 'test',
        title: 'Status Test',
        description: '',
        priority: 5,
      });

      const status = hub.getEventStatus(event.id);

      expect(status).toBeDefined();
      expect(status.event).toBeDefined();
      expect(status.deliveries).toBeDefined();
    });

    it('should execute action handlers', async () => {
      let actionExecuted = false;

      hub.registerHandler('action-acknowledge', async () => {
        actionExecuted = true;
        return { acknowledged: true };
      });

      const result = await hub.executeAction('card-1', 'acknowledge', {
        eventId: 'e1',
      });

      expect(actionExecuted).toBe(true);
      expect(result.acknowledged).toBe(true);
    });

    it('should report hub statistics', async () => {
      hub.registerHandler('deliver-dashboard', async () => undefined);

      await hub.ingestEvent({
        source: 'api',
        type: 'test',
        title: 'Stat Test',
        description: '',
      });

      const stats = hub.getStats();

      expect(stats.events).toBeGreaterThanOrEqual(0);
      expect(stats.queue).toBeDefined();
      expect(stats.handlers).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple events in batch', async () => {
      hub.registerHandler('deliver-dashboard', async () => undefined);

      const events = await hub.processBatch([
        {
          source: 'api',
          type: 'batch-1',
          title: 'Event 1',
          description: '',
        },
        {
          source: 'api',
          type: 'batch-2',
          title: 'Event 2',
          description: '',
        },
        {
          source: 'api',
          type: 'batch-3',
          title: 'Event 3',
          description: '',
        },
      ]);

      expect(events).toHaveLength(3);
      expect(events.every((e) => e.id)).toBe(true);
    });
  });

  describe('Event Expiration', () => {
    it('should remove expired events during cleanup', async () => {
      const aggregator = new EventAggregator(10, 1000, logger);

      const now = new Date();
      const pastDate = new Date(now.getTime() - 60000); // 1 minute ago

      const event: NotificationEvent = {
        id: 'expired-1',
        source: 'api',
        type: 'test',
        title: 'Expired Event',
        description: '',
        payload: {},
        priority: 5,
        createdAt: pastDate,
        expiresAt: new Date(pastDate.getTime() + 30000), // Expired 30 seconds ago
        metadata: {},
      };

      aggregator.ingest(event);

      expect(aggregator.getEvent('expired-1')).toBeDefined();

      aggregator.removeExpiredEvents();

      expect(aggregator.getEvent('expired-1')).toBeUndefined();
    });
  });
});
