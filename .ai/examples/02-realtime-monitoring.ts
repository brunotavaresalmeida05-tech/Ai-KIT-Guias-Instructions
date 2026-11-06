// examples/02-realtime-monitoring.ts
/**
 * Example 2: Real-Time Monitoring with Alerts
 *
 * Demonstrates:
 * - Real-time event monitoring with Laya Hub
 * - Intelligent routing based on priority
 * - Action card generation and execution
 * - Multi-channel notifications
 * - System health checks
 */

import LayaHub, {
  RoutingEngine,
  ActionCardGenerator,
  EventAggregator,
  NotificationEvent,
} from '../src/laya/notification-hub';
import pino from 'pino';

const logger = pino();

/**
 * System Monitoring Setup
 *
 * Monitors:
 * - API health
 * - Database performance
 * - Cache hit rates
 * - Error rates
 * - Memory usage
 */

interface SystemMetrics {
  timestamp: Date;
  apiHealth: 'healthy' | 'degraded' | 'down';
  errorRate: number; // percentage
  dbLatency: number; // milliseconds
  cacheHitRate: number; // percentage
  memoryUsage: number; // percentage
  activeConnections: number;
}

async function runMonitoringDemo() {
  console.log('🚀 Starting Real-Time Monitoring System\n');

  const hub = new LayaHub(undefined, logger);

  // Setup notification handlers
  hub.registerHandler('deliver-slack', async (event, card) => {
    console.log(`💬 [SLACK] #monitoring`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Priority: ${event.priority}/10`);
    console.log(`   Actions: ${card.actions.map((a) => a.label).join(', ')}`);
    console.log();
  });

  hub.registerHandler('deliver-email', async (event, card) => {
    console.log(`📧 [EMAIL] alerts@company.com`);
    console.log(`   Subject: ${event.title}`);
    console.log(`   Body: ${event.description}`);
    console.log();
  });

  hub.registerHandler('deliver-dashboard', async (event, card) => {
    console.log(`📊 [DASHBOARD] Real-time alerts`);
    console.log(`   Event: ${event.type}`);
    console.log(`   Status: ${event.priority >= 8 ? '🔴 CRITICAL' : event.priority >= 6 ? '🟠 WARNING' : '🟢 INFO'}`);
    console.log();
  });

  hub.registerHandler('deliver-webhook', async (event, card) => {
    console.log(`🔗 [WEBHOOK] POST /alerts/events`);
    console.log(`   Payload size: ${JSON.stringify(event).length} bytes`);
    console.log();
  });

  // Setup action handlers
  hub.registerHandler('action-acknowledge', async (params) => {
    console.log(`✅ ACKNOWLEDGED by ${params.userId || 'system'}`);
    return { acknowledged: true, timestamp: new Date() };
  });

  hub.registerHandler('action-restart-service', async (params) => {
    console.log(`🔄 Restarting service: ${params.service}`);
    return { restarted: true, timestamp: new Date() };
  });

  hub.registerHandler('action-scale-up', async (params) => {
    console.log(`📈 Scaling up: ${params.service} (${params.count} instances)`);
    return { scaled: true, count: params.count };
  });

  hub.registerHandler('action-clear-cache', async (params) => {
    console.log(`🧹 Clearing cache: ${params.cacheType}`);
    return { cleared: true, itemsRemoved: Math.floor(Math.random() * 10000) };
  });

  hub.registerHandler('action-view-logs', async (params) => {
    console.log(`📋 Opening logs: ${params.logsUrl}`);
    return { opened: true, lines: 500 };
  });

  // Simulate metrics collection
  const generateMetrics = (): SystemMetrics => {
    return {
      timestamp: new Date(),
      apiHealth: Math.random() > 0.9 ? 'degraded' : 'healthy',
      errorRate: Math.random() * 5,
      dbLatency: Math.floor(Math.random() * 500 + 50),
      cacheHitRate: Math.random() * 30 + 70,
      memoryUsage: Math.random() * 80 + 20,
      activeConnections: Math.floor(Math.random() * 1000 + 100),
    };
  };

  // Event generation logic
  const generateAlerts = (metrics: SystemMetrics): Partial<NotificationEvent>[] => {
    const alerts: Partial<NotificationEvent>[] = [];

    // API health alert
    if (metrics.apiHealth === 'degraded') {
      alerts.push({
        source: 'monitoring',
        type: 'api-degraded',
        title: '⚠️  API Performance Degraded',
        description: 'API response times are above threshold',
        priority: 7,
        payload: {
          metric: 'api_latency',
          current: 450,
          threshold: 200,
          logsUrl: 'https://logs.company.com/api',
        },
      });
    }

    // High error rate
    if (metrics.errorRate > 1) {
      alerts.push({
        source: 'monitoring',
        type: 'high-error-rate',
        title: '🔴 ERROR RATE CRITICAL',
        description: `Error rate: ${metrics.errorRate.toFixed(2)}%`,
        priority: 9,
        payload: {
          metric: 'error_rate',
          current: metrics.errorRate,
          threshold: 1,
          service: 'api-v1',
        },
      });
    }

    // Database latency
    if (metrics.dbLatency > 300) {
      alerts.push({
        source: 'monitoring',
        type: 'db-slow-queries',
        title: '⏱️  Database Slow Queries',
        description: `DB latency: ${metrics.dbLatency}ms (threshold: 300ms)`,
        priority: 6,
        payload: {
          metric: 'db_latency_ms',
          current: metrics.dbLatency,
          threshold: 300,
        },
      });
    }

    // Low cache hit rate
    if (metrics.cacheHitRate < 70) {
      alerts.push({
        source: 'monitoring',
        type: 'cache-low-hit-rate',
        title: '📉 Cache Hit Rate Low',
        description: `Cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`,
        priority: 5,
        payload: {
          metric: 'cache_hit_rate',
          current: metrics.cacheHitRate,
          threshold: 70,
        },
      });
    }

    // High memory usage
    if (metrics.memoryUsage > 85) {
      alerts.push({
        source: 'monitoring',
        type: 'memory-high',
        title: '💾 Memory Usage High',
        description: `Memory: ${metrics.memoryUsage.toFixed(1)}%`,
        priority: 8,
        payload: {
          metric: 'memory_usage_percent',
          current: metrics.memoryUsage,
          threshold: 85,
        },
      });
    }

    // All systems nominal
    if (alerts.length === 0) {
      alerts.push({
        source: 'monitoring',
        type: 'all-systems-nominal',
        title: '✅ All Systems Nominal',
        description: 'System metrics are within normal parameters',
        priority: 2,
        payload: metrics,
      });
    }

    return alerts;
  };

  // Run monitoring loop
  console.log('📊 Monitoring system (10 sample cycles)\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (let i = 1; i <= 10; i++) {
    const metrics = generateMetrics();
    const alerts = generateAlerts(metrics);

    console.log(`\n📍 CYCLE ${i} - ${metrics.timestamp.toLocaleTimeString()}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log(`📈 Metrics:`);
    console.log(`   API Health: ${metrics.apiHealth}`);
    console.log(`   Error Rate: ${metrics.errorRate.toFixed(2)}%`);
    console.log(`   DB Latency: ${metrics.dbLatency}ms`);
    console.log(`   Cache Hit: ${metrics.cacheHitRate.toFixed(1)}%`);
    console.log(`   Memory: ${metrics.memoryUsage.toFixed(1)}%`);
    console.log(`   Connections: ${metrics.activeConnections}`);

    console.log(`\n🔔 Generated ${alerts.length} alert(s):`);

    // Process alerts
    for (const alert of alerts) {
      console.log(`\n   📬 Routing: ${alert.title}`);

      const event = await hub.ingestEvent(alert);

      // Show statistics
      const stats = hub.getStats();
      console.log(`      Queue size: ${stats.queue.size}`);
      console.log(`      Handlers: ${stats.handlers}`);
    }

    // Simulate action execution
    if (alerts.some((a) => (a.priority || 5) >= 8)) {
      console.log('\n   🚨 CRITICAL ALERT - Auto-executing remediation...');

      // Simulate action execution
      try {
        await hub.executeAction('card-1', 'acknowledge', {
          userId: 'auto-system',
        });

        if (Math.random() > 0.5) {
          await hub.executeAction('card-1', 'scale-up', {
            service: 'api',
            count: 3,
          });
        }
      } catch (error) {
        logger.debug('Action execution skipped (expected in demo)');
      }
    }

    // Wait between cycles
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Summary
  const hubStats = hub.getStats();
  console.log('📊 Monitoring Session Summary:');
  console.log(`   Total events processed: ${hubStats.events}`);
  console.log(`   Active handlers: ${hubStats.handlers}`);
  console.log(`   Queue statistics: ${JSON.stringify(hubStats.queue, null, 2)}`);

  console.log('\n✅ Real-time monitoring demo complete!\n');
}

// Run demo
runMonitoringDemo().catch((error) => {
  logger.error({ error: error.message }, 'Monitoring demo failed');
  process.exit(1);
});
