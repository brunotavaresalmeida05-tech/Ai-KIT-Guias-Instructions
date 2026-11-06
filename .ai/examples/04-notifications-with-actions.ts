// examples/04-notifications-with-actions.ts
/**
 * Example 4: Real-Time Notifications with Interactive Actions
 *
 * Demonstrates:
 * - Event-driven action cards
 * - Multi-channel notification delivery
 * - Interactive action execution
 * - User preferences and routing rules
 * - Integration between Strix, Taste-Skill, and Laya
 */

import LayaHub, {
  RoutingEngine,
  ActionCardGenerator,
  NotificationEvent,
  RoutingRule,
  SimpleTextLLMRouter,
} from '../src/laya/notification-hub';
import { SkillRegistry, SkillExecutor } from '../src/taste-skill/skill-framework';
import pino from 'pino';

const logger = pino();

/**
 * Notification Workflow:
 *
 * Event triggered → Route to channels → Generate action cards → User interacts → Execute action → Store result
 */

interface UserPreferences {
  userId: string;
  channels: string[];
  urgencyThreshold: number;
  actionPreferences: Record<string, any>;
}

interface NotificationResult {
  eventId: string;
  deliveryStatus: Record<string, 'sent' | 'failed'>;
  actionExecuted?: string;
  actionResult?: any;
}

async function runNotificationDemo() {
  console.log('🎯 Real-Time Notifications with Actions Demo\n');

  // Initialize
  const hub = new LayaHub(new SimpleTextLLMRouter(logger), logger);
  const skillRegistry = new SkillRegistry(logger);
  const skillExecutor = new SkillExecutor(skillRegistry, logger);

  // User preferences
  const userPreferences: UserPreferences = {
    userId: 'user-123',
    channels: ['slack', 'email', 'dashboard'],
    urgencyThreshold: 5,
    actionPreferences: {
      autoAcknowledge: false,
      autoRestart: true,
      notifyManager: true,
    },
  };

  console.log(`👤 User: ${userPreferences.userId}`);
  console.log(`📢 Channels: ${userPreferences.channels.join(', ')}`);
  console.log(`⚠️  Urgency Threshold: ${userPreferences.urgencyThreshold}\n`);

  // Setup notification handlers
  const deliveryLog: NotificationResult[] = [];

  hub.registerHandler('deliver-slack', async (event, card) => {
    console.log(`\n💬 [SLACK] Notification sent`);
    console.log(`   Channel: ${event.source === 'github' ? '#deployments' : '#alerts'}`);
    console.log(`   Message: ${event.title}`);
    console.log(`   Quick Actions: ${card.actions
      .filter((a) => a.type === 'primary')
      .map((a) => a.label)
      .join(', ')}`);
  });

  hub.registerHandler('deliver-email', async (event, card) => {
    console.log(`\n📧 [EMAIL] Notification sent`);
    console.log(`   To: ${userPreferences.userId}@company.com`);
    console.log(`   Subject: [${event.priority >= 8 ? 'URGENT' : 'INFO'}] ${event.title}`);
    console.log(`   Body preview: ${event.description.substring(0, 80)}...`);
  });

  hub.registerHandler('deliver-dashboard', async (event, card) => {
    console.log(`\n📊 [DASHBOARD] Alert card created`);
    console.log(`   Type: ${event.type}`);
    console.log(`   Available Actions: ${card.actions.map((a) => a.label).join(', ')}`);
  });

  hub.registerHandler('deliver-webhook', async (event, card) => {
    console.log(`\n🔗 [WEBHOOK] Event forwarded`);
    console.log(`   Endpoint: POST /webhooks/notifications`);
    console.log(`   Payload: ${JSON.stringify(event.payload).substring(0, 60)}...`);
  });

  // Setup action handlers
  hub.registerHandler('action-acknowledge', async (params) => {
    console.log(`\n✅ ACTION EXECUTED: Acknowledge Alert`);
    console.log(`   User: ${params.userId}`);
    console.log(`   Event ID: ${params.eventId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    return {
      action: 'acknowledge',
      status: 'success',
      timestamp: new Date(),
    };
  });

  hub.registerHandler('action-dismiss', async (params) => {
    console.log(`\n⏭️  ACTION EXECUTED: Dismiss Notification`);
    console.log(`   Event ID: ${params.eventId}`);
    console.log(`   Reason: ${params.reason || 'user-dismissed'}`);
    return {
      action: 'dismiss',
      status: 'success',
    };
  });

  hub.registerHandler('action-escalate', async (params) => {
    console.log(`\n🚀 ACTION EXECUTED: Escalate`);
    console.log(`   Event ID: ${params.eventId}`);
    console.log(`   New Priority: ${params.newPriority}`);
    console.log(`   Escalated to: ${params.escalateTo}`);
    return {
      action: 'escalate',
      status: 'escalated_to_management',
    };
  });

  hub.registerHandler('action-open-incident', async (params) => {
    console.log(`\n🎫 ACTION EXECUTED: Open Incident`);
    console.log(`   Title: ${params.title}`);
    console.log(`   Severity: ${params.severity}`);
    console.log(`   Assigned to: ${params.assignedTo}`);
    return {
      action: 'open_incident',
      incidentId: `INC-${Date.now()}`,
      status: 'created',
    };
  });

  hub.registerHandler('action-run-diagnostic', async (params) => {
    console.log(`\n🔍 ACTION EXECUTED: Run Diagnostic`);
    console.log(`   Service: ${params.service}`);
    console.log(`   Diagnostic Type: ${params.type}`);

    // Simulate diagnostic
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`   Status: Complete`);
    console.log(`   Result: ${Math.random() > 0.5 ? '✅ Healthy' : '⚠️  Issues found'}`);

    return {
      action: 'run_diagnostic',
      status: 'complete',
      healthy: Math.random() > 0.5,
    };
  });

  // Add custom routing rule
  const criticalRule: RoutingRule = {
    id: 'critical-multi-channel',
    name: 'Critical Events Multi-Channel',
    condition: (event) => event.priority >= 8,
    routes: [
      { channel: 'slack', template: 'critical-slack' },
      { channel: 'email', template: 'critical-email' },
      { channel: 'dashboard', template: 'critical-dashboard' },
      { channel: 'webhook', template: 'critical-webhook' },
    ],
  };

  // Note: In a real implementation, you'd add the rule to the router
  // For this demo, we'll manually show the routing logic

  // Define test notifications
  const testNotifications: Partial<NotificationEvent>[] = [
    {
      source: 'monitoring',
      type: 'database-error',
      title: '🚨 Database Connection Failed',
      description: 'Primary database connection is down. Failover initiated.',
      priority: 9,
      payload: {
        service: 'primary-db',
        errorCode: 'ECONNREFUSED',
        logsUrl: 'https://logs.company.com/db-error',
      },
    },
    {
      source: 'github',
      type: 'deployment-complete',
      title: '✅ Deployment Successful',
      description: 'Version 2.1.0 deployed to production',
      priority: 6,
      payload: {
        version: '2.1.0',
        environment: 'production',
        changeCount: 47,
      },
    },
    {
      source: 'api',
      type: 'quota-warning',
      title: '⚠️  API Quota Warning',
      description: 'You have used 85% of your monthly API quota',
      priority: 4,
      payload: {
        used: 8500,
        limit: 10000,
        resetDate: '2026-11-08',
      },
    },
    {
      source: 'system',
      type: 'security-scan',
      title: '🔒 Security Scan Results',
      description: 'Automated security scan found 2 vulnerabilities',
      priority: 8,
      payload: {
        vulnerabilities: 2,
        criticalCount: 0,
        highCount: 2,
        reportUrl: 'https://security.company.com/reports/scan-123',
      },
    },
    {
      source: 'monitoring',
      type: 'memory-pressure',
      title: '💾 Memory Pressure Detected',
      description: 'System memory usage at 92%',
      priority: 7,
      payload: {
        currentUsage: 92,
        threshold: 85,
        recommendation: 'Scale up or optimize code',
      },
    },
  ];

  // Process notifications
  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('📬 Processing Notifications\n');

  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];

    console.log(`\n📍 NOTIFICATION ${i + 1}/${testNotifications.length}`);
    console.log('─────────────────────────────────────────────────────────');

    console.log(`\n📢 Event: ${notification.title}`);
    console.log(`   Source: ${notification.source}`);
    console.log(`   Priority: ${notification.priority}/10`);
    console.log(`   Description: ${notification.description}`);

    // Ingest event
    const event = await hub.ingestEvent(notification);

    console.log(`\n🔀 Routing Decision:`);

    // Determine channels based on priority and rules
    let targetChannels = userPreferences.channels;

    if ((notification.priority || 0) >= 8) {
      console.log(`   ✅ Critical event - routing to ALL channels`);
      targetChannels = ['slack', 'email', 'dashboard', 'webhook'];
    } else if ((notification.priority || 0) >= 6) {
      console.log(`   ✅ High priority - routing to primary channels`);
      targetChannels = ['slack', 'dashboard'];
    } else if ((notification.priority || 0) >= userPreferences.urgencyThreshold) {
      console.log(`   ✅ Above threshold - routing to dashboard`);
      targetChannels = ['dashboard'];
    } else {
      console.log(`   ℹ️  Low priority - routing to dashboard only`);
      targetChannels = ['dashboard'];
    }

    console.log(`   Target channels: ${targetChannels.join(', ')}`);

    // Simulate delivery
    for (const channel of targetChannels) {
      // Simulate channel-specific handlers
      if (channel === 'slack') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        console.log(`   ✓ Slack notification queued`);
      } else if (channel === 'email') {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log(`   ✓ Email notification queued`);
      } else if (channel === 'dashboard') {
        console.log(`   ✓ Dashboard card created`);
      } else if (channel === 'webhook') {
        console.log(`   ✓ Webhook fired`);
      }
    }

    // Simulate user action (50% chance of interaction)
    if (Math.random() > 0.5) {
      console.log(`\n👤 User Action:`);

      const actions = ['acknowledge', 'dismiss', 'escalate', 'open-incident', 'run-diagnostic'];
      const selectedAction = actions[Math.floor(Math.random() * actions.length)];

      try {
        switch (selectedAction) {
          case 'acknowledge':
            await hub.executeAction(event.id, 'acknowledge', {
              userId: userPreferences.userId,
              eventId: event.id,
            });
            break;

          case 'dismiss':
            await hub.executeAction(event.id, 'dismiss', {
              eventId: event.id,
              reason: 'false-positive',
            });
            break;

          case 'escalate':
            await hub.executeAction(event.id, 'escalate', {
              eventId: event.id,
              newPriority: (notification.priority || 5) + 2,
              escalateTo: 'manager',
            });
            break;

          case 'open-incident':
            await hub.executeAction(event.id, 'open-incident', {
              title: `Incident: ${notification.title}`,
              severity: (notification.priority || 5) >= 8 ? 'critical' : 'high',
              assignedTo: 'on-call-engineer',
            });
            break;

          case 'run-diagnostic':
            await hub.executeAction(event.id, 'run-diagnostic', {
              service: (notification.payload as any).service || 'api',
              type: 'health-check',
            });
            break;
        }
      } catch (error) {
        console.log(`   ⚠️  Action execution note: ${(error as Error).message}`);
      }
    } else {
      console.log(`\n👤 User Action: None (notification auto-dismissed after 24h)`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Summary
  console.log('\n📊 Session Summary:\n');

  const hubStats = hub.getStats();
  console.log(`✅ Total events processed: ${hubStats.events}`);
  console.log(`💬 Active notification handlers: ${hubStats.handlers}`);
  console.log(`⏳ Queue status: ${JSON.stringify(hubStats.queue)}`);

  console.log('\n✨ Notification demonstration complete!\n');
}

// Run demo
runNotificationDemo().catch((error) => {
  logger.error({ error: error.message }, 'Notification demo failed');
  process.exit(1);
});
