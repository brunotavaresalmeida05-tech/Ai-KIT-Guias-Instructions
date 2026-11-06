# Laya event hub

Last updated: 2026-11-03.

The implementation is [notification-hub.ts](../src/laya/notification-hub.ts). Laya ingests events, selects routing and invokes registered delivery/action handlers. The runtime can use a configured LLM router or its local text-based router.

## What is available

Use the /api/events routes described in [API_REFERENCE](API_REFERENCE.md), or register handlers in code as shown by [04-notifications-with-actions.ts](../examples/04-notifications-with-actions.ts).

The runtime registers acknowledge and dismiss actions. A channel label such as slack, email or webhook does not by itself install credentials, deliver a message or authorize external communication. Register and test delivery handlers explicitly.

Events and routing state are process-local, not a durable distributed queue. Configure retries and idempotency around real delivery. Do not claim successful external notification solely because ingestion succeeded.

The previous laya/*.js modules and phase-completion diagrams are obsolete.
