# Laya integration guide

Last updated: 2026-11-03.

See [LAYA_HUB](LAYA_HUB.md) for the current event runtime and [API_REFERENCE](API_REFERENCE.md) for HTTP operations.

To integrate an external channel, define the delivery contract, configure credentials outside source control, register a handler, test delivery in an authorized environment and handle retries/idempotency. Preserve user authorization boundaries: ingestion of an event is not permission to send a message.

Provider availability, rate limits, authentication and retention are deployment responsibilities. The kit does not automatically connect accounts or guarantee team awareness.
