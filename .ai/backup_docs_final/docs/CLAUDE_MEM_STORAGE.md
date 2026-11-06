# Claude-Mem storage reference

Last updated: 2026-11-03.

The active storage implementation is TypeScript. Start with [MEMORY](MEMORY.md) for backend selection and [API_REFERENCE](API_REFERENCE.md) for session/document requests.

Source locations:

- src/claude-mem/store/types.ts: backend interface and persisted state.
- src/claude-mem/store/factory.ts: backend construction.
- src/claude-mem/store/memory-store.ts: in-process storage.
- src/claude-mem/store/json-store.ts: single-instance file persistence.
- src/claude-mem/store/sqlite-store.ts: SQLite storage.
- src/claude-mem/store/postgres-store.ts and memory-service.ts: PostgreSQL adapter.
- src/claude-mem/embeddings.ts: embedding providers.

The earlier memory/*.js design and phased implementation status are obsolete. No automatic cross-client memory, tenant isolation, application-specific retention policy or encrypted file store is implied by the name Claude-Mem.
