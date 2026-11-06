# Memory: persistence and context

Last updated: 2026-11-03.

The runtime stores sessions and documents through a MemoryBackend. It does not automatically inject past decisions into an unrelated assistant session. A client must store and retrieve relevant context explicitly.

## Select a backend

| Backend | Persistence | Appropriate use |
|---|---|---|
| memory | Process lifetime | Tests and temporary local work |
| json | Local JSON file | A single runtime instance |
| sqlite | Local database | Local persistent workflows |
| postgres | External PostgreSQL | Integration requiring a shared database |

Configure MEMORY_BACKEND and the corresponding path or DATABASE_URL. See [GETTING_STARTED](GETTING_STARTED.md). JSON is not a multi-process database. Test backup/restore and retention before storing valuable data.

EMBEDDING_PROVIDER=hash is local and deterministic; it is not a semantic language model. Cloud/local model providers have their own availability, privacy and configuration requirements. Changing embedding provider or dimensions requires a considered migration/re-indexing strategy; do not mix representations blindly.

## API lifecycle

Create a session, store documents using its id, then query with explicit session filters. The API contract is in [API_REFERENCE](API_REFERENCE.md). userId is metadata, not an authorization boundary. Do not store separate tenants in a shared-key runtime expecting automatic isolation.

The backend implementations are in [src/claude-mem/store](../src/claude-mem/store). Tests cover backend contracts, but real PostgreSQL/Ollama integration must be enabled and provisioned separately.

## Key files

- [src/claude-mem/memory-service.ts](../src/claude-mem/memory-service.ts) - Main MemoryService class with embeddings, sessions, and semantic search
- [src/claude-mem/store/json-store.ts](../src/claude-mem/store/json-store.ts) - JSON file backend with concurrent write support
- [src/claude-mem/store/postgres-store.ts](../src/claude-mem/store/postgres-store.ts) - PostgreSQL backend with pgvector support
