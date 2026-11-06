# HTTP API reference

Last updated: 2026-11-03. The implemented contract is defined by src/api/routes/, src/api/schemas.ts and the running /openapi.json endpoint. Base URL for local development: http://127.0.0.1:3000.

## Authentication

When API_KEY is configured, send x-api-key or Authorization: Bearer on /api requests. Production requires a randomly generated key of at least 32 characters. A shared key grants access to the shared runtime; it is not user-level authorization. Configure identity and resource ownership separately for multi-user use.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Runtime health and selected providers |
| GET | /dashboard | Local operational dashboard |
| GET | /openapi.json | Machine-readable API description |
| GET | /metrics | Operational metrics; restrict exposure as appropriate |
| GET | /api/system/stats | Runtime statistics |
| POST | /api/workflows | Execute a validated workflow and return its final state |
| GET | /api/workflows | List workflows retained by this process |
| GET | /api/workflows/:id | Retrieve a retained workflow |
| POST | /api/memory/sessions | Create a session |
| POST | /api/memory/documents | Store content in an existing session |
| GET | /api/memory/search | Search with q and optional sessionId, type, limit, similarity |
| GET | /api/memory/sessions/:id/documents | List session documents |
| GET | /api/skills | Guidance catalog plus executable skills |
| POST | /api/skills/validate | Return the catalog validation report |
| GET | /api/skills/:id | Read guidance metadata and body |
| POST | /api/skills/:id/execute | Execute an explicitly registered skill handler |
| POST | /api/events | Ingest an event |
| GET | /api/events | List retained events |
| GET | /api/events/:id | Retrieve event status |
| POST | /api/events/:id/actions/:actionId | Execute a registered action |

## Workflow request

~~~json
{
  "name": "hello",
  "strategy": "sequential",
  "tasks": [
    { "name": "greeting", "type": "echo", "payload": { "message": "Hello" }, "retries": 0 }
  ]
}
~~~

Submit this body to POST /api/workflows. Inspect status and task errors in the returned workflow; an accepted HTTP request is not proof that every task succeeded. Available built-in types are documented in IMPLEMENTATION_GUIDE.md. Strategies are sequential, parallel and hybrid. Handlers with external effects should be idempotent or disable retries explicitly.

## Memory requests

POST /api/memory/sessions accepts an optional userId and ttl in seconds. Use the returned id as sessionId in POST /api/memory/documents:

~~~json
{
  "sessionId": "REPLACE_WITH_SESSION_UUID",
  "content": "Project decision: use the existing database.",
  "type": "context",
  "metadata": { "source": "project-decision" }
}
~~~

The placeholder is intentionally not a valid UUID. Replace it with the response value. Search with GET /api/memory/search?q=database&sessionId=REPLACE_WITH_SESSION_UUID. The userId field is metadata; it does not enforce resource ownership.

## Skills and events

Markdown catalog entries provide guidance. Executing one without a handler returns a validation error. Discover executable names with GET /api/skills; the runtime registers TextProcessing, DataValidation and DataTransformation. Their input contracts are in src/taste-skill/skill-framework.ts.

Event input requires source, type and title; source values are validated by src/api/schemas.ts. External delivery channels require registered handlers. The runtime's built-in acknowledge/dismiss actions do not send external notifications.

## Errors and limits

Errors use an error object with code, message and request context where available. Inputs are validated with Zod; JSON bodies are size-limited. Rate limits and CORS are configured at startup. Operational endpoints and host deployment controls require a separate exposure review.

### Rate Limiting

The runtime includes a standalone Rate Limit Server (src/rate_limit/server.py) with 10 REST endpoints for distributed rate limiting. See [RATE_LIMIT](RATE_LIMIT.md) for complete documentation including:

- Health and configuration endpoints
- Single and multi-layer rate limit checks
- Redis backend for distributed environments
- Python/FastAPI and Node.js/Express integration examples

The API does not expose the old /orchestrator/workflows paths, a GraphQL endpoint or WebSocket transport.
