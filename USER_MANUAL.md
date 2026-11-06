# AI-KIT User Manual
## Sistema Universal de Desenvolvimento Assistido por IA

**Version:** 2.1.0  
**Last Updated:** 2026-11-06

---

## TABLE OF CONTENTS

1. Introduction
2. System Requirements
3. Installation and Setup
4. Project Structure
5. Using Skills (Instructions)
6. Using the Runtime (Optional)
7. REST API Reference
8. Workflows
9. Memory and Embeddings
10. Agents and Orchestration
11. Integrations
12. Templates and Recipes
13. Security
14. Testing and Validation
15. Configuration
16. CLI Commands
17. Examples
18. Troubleshooting

---

## 1. Introduction

**What is AI-KIT?**

AI-KIT is a comprehensive AI-assisted development system combining:
- **Skills**: Markdown instruction files guiding development
- **Runtime**: Optional TypeScript Express/CLI for workflows, memory, and orchestration
- **Templates**: Infrastructure templates (Docker, CI/CD)
- **Recipes**: Implementation patterns

**What AI-KIT Does NOT Do:**
- Does not automatically install tools
- Does not create complete applications without human guidance
- Does not make Markdown skills executable by default
- Does not replace business logic in your project

---

## 2. System Requirements

### Minimum
- Node.js >= 22.13.0
- npm >= 10.x
- Git

### Recommended
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 7+
- Python 3.11+ (optional scripts)

### Verify Installation
```bash
node --version    # Should be >= 22.13.0
npm --version     # Should be >= 10
git --version     # Any recent version
```

---

## 3. Installation and Setup

### 3.1 Clone or Copy the Kit

```bash
# Option 1: Clone existing repo
git clone https://github.com/brunotavaresalmeida05-tech/Ai-KIT-Guias-Instructions.git
cd Ai-KIT-Guias-Instructions

# Option 2: Copy to empty project
cp -r /path/to/kit/. ./
```

### 3.2 Install Dependencies

```bash
# Install all dependencies
npm ci

# Or install manually
npm install
```

### 3.3 Configure Environment

Create `.env` file in the root:

```bash
# Production requirement
API_KEY=your_random_32_plus_character_key_here

# Optional
NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=3000

# LLM Provider Configuration
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

### 3.4 First Run

```bash
# Validate installation
npm run check

# Start development server
npm run dev

# Open in browser
# http://127.0.0.1:3000
# http://127.0.0.1:3000/dashboard
# http://127.0.0.1:3000/health
```

---

## 4. Project Structure

```
.
├── AGENTS.md              # Project instructions
├── QUICKSTART.md          # Quick start guide
├── USER_MANUAL.md         # This complete manual
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Test configuration
│
├── skills/                # Development instructions
│   ├── _framework/        # Framework base
│   ├── context-router/    # Context router
│   ├── code-review/       # Code review
│   ├── test-driven-development/
│   ├── security-audit/
│   └── ... (43 total skills)
│
├── agents/                # Agent profiles
│   ├── architect.md
│   ├── backend-specialist.md
│   ├── security-auditor.md
│   └── ...
│
├── src/                   # TypeScript source code
│   ├── api/               # REST API routes
│   ├── strix/             # Orchestrator
│   ├── claude-mem/        # Memory system
│   ├── workflows/         # Workflow service
│   └── ...
│
├── tests/                 # Test files
├── docs/                  # Documentation
├── recipes/               # Implementation recipes
├── examples/              # Code examples
└── scripts/               # Utility scripts
```

---

## 5. Using Skills (Instructions)

### What are Skills?

Skills are `SKILL.md` files with YAML frontmatter containing instructions for specific development tasks.

### How to Use Skills

1. **Read relevant skills** based on your task
2. **Follow the instructions** during development
3. **Validate your work** with `npm run cli -- validate`

### Key Skills by Category

#### Development
| Skill | Use Case |
|-------|----------|
| `architecture-first` | Planning system architecture |
| `writing-plans` | Creating detailed implementation plans |
| `test-driven-development` | Red-Green-Refactor cycle |
| `code-review` | Code review process |
| `debugging-loop` | Iterative debugging |

#### Security
| Skill | Use Case |
|-------|----------|
| `security-audit` | Security assessment |
| `code-auditor` | Automated code analysis |
| `malware-analysis` | Malware analysis workflows |
| `incident-response-toolkit` | Incident response procedures |

#### Quality
| Skill | Use Case |
|-------|----------|
| `test-fix-loop` | Automated test correction |
| `performance-tuning` | Performance optimization |
| `qa-testing` | Quality assurance testing |

### Skill Schema

Each skill follows this structure:
```yaml
---
name: skill-name
category: [development|security|testing|analysis]
version: 1.0.0
description: >
  Brief description
tags:
  - relevant
  - tags
when_to_use: |
  When to use this skill...
input:
  type: object
  properties:
    # Input parameters
output:
  type: object
  properties:
    # Output structure
execution_time:
  min_seconds: 1
  max_seconds: 60
---
# Skill Body
Detailed instructions...
```

---

## 6. Using the Runtime (Optional)

The runtime is an optional Express/CLI server for workflows, memory, and orchestration.

### Start the Server

```bash
npm run dev          # Development mode
npm start            # Production mode
```

### Verify Server Running

```bash
curl http://127.0.0.1:3000/health
# Expected: {"status":"ok",...}
```

### In Development Mode
- Hot reload enabled
- Dashboard at `/dashboard`
- API at `/api/`

---

## 7. REST API Reference

### Authentication

In production, set `API_KEY` (minimum 32 characters):

```bash
curl -H "x-api-key: YOUR_KEY" http://localhost:3000/api/workflows
# or
curl -H "Authorization: Bearer YOUR_KEY" http://localhost:3000/api/workflows
```

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/dashboard` | Operational dashboard |
| GET | `/openapi.json` | OpenAPI specification |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/system/stats` | Runtime statistics |

### Workflows API

```bash
# List workflows
GET /api/workflows

# Execute workflow
POST /api/workflows
{
  "name": "hello-world",
  "strategy": "sequential",
  "tasks": [
    {
      "name": "greeting",
      "type": "echo",
      "payload": { "message": "Hello World!" },
      "retries": 0
    }
  ]
}

# Get workflow result
GET /api/workflows/:id
```

### Memory API

```bash
# Create session
POST /api/memory/sessions
{
  "userId": "user-123",
  "ttl": 3600
}

# Store document
POST /api/memory/documents
{
  "sessionId": "uuid-here",
  "content": "Document content",
  "type": "context",
  "metadata": {"source": "project"}
}

# Search documents
GET /api/memory/search?q=keyword&sessionId=uuid
```

### Skills API

```bash
# List all skills
GET /api/skills

# Validate skill catalog
POST /api/skills/validate

# Execute skill
POST /api/skills/skill-name/execute
```

---

## 8. Workflows

### What are Workflows?

Sequential, parallel, or hybrid execution plans of tasks.

### Execution Strategies

| Strategy | Behavior |
|----------|----------|
| `sequential` | Tasks execute one after another |
| `parallel` | Tasks execute simultaneously |
| `hybrid` | Combination of sequential and parallel |

### Built-in Handlers

| Type | Description |
|------|-------------|
| `echo` | Returns payload |
| `delay` | Waits specified time |
| `memory.store` | Store document in memory |
| `memory.search` | Search memory |
| `skill.execute` | Execute a skill handler |
| `event.ingest` | Ingest an event |

### Example Workflow

```json
{
  "name": "deploy-checklist",
  "strategy": "sequential",
  "tasks": [
    {"name": "lint", "type": "echo", "payload": {"status": "ok"}},
    {
      "name": "test",
      "type": "echo", 
      "payload": {"result": "${lint.status}"},
      "retries": 2
    },
    {"name": "build", "type": "echo", "payload": {"ready": true}}
  ]
}
```
---

## 9. Memory and Embeddings

### Backends

| Backend | Storage | Use Case |
|---------|---------|----------|
| MemoryStore | RAM | Development, testing |
| JsonStore | JSON file | Small projects |
| SqliteStore | SQLite file | Local projects |
| PostgresStore | PostgreSQL | Production |

### Embeddings

| Provider | Use Case |
|----------|----------|
| HashEmbedding | Fast, local, no ML |
| OpenAI | Semantic search |
| Custom | Your implementation |

---

## 10. Agents and Orchestration

### Built-in Agent Profiles

Located in `agents/` directory:
- `architect` - System architecture planning
- `backend-specialist` - Backend development
- `frontend-specialist` - Frontend development
- `security-auditor` - Security review
- `test-writer` - Test creation
- `code-reviewer` - Code review
- `devops-specialist` - Infrastructure

### Using Agent Profiles

```bash
# In your prompt
"You are a backend-specialist. Follow skills/code-review/SKILL.md..."
```

### Orchestrator Example

```typescript
import Orchestrator from './src/strix/orchestrator';

const orchestrator = new Orchestrator();

// Register handler
orchestrator.registerHandler('my-task', async (payload) => {
  return { result: 'processed' };
});

// Register agent
orchestrator.registerAgent({
  name: 'worker',
  type: 'worker',
  skills: ['my-task'],
  status: 'idle',
  capabilities: {},
  maxConcurrent: 5
});

// Execute workflow
await orchestrator.executeWorkflow({
  name: 'demo',
  strategy: 'sequential',
  tasks: [{ name: 'task1', type: 'my-task', payload: {} }]
});
```

---

## 11. Integrations

AI-KIT integrates with 9 external repositories:

| Repository | Integration | File |
|------------|-------------|------|
| Anthropics/skills | 19 skills | `docs/ANTHROPIC-SKILLS-INTEGRATION.md` |
| Graphify-Labs/graphify | Knowledge graphs | `docs/GRAPHIFY-INTEGRATION.md` |
| obra/superpowers | Web artifacts | `docs/SUPERPOWERS-INTEGRATION.md` |
| Hamed233/Cybersecurity-Mastery-Roadmap | Learning path | `docs/CYBERSECURITY-ROADMAP-INTEGRATION.md` |
| Meirwah/awesome-incident-response | DFIR tools | `docs/INCIDENT-RESPONSE-INTEGRATION.md` |
| Cl CliftonLab/python-malware-analysis | Malware analysis | `docs/AWESOME-MALWARE-ANALYSIS-INTEGRATION.md` |
| hslatman/awesome-threat-intelligence | Threat intel | `docs/AWESOME-THREAT-INTELLIGENCE-INTEGRATION.md` |
| public-apis/public-apis | API directory | `docs/AWESOME-PUBLIC-APIS-INTEGRATION.md` |
| swisskyrepo/PayloadsAllTheThings | Security payloads | `docs/PAYLOADS-ALL-THE-THINGS-INTEGRATION.md` |

---

## 12. Templates and Recipes

### Available Recipes (21 total)

Located in `recipes/`:
1. JWT Authentication
2. OAuth2 Integration
3. Database Migrations
4. Error Handling & Logging
5. Rate Limiting
6. Redis Caching
7. GraphQL API
8. File Upload
9. Email Service
10. SMS Service
... up to recipe-21

### Infrastructure Templates

- `templates/docker/` - Docker configurations
- `templates/k8s/` - Kubernetes manifests
- `templates/ci/` - CI/CD workflows

---

## 13. Security

### Default Security Settings

- Server binds to `127.0.0.1` by default
- No authentication in development
- Rate limiting enabled
- Helmet.js headers

### Production Security

```bash
# Set production environment
NODE_ENV=production

# Set strong API key (min 32 chars)
API_KEY=$(openssl rand -base64 32)

# Use reverse proxy with TLS
# Configure CORS explicitly
# Restrict ports externally

# Run security checks
npm run security:audit
npm run security:trivy
npm run security:gitleaks
```

### Before External Exposure

- [ ] TLS at proxy level
- [ ] Firewall with minimal access
- [ ] CORS configured
- [ ] Rate limiting verified
- [ ] Health endpoints secured
- [ ] No sensitive data in logs

---

## 14. Testing and Validation

### Run All Tests

```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm run test:integration    # Integration tests only
```

### Current Test Status

```
Test Suites: 16 passed, 1 skipped
Tests:       160 passed, 10 skipped
Coverage:    85.85% statements, 86.61% functions
```

### Add New Skills

```bash
# 1. Copy template
cp skills/_framework/_base/SKILL.md skills/my-skill/SKILL.md

# 2. Edit SKILL.md with your instructions

# 3. Update router
# Edit skills/context-router/SKILL.md

# 4. Validate
npm run cli -- validate
```

---

## 15. CLI Commands

### Available Scripts

```bash
# Development
npm run dev                 # Start dev server
npm run build               # Build TypeScript
npm run start               # Start production server

# Testing
npm test                    # Run tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm run test:integration    # Integration tests

# Validation
npm run type-check          # TypeScript check
npm run lint                # ESLint
npm run check               # Full check (type-check, lint, test, build)

# Setup
npm run cli -- init <name>   # Initialize project
npm run cli -- validate      # Validate skills
npm run cli -- run <file>    # Run workflow file

# Security
npm run security:audit      # Dependency audit
npm run security:trivy      # Container scan
npm run security:gitleaks   # Secret detection
npm run security:license    # License check
```

---

## 16. Examples

### API Examples

```bash
# Health check
curl http://localhost:3000/health

# Execute workflow
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{"name":"test","strategy":"sequential","tasks":[{"name":"t1","type":"echo","payload":{"msg":"hi"}}]}'
```

### TypeScript Examples

**Create a workflow service:**
```typescript
import { WorkflowService } from './src/workflows/service';
```

**Register a handler:**
```typescript
orchestrator.registerHandler('processor', async (data) => {
  // Process data
  return { processed: true };
});
```

---

## 17. Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Authentication key (min 32 chars) | Production |
| `NODE_ENV` | development or production | No |
| `API_HOST` | Server host | No (default: 127.0.0.1) |
| `API_PORT` | Server port | No (default: 3000) |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `OLLAMA_BASE_URL` | Ollama server URL | Optional |
| `FALLBACK_ORDER` | Provider fallback order | Optional |

### .env.example

```bash
# Production: Set a secure API_KEY (min 32 characters)
API_KEY=change_me_in_production

# Environment
NODE_ENV=development

# Server
API_HOST=127.0.0.1
API_PORT=3000

# LLM Providers (at least one required for LLM features)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Fallback order (comma-separated)
FALLBACK_ORDER=openai,anthropic,ollama
```

---

## 18. Troubleshooting

### Common Issues

#### "AbortController is not defined"

Update Node.js to version >= 22.13.0:
```bash
node --version
```

#### "Cannot find module" errors

Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm ci
```

#### ESLint warnings about unused variables

This is acceptable - they're often in test files. Fix warnings by:
```bash
# Remove unused import
# Or prefix with underscore: const _unused = ...
```

#### Tests timing out

Increase timeout in jest.config.js:
```javascript
testTimeout: 60000 // 60 seconds
```

### Debug Mode

```bash
# Verbose logging
DEBUG=ai-kit:* npm run dev

# Test with verbose output
npm test -- --verbose
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start server | `npm run dev` |
| Run tests | `npm test` |
| Validate skills | `npm run cli -- validate` |
| Full check | `npm run check` |
| Build | `npm run build` |
| Health check | `curl http://localhost:3000/health` |
| Dashboard | http://localhost:3000/dashboard |

---

**AI-KIT v2.1.0** - Universal AI Development System  
Maintained with ❤️ by Claude Code