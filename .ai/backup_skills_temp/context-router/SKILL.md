---
name: context-router
category: analysis
version: 1.0.0
description: Context Router skill
tags:
- analysis
- routing
when_to_use: Quando esta skill for relevante para a tarefa.
input:
  type: object
  properties:
    task:
      type: string
output:
  type: object
  properties:
    result:
      type: string
execution_time:
  min_seconds: 5
  max_seconds: 300
  typical_seconds: 30
---

# Context Router

Context-Router Skill

> **Purpose:** Intelligently load only the necessary context for the current task.  
> Prevents context bloat and accelerates AI decision-making.

---

## 1. HOW THIS SKILL WORKS

When you receive a task, this skill:

1. **Analyzes** the task description
2. **Extracts** keywords (feature, module, layer, pattern)
3. **Loads** relevant files:
   - AGENTS.md (always)
   - Specific docs/decisions/ ADR
   - Specific code patterns
   - Specific test examples
4. **Declares** which skills are needed
5. **Executes** with minimal context overhead

---

## 2. TASK CLASSIFICATION

### Task Type → Context Loaded

| Task Type | Context | Skills Needed |
|-----------|---------|---------------|
| **Implement feature** | AGENTS.md, Feature spec, Design patterns, TDD setup | test-generator, code-review |
| **Fix bug** | AGENTS.md, Bug ticket, Related tests, Root cause analysis | test-generator, security-audit |
| **Refactor code** | AGENTS.md, Code file, Related tests, Performance metrics | code-review |
| **Security review** | AGENTS.md, Security policy, OWASP checklist, Threat model | security-audit |
| **Deploy** | AGENTS.md, Deployment checklist, Docker setup, CI/CD | deploy-manager |
| **Write tests** | AGENTS.md, Test examples, Coverage metrics | test-generator |
| **Code review** | AGENTS.md, Code review checklist, Design patterns | code-review |

---

## 3. SKILL DECLARATION

Before starting work, declare which skills you'll use:

```markdown
## Skills for This Task
- [x] test-generator    (write tests first)
- [x] code-review       (review after implementation)
- [ ] security-audit    (optional - not needed for UI feature)
- [ ] deploy-manager    (not needed - no deployment)
```

---

## 4. CONTEXT LOADING ALGORITHM

```yaml
LOAD ALWAYS:
  - .ai/AGENTS.md                    ← Single source of truth

LOAD IF KEYWORD MATCH:
  database:
    - Load: docs/ARCHITECTURE.md
    - Load: docs/decisions/db-choice.md
    - Load: Code examples: src/repository/
  
  authentication:
    - Load: docs/security/auth-flow.md
    - Load: docs/decisions/jwt-vs-oauth.md
    - Load: Code examples: src/middleware/auth.ts
  
  frontend:
    - Load: docs/ARCHITECTURE.md (frontend section)
    - Load: Code examples: apps/web/src/components/
  
  backend:
    - Load: docs/ARCHITECTURE.md (backend section)
    - Load: Code examples: apps/api/src/services/
  
  testing:
    - Load: docs/TESTING.md
    - Load: Test examples: tests/examples/
  
  security:
    - Load: .ai/docs/security-policy.md
    - Load: docs/OWASP-checklist.md
  
  deployment:
    - Load: .ai/docs/deployment.md
    - Load: infra/docker/
    - Load: .github/workflows/
  
  performance:
    - Load: docs/PERFORMANCE.md
    - Load: docs/decisions/caching-strategy.md

LOAD IF PHRASE MATCH:
  "I'm stuck":
    - Load: .ai/docs/TROUBLESHOOTING.md
    - Load: docs/COMMON-PROBLEMS.md
  
  "which approach":
    - Load: AGENTS.md (section 8 - Design Patterns)
    - Load: docs/decisions/ (all ADRs)
  
  "how do we":
    - Load: docs/ARCHITECTURE.md
    - Load: Relevant ADRs
```

---

## 5. EXAMPLE: FEATURE IMPLEMENTATION TASK

**User says:** "Implement user registration feature with email validation"

**Context-Router processes:**
```
Keywords detected: [feature, user, registration, email, validation]

Context to load:
  ✓ AGENTS.md                          (always)
  ✓ AGENTS.md section 9 (Features)     (find US-XXX)
  ✓ docs/decisions/auth-flow.md        (how we auth)
  ✓ src/services/user.service.test.ts  (test example)
  ✓ src/middleware/validation.ts       (validation patterns)
  ✓ docs/ARCHITECTURE.md               (frontend + backend flow)

Skills to use:
  ✓ test-generator                     (TDD - write test first)
  ✓ code-review                        (review before merge)
  ✓ security-audit                     (email validation = security)

Prohibited:
  ✗ Skip AGENTS.md section 7           (follow inviolable rules)
  ✗ Write code before test             (TDD mandatory)
  ✗ Commit without security review     (section 7 rule)
```

---

## 6. CONTEXT CACHE

To avoid recalculating context every turn:

1. **First task:** Load full context, cache it
2. **Same task continuation:** Reuse cache
3. **Different task:** Reload context (clear cache)
4. **Context size warning:** If >4000 tokens, summarize + cite source

---

## 7. WHEN TO RELOAD CONTEXT

**Reload context if:**
- [ ] User switches to different task/module
- [ ] AGENTS.md was updated
- [ ] New ADR was created
- [ ] Code structure changed significantly
- [ ] User explicitly says "refresh context"

**Don't reload if:**
- [ ] Continuing same feature implementation
- [ ] Small clarifications on current task
- [ ] Testing/debugging current feature

---

## 8. QUICK REFERENCE: CONTEXT KEYWORDS

### Code Layer Keywords
- **API endpoint** → Load: src/routes/, docs/API.md
- **Database** → Load: src/repository/, docs/decisions/db.md
- **Service** → Load: src/services/, AGENTS.md (Design Patterns)
- **Component** → Load: apps/web/src/components/, design system
- **Test** → Load: tests/examples/, docs/TESTING.md
- **Config** → Load: .env.example, infra/

### Phase Keywords
- **Planning** → Load: AGENTS.md section 13 (Phase 1)
- **Foundation** → Load: AGENTS.md section 13 (Phase 2), docker-compose.yml
- **Development** → Load: AGENTS.md section 13 (Phase 3), TDD guidelines
- **Quality** → Load: AGENTS.md section 13 (Phase 4), code-review checklist
- **Deploy** → Load: AGENTS.md section 13 (Phase 6), deploy-manager skill

### Problem Keywords
- **Slow query** → Load: docs/PERFORMANCE.md, docs/decisions/caching.md
- **Bug** → Load: AGENTS.md section 15 (Incident Response), related ticket
- **Security** → Load: .ai/docs/security-policy.md, OWASP checklist
- **Test fails** → Load: Test file, related test examples

---

## 9. USAGE IN CONVERSATION

**When user gives task:**

```
User: "Create login form validation"

Context-Router (me):
  Keywords: [login, form, validation]
  Loading context...
  
  📁 Loaded:
    - AGENTS.md
    - docs/ARCHITECTURE.md (frontend + auth section)
    - docs/security/input-validation.md
    - src/middleware/validation.ts (pattern example)
    - tests/auth.test.ts (test example)
  
  🎯 Skills:
    - test-generator (TDD first)
    - code-review (before merge)
    - security-audit (input validation = security-critical)
  
  ✅ Ready to proceed
```

---

## 10. FALLBACK: NO MATCHING CONTEXT

If keywords don't match any context files:

1. **Check AGENTS.md** — Is there a relevant section?
2. **Check docs/** — Any README that might help?
3. **Check code structure** — Find similar examples
4. **Ask user** — "I couldn't find specific context for [topic]. Should I:
   - a) Create a new doc?
   - b) Load general AGENTS.md?
   - c) Search code for examples?"

---

## 11. AI AGENT INSTRUCTIONS

When you see this skill loaded, follow these rules:

1. **Read AGENTS.md first** — Non-negotiable
2. **Load skills from this list** — Only use declared skills
3. **Cache context between turns** — Don't reload unnecessarily
4. **Declare skills upfront** — Before implementing
5. **Follow TDD** — Write test first (from AGENTS.md section 7)
6. **Reference source** — When citing context files
7. **Update AGENTS.md if needed** — After task completion

---

## 12. CONTEXT SIZE LIMITS

| Context Size | Action |
|--------------|--------|
| <2000 tokens | ✅ Load everything |
| 2000-4000 tokens | ✅ Load, cache for next turns |
| 4000-8000 tokens | ⚠️ Summarize + cite sources |
| >8000 tokens | ❌ Too much, ask user which context to prioritize |

---

**This skill prevents context bloat, ensures relevant information is always available, and speeds up AI decision-making.**

**Last Updated:** 2024-01-15  
**Status:** Active
---

## 13. SUPPERPOWERS INTEGRATION

### Superpowers Keywords

| Keyword | Context to Load | Skills to Use |
|---------|-----------------|---------------|
| **brainstorm** | docs/brainstorming/ | brainstorming |
| **plan** | docs/plans/, AGENTS.md | writing-plans |
| **TDD** | test files, docs/TESTING.md | test-driven-development |
| **subagent** | skills/subagent-driven-development/ | subagent-driven-development |
| **debug** | docs/TROUBLESHOOTING.md | debugging-loop |
| **review** | code-review skill, spec | requesting-code-review |
| **worktree** | git docs, infra/ | using-git-worktrees |
| **Red-Green-Refactor** | test patterns | test-driven-development |
| **Root Cause** | debugging docs | systematic-debugging |

### Superpowers Workflow Keywords

- **I need to implement...** → brainstorming → writing-plans → test-driven-development
- **The test is failing...** → debugging-loop → test-driven-development
- **Let me check this differently...** → systematic-debugging
- **Review my approach** → requesting-code-review
- **Parallel tasks** → subagent-driven-development

---

**Last Updated:** 2026-11-05  
**Status:** Active with Superpowers integration


### Incident Response Keywords
- **Ransomware response** → Load: skills/incident-response-toolkit/SKILL.md
- **Evidence collection** → skills/incident-response-toolkit/, skills/evidence-collection/
- **Memory dump** → skills/incident-response-toolkit/, skills/evidence-collection/
- **Log analysis** → skills/incident-response-toolkit/, skills/detection-rule-engine/
- **Playbook** → skills/incident-response-toolkit/, .ai/docs/awesome-incident-response/playbook-index.yaml
- **Forensics** → skills/incident-response-toolkit/, skills/evidence-collection/
- **Chain of custody** → skills/evidence-collection/, security-audit
- **Cloud incident** → skills/incident-response-toolkit/, .ai/docs/awesome-incident-response/playbook-index.yaml

