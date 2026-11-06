# Superpowers Workflow Diagram

## 7-Step Development Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     USER REQUEST                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. BRAINSTORMING                                          │
│    - Clarify intent                                         │
│    - Present 2-3 approaches                                 │
│    - Get design approval                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. USING-GIT-WORKTREES                                      │
│    - Create isolated workspace                              │
│    - Clean test baseline                                    │
│    - Setup ledger                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. WRITING PLANS                                            │
│    - Create granular tasks (2-5 min each)                   │
│    - Define files, interfaces, steps                          │
│    - TDD checklist                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SUBAGENT-DRIVEN DEVELOPMENT                           │
│    - Dispatch implementer per task                        │
│    - Review package generation                              │
│    - Ledger updates                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. TEST-DRIVEN DEVELOPMENT                               │
│    - RED: Write failing test                                │
│    - GREEN: Minimal implementation                          │
│    - REFACTOR: Clean while tests pass                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. REQUESTING-CODE-REVIEW                                 │
│    - Spec compliance check                                  │
│    - Quality assessment                                     │
│    - Ruling documentation                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. FINISHING-A-DEVELOPMENT-BRANCH                         │
│    - Final review                                           │
│    - Merge/PR/discard                                       │
│    - Cleanup                                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  FEATURE COMPLETE   │
              └─────────────────────┘
```

## Decision Points

### When to Use Subagents
- ✅ Tasks with clear specs
- ✅ Multiple independent tasks
- ✅ Parallelizable work

### When NOT to Use Subagents
- ❌ Vague requirements
- ❌ Architecture decisions
- ❌ Final review
- ❌ Security-sensitive changes

## Loop Patterns

```
NORMAL LOOP: Task → Review → Complete
FIX LOOP: Task → Review(failed) → Fix → Re-review → Complete
BLOCKED: Task → BLOCKED → Context needed → Resume/Discard
```
