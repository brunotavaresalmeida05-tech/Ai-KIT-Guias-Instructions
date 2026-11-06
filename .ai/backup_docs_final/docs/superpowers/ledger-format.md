# Superpowers Development Ledger

## Purpose
Track progress, commits, reviews, and decisions during subagent-driven development.

## Ledger Entry Format

```
# SDD ledger — plan: docs/superpowers/plans/YYYY-MM-DD-<feature>.md

## Commits
| Hash | Summary | Author | Date |
|------|---------|--------|------|
| abc123 | Implement task 1 | AI | 2026-11-05 |
| def456 | Fix failing tests | AI | 2026-11-05 |

## Task Reviews
### Task 1: [Name]
- **Spec Compliance:** ✅/❌
- **Quality Findings:**
  - Critical: [issues]
  - Important: [issues]
  - Minor: [notes]
- **Ruling:** Ruling: [action] — [rationale] — [cost if wrong]

### Task 2: [Name]
(repeat)

## Rulings Summary
1. Ruling: [decision] — [why] — [cost if wrong]
2. ...

## Review History
- [timestamp] Task 1 reviewed by [reviewer/model]
- [timestamp] Task 2 completed after fix loop
- ...

## Final Status
- [ ] Ready for branch completion
- [ ] Needs more work
- [ ] Abandoned
```

## Ruling Template
```
Ruling: <what you decided> — <why> — <what it costs if wrong>
```

Example:
```
Ruling: Merge to main after final review — Reviewer confident, all checks pass — Could merge with missing edge case testing
```

## Notes
- Ledger entries are cumulative per plan
- Every task gets a review package
- Final review must be completed before branch completion
