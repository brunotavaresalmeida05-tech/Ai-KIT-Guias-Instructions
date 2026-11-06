---
name: council
description: Multi-agent consensus decision making
arguments:
  - name: task
    description: "Task for council to evaluate"
    required: true
  - name: experts
    description: "Comma-separated list of expert agents"
    required: false
    default: "architect,code-reviewer,security-reviewer"
  - name: consensus-threshold
    description: "Required consensus percentage (0-100)"
    required: false
    default: 80
---

## /council

Run a multi-agent council for consensus-based decision making.

### Usage
```
/council "Review this API design for microservices" --experts=architect,security-reviewer,backend-specialist --threshold=85
```

### Arguments
- `task` - The task or question for the council to evaluate
- `experts` - Comma-separated list of expert agents (optional)
- `threshold` - Required consensus percentage 0-100 (optional, default: 80)

### Workflow
1. Distributes task to all expert agents
2. Collects independent evaluations
3. Synthesizes findings into consensus decision
4. Reports with confidence score

### When to Use
- Architecture decisions with multiple perspectives
- Security reviews requiring diverse viewpoints
- Code review with specialized expertise
- Requirements analysis across domains

### Integration Points
- Uses `agent-orchestration` skill with council pattern
- Stores decisions in `autonomy_catalog.json`
- Integrates with `documentation-builder` for decision docs
