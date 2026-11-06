---
name: evaluate
description: Evaluate AI agent performance and quality
arguments:
  - name: agent
    description: "Agent to evaluate"
    required: true
  - name: task
    description: "Task the agent completed"
    required: true
  - name: metrics
    description: "Comma-separated metrics to evaluate"
    required: false
    default: "accuracy,completeness,security"
---

## /evaluate

Evaluate AI agent performance using guild-member-eval criteria.

### Usage
```
/evaluate --agent=code-reviewer --task="security audit" --metrics=accuracy,completeness,security
```

### Arguments
- `agent` - The agent to evaluate (e.g., code-reviewer, architect)
- `task` - The task the agent completed
- `metrics` - Comma-separated metrics: accuracy, completeness, security, efficiency (default: all)

### Workflow
1. Retrieves agent's task output
2. Evaluates against quality criteria
3. Scores each metric (0-100)
4. Provides strengths and improvements
4. Reports overall score and recommendations

### When to Use
- Post-task agent performance review
- Continuous agent quality monitoring
- Training data for agent improvement
- Quality gates for critical tasks

### Integration Points
- Uses `guild-member-eval` skill
- Feeds into `continuous-loop` for improvement
- Reports to `autonomy_catalog.json`
