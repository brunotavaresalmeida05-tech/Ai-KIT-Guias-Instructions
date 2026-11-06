---
name: optimize
description: Autonomous workflow optimization using continuous loops
arguments:
  - name: workflow
    description: "Workflow to optimize"
    required: true
  - name: goal
    description: "Optimization goal"
    required: false
    default: "time"
    choices: [time, cost, quality, tokens]
  - name: max-iterations
    description: "Maximum optimization iterations"
    required: false
    default: 10
  - name: threshold
    description: "Quality threshold to stop (0-1)"
    required: false
    default: 0.85
---

## /optimize

Run autonomous workflow optimization using continuous improvement loops.

### Usage
```
/optimize "build pipeline" --goal=time --max-iterations=15 --threshold=0.9
```

### Arguments
- `workflow` - The workflow or process to optimize
- `goal` - Optimization goal: time, cost, quality, or tokens (default: time)
- `max-iterations` - Maximum iterations to run (default: 10)
- `threshold` - Quality threshold to stop 0-1 (default: 0.85)

### Workflow
1. Runs baseline measurement
2. Proposes improvements
3. Evaluates each iteration
4. Continues until threshold met or max iterations
5. Returns optimized configuration

### When to Use
- Build performance tuning
- Security hardening iterations
- Configuration optimization
- Cost reduction

### Integration Points
- Uses `continuous-loop` skill
- Feeds `harness-optimizer` for specific improvements
- Reports to `autonomy_catalog.json`
