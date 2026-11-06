---
name: harness-optimizer
category: development
version: 1.0.0
description: Harness Optimizer workflow
tags:
- optimization
- performance
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

# Harness Optimizer

harness-optimizer
Workflow and harness optimization using ECC's continuous learning patterns.
## Optimization Targets
### Performance
- Reduce API calls
- Minimize token usage
- Speed up iteration cycles
### Cost
- Model selection optimization
- Caching strategies
- Parallel execution
### Quality
- Reduce iterations needed
- Improve first-pass success rate
- Enhance output quality gates
## Usage
```bash
/harness-optimize workflow --type=build --goal=time
```
Or via API:
invokeSkill('harness-optimizer', {
  workflow: 'ai-development',
  metrics: ['execution_time', 'token_usage', 'cost'],
  constraints: { max_time: 300, min_quality: 0.85 }
})
## Integration Points
- Uses continuous-loop for iterative optimization
- Feeds into autonomy_catalog for tracking
- Reports to development workflows