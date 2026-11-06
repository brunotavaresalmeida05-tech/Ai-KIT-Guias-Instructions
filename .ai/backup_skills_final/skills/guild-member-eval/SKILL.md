---
name: guild-member-eval
category: analysis
version: 1.0.0
description: Guild Member Eval workflow
tags:
- evaluation
- multi-agent
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

# Guild Member Eval

guild-member-eval
Agent performance evaluation using ECC's guild-member-eval patterns.
## Evaluation Criteria
### Quality Metrics
- **Accuracy**: Correct solutions, valid outputs
- **Completeness**: All requirements addressed
- **Efficiency**: Resource usage, time to completion
- **Security**: No vulnerabilities introduced
### Scoring System
- 90-100: Exceptional - Exceeds expectations
- 75-89: Strong - Meets requirements with minor issues
- 60-74: Adequate - Meets basic requirements
- Below 60: Needs improvement
## Usage
```bash
/investigate agent performance --agent=code-reviewer --task=security-audit
```
Or via API:
invokeSkill('guild-member-eval', {
  agent: 'architect',
  task: 'design-microservices',
  metrics: ['accuracy', 'completeness', 'security']
})