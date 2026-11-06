---
name: agent-orchestration
category: analysis
version: 1.0.0
description: Multi-agent coordination using ECC's council, GAN, and continuous loop patterns.
tags:
  - workflow
  - ai-kit
  - multi-agent
  - orchestration
when_to_use: |
  Execute when agent orchestration is needed.
input:
  type: object
  properties:
    task:
      type: string
      description: Task to execute
output:
  type: object
  properties:
    result:
      type: object
      description: Result of execution
execution_time:
  min_seconds: 5
  max_seconds: 600
  typical_seconds: 30
---

# AGENT ORCHESTRATION

Multi-agent coordination using ECC's council, GAN, and continuous loop patterns.

## ORCHESTRATION PATTERNS

### Council Pattern (Multi-Model Consensus)
- Run multiple agents in parallel
- Synthesize outputs for consensus decisions
- Use cases: Architecture decisions, security reviews, requirements analysis

### GAN Pattern (Generator-Evaluator Loop)
- Generator creates solutions
- Evaluator critiques and scores
- Feedback loop until quality threshold

### Continuous Loop Pattern
- Autonomous workflows with checkpoints
- Quality evaluation per iteration
- Use cases: Build optimization, security iterations

### Sequential Pattern
- Agents chained in order
- Linear workflow execution
- Use cases: Feature development, bug fixing

## INTEGRATION POINTS

- Memory: Store agent outputs, loop history, decisions
- Events: Trigger on completion, checkpoints, consensus