---
name: continuous-loop
category: analysis
version: 1.0.0
description: >
  Autonomous workflow execution using ECC's continuous learning patterns.
tags:
  - workflow
  - ai-kit
  - autonomous
  - learning
when_to_use: "Execute when continuous loop is needed."
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

# CONTINUOUS LOOP

Autonomous workflow execution using ECC's continuous learning patterns.

## LOOP PATTERNS

### Continuous Learning Loop
Task → Generate → Evaluate → Improve → Repeat

### Generator-Evaluator Loop (GAN)
```
Generator → Evaluator → Generator → Evaluator → ...
```

### Santa Loop
Planning → Implementation → Testing → Evaluation → Planning (cycle)

## INTEGRATION WITH AI-KIT

- Memory: Persist iteration quality, improvements, termination reasons
- Events: Pre-iteration hooks, post-evaluation alerts, loop completion
- Skills: Works with qa-testing, security-audit, documentation-builder

## USAGE EXAMPLES

### Build Optimization Loop
1. Run test suite
2. Measure execution time
3. Optimizer proposes improvements
4. Evaluate new config
5. Continue until 20%+ improvement

### Security Improvement Loop
1. Generate security fixes
2. Scan with security tools
3. Score security posture
4. Iterate until threshold met

## CONFIGURATION

```yaml
qualityThreshold: 0.85
maxIterations: 10
timeoutSeconds: 300
checkpointInterval: 5
```