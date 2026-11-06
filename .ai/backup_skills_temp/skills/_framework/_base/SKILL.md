---
# Taste-Skill Framework — Base Template
# Universal skill definition format — all skills must follow this structure

name: skill-name
version: "1.0.0"
category: "category-name"  # e.g., development, testing, security, documentation
author: "Your Name"
created: "2026-10-08"
updated: "2026-10-08"

description: |
  One-line description of what this skill does.

tags:
  - tag1
  - tag2
  - tag3

# When to use this skill
when_to_use: |
  Describe the scenarios where this skill is most appropriate.
  - Scenario 1
  - Scenario 2
  - Scenario 3

# When NOT to use this skill
when_not_to_use: |
  Describe cases where this skill shouldn't be used.

# What this skill requires to work
requirements:
  - requirement1
  - requirement2
  - context: "Describe any context requirements"
  - permissions: "Any special permissions needed?"

# Input schema - what this skill expects
input:
  type: "object"
  required: ["primary_input"]
  properties:
    primary_input:
      type: "string"
      description: "Main input for this skill"
    options:
      type: "object"
      description: "Optional configuration"
      properties:
        depth:
          type: "string"
          enum: ["shallow", "standard", "deep"]
          default: "standard"

# Output schema - what this skill produces
output:
  type: "object"
  properties:
    result:
      type: "string"
      description: "Main output/result"
    artifacts:
      type: "array"
      description: "Files or data produced"
    metadata:
      type: "object"
      description: "Additional metadata"
    status:
      type: "string"
      enum: ["success", "partial", "failed"]

# Estimated execution time
execution_time:
  min_seconds: 30
  max_seconds: 300
  typical_seconds: 120

# Resource requirements
resources:
  cpu: "low|medium|high"
  memory_mb: 512
  disk_mb: 100
  network: false

# Dependencies on other skills
dependencies:
  - skill-name-1
  - skill-name-2

# Success criteria
success_criteria:
  - "Criterion 1"
  - "Criterion 2"
  - "Criterion 3"

# Common errors and how to handle them
error_handling:
  - error: "Error type 1"
    cause: "What causes this"
    solution: "How to fix it"
  - error: "Error type 2"
    cause: "What causes this"
    solution: "How to fix it"

# Examples of using this skill
examples:
  - name: "Example 1"
    input:
      primary_input: "Example input"
      options:
        depth: "standard"
    expected_output: "Expected result"
  - name: "Example 2"
    input:
      primary_input: "Another input"
    expected_output: "Expected result"

# Integration points
integrations:
  - system: "Integration 1"
    how: "How it integrates"
  - system: "Integration 2"
    how: "How it integrates"

# Related skills that work well together
related_skills:
  - skill-name-related-1
  - skill-name-related-2

# Notes and tips
notes: |
  - Tip 1
  - Tip 2
  - Tip 3

# Version history
changelog:
  - version: "1.0.0"
    date: "2026-10-08"
    changes:
      - "Initial release"

---

# SKILL IMPLEMENTATION

## Overview

Brief description of the skill and its purpose.

## How It Works

Step-by-step explanation of the skill's execution.

## Usage

```bash
# Command line usage
ai skill skill-name --input "value" --depth standard
```

```javascript
// Programmatic usage
const skill = require('skills/skill-name');
const result = await skill.execute({
  primary_input: 'value',
  options: { depth: 'standard' }
});
```

## Best Practices

- Practice 1
- Practice 2
- Practice 3

## Troubleshooting

### Issue 1
**Problem:** What happens
**Solution:** How to fix it

### Issue 2
**Problem:** What happens
**Solution:** How to fix it

## See Also

- Related skill: [skill-name](../skill-name/SKILL.md)
- Documentation: [Link]
- Examples: [Link]
