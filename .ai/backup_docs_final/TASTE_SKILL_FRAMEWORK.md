# Taste-Skill: guidance and execution

Last updated: 2026-11-03.

## Guidance catalog

Each skills/<name>/SKILL.md starts with YAML metadata and contains instructions. The loader and validator are in [src/skills/catalog.ts](../src/skills/catalog.ts). Metadata is checked against [skill-schema.json](../skills/_framework/skill-schema.json).

Use [the canonical base template](../skills/_framework/_base/SKILL.md) and [skill-creator](../skills/skill-creator/SKILL.md). From the runtime directory:

~~~sh
npm run cli -- skills
npm run cli -- validate
~~~

Schema validity proves structure, not the accuracy or safety of the instructions. Review referenced paths, supported commands and expected outcomes as well.

## Executable skills

The Skill, SkillRegistry, SkillExecutor and SkillComposer classes are in [skill-framework.ts](../src/taste-skill/skill-framework.ts). The runtime explicitly registers TextProcessing, DataValidation and DataTransformation.

A Markdown entry is not converted into a handler. The HTTP execute endpoint rejects a guidance-only skill. To add execution, implement a handler, register it and test its input, result, errors and external effects.

The old JavaScript loader/validator modules under skills/_framework are no longer the active implementation.
