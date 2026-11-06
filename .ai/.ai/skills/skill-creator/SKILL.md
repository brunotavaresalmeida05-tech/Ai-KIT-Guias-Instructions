---
name: skill-creator
category: development
version: 1.0.0
description: >
  Criador de skills para o framework AI-KIT.
  Gera estrutura completa de skill com YAML frontmatter validado.
  Baseado em Anthropics/skills skill-creator.
tags:
  - skill
  - creator
  - generator
  - yaml
  - framework
  - template
when_to_use: |
  Use quando:
  - Criar nova skill para o AI-KIT
  - Validar estrutura de skill existente
  - Gerar template de skill
  - Documentar capacidades de skill
input:
  type: object
  properties:
    skill_name:
      type: string
      description: Nome da skill (kebab-case)
    category:
      type: string
      enum: [development, security, testing, analysis, operations]
      description: Categoria da skill
    description:
      type: string
      description: Descricao da funcionalidade
    tags:
      type: array
      items:
        type: string
      description: Tags para busca
    when_to_use:
      type: string
      description: Cenarios de uso
    input_schema:
      type: object
      description: Schema de entrada (JSON Schema)
    output_schema:
      type: object
      description: Schema de saida (JSON Schema)
output:
  type: object
  properties:
    skill_path:
      type: string
      description: Caminho da skill criada
    validation:
      type: object
      description: Resultado da validacao
    template_used:
      type: string
      description: Template utilizado
execution_time:
  min_seconds: 5
  max_seconds: 30
  typical_seconds: 10
---

# SKILL CREATOR

Criador de skills para o framework AI-KIT.

## QUANDO USAR

- Criar nova skill para o AI-KIT
- Validar estrutura de skill existente
- Gerar template de skill
- Documentar capacidades de skill

## ESTRUTURA DE SKILL

```
skill-name/
├── SKILL.md          # Frontmatter + documentação
```

## YAML FRONTMATTER OBRIGATORIO

```yaml
---
name: skill-name
category: development|security|testing|analysis|operations
version: 1.0.0
description: >
  Descricao multi-linha
tags:
  - tag1
  - tag2
when_to_use: |
  Use quando:
  - cenario 1
  - cenario 2
input:
  type: object
  properties:
    param:
      type: string
output:
  type: object
  properties:
    result:
      type: string
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 15
---
```

## SAIDA ESPERADA

Skill completa com validacao de schema.
