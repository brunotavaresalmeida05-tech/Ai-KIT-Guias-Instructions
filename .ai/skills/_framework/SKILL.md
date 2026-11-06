---
name: _framework
category: development
version: 1.0.0
description: >
  Framework base para desenvolvimento de skills no AI-KIT.
  Define estrutura, validacao, schema de entrada/saida e metadados.
  Template para criar novas skills.
tags:
  - framework
  - template
  - base
  - infrastructure
  - development
when_to_use: |
  Use quando:
  - Criar nova skill para o AI-KIT
  - Validar estrutura de skill existente
  - Entender formato de skill
  - Gerar template de skill novo
  - Atualizar framework de skills
input:
  type: object
  properties:
    action:
      type: string
      enum: [validate, generate-template, update-schema]
      description: Acao a executar
    skill_name:
      type: string
      description: Nome da skill para gerar
    output_path:
      type: string
      description: Caminho de saida
output:
  type: object
  properties:
    validation_passed:
      type: boolean
      description: Se validacao passou
    schema_validated:
      type: boolean
      description: Se schema esta valido
    template_generated:
      type: string
      description: Caminho do template gerado
    errors:
      type: array
      items:
        type: string
      description: Erros encontrados
execution_time:
  min_seconds: 2
  max_seconds: 30
  typical_seconds: 10
---

# FRAMEWORK BASE

Framework base para desenvolvimento de skills.

## QUANDO USAR

- Criar nova skill para o AI-KIT
- Validar estrutura de skill existente
- Entender formato de skill
- Gerar template de skill novo
- Atualizar framework de skills

## ESTRUTURA DE SKILL

```
skill-name/
├── SKILL.md          # Frontmatter + documentacao
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

## CAMPO name (Obrigatorio)
- kebab-case
- unico no sistema
- usado como chave de identificacao

## CAMPO category (Obrigatorio)
- development
- security
- testing
- analysis
- operations

## CAMPO version (Obrigatorio)
- Formato semantico: MAJOR.MINOR.PATCH
- Ex: 1.0.0, 1.1.0, 2.0.0

## CAMPO description (Obrigatorio)
- Texto multi-linha (> 50 chars)
- Descricao clara da funcionalidade

## CAMPO tags (Obrigatorio)
- Array de strings
- Para busca e filtragem
- Max 10 tags

## CAMPO when_to_use (Obrigatorio)
- Texto formatado com `|` para multi-linha
- Listar cenarios de uso

## CAMPO input (Obrigatorio)
- JSON Schema object
- Define estrutura de entrada

## CAMPO output (Obrigatorio)
- JSON Schema object
- Define estrutura de saida

## CAMPO execution_time (Obrigatorio)
- min_seconds: tempo minimo esperado
- max_seconds: tempo maximo esperado
- typical_seconds: tempo tipico

## SAIDA ESPERADA

Validacao de schema e status da skill.
