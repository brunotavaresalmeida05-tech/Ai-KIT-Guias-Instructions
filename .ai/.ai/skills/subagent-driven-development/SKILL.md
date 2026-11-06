---
name: subagent-driven-development
category: development
version: 1.0.0
description: >
  Desenvolvimento com subagentes frescos por tarefa + revisao.
  Ledger obrigatorio para rastreamento. Baseado em Superpowers.
tags:
  - subagents
  - parallel
  - review
  - git-worktrees
  - superpowers
when_to_use: |
  Use quando:
  - Tarefas podem ser paralelizadas
  - Precisar de isolamento de workspace
  - Revisao de codigo e critica
  - Desenvolvimento multi-arquivo complexo
  - Integracao com multiplas equipes
input:
  type: object
  properties:
    task_brief:
      type: string
      description: Briefing da tarefa para subagente
    model_selection:
      type: string
      description: Modelo a usar
    review_criteria:
      type: array
      items:
        type: string
      description: Criticos de revisao
output:
  type: object
  properties:
    ledger_entry:
      type: object
      description: Entrada de ledger com commits e reproducoes
    review_package:
      type: object
      description: Pacote de revisao completo
    status:
      type: string
      description: Status da tarefa
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 60
---

# SUBAGENT-DRIVEN DEVELOPMENT

Desenvolvimento com subagentes frescos por tarefa + revisao.

## QUANDO USAR

- Tarefas podem ser paralelizadas
- Precisem de isolamento de workspace
- Revisao de codigo e critica
- Desenvolvimento multi-arquivo complexo
- Integracao com multiplas equipes

## SAIDA ESPERADA

Ledger atualizado, Commits, Reproducoes, Status
