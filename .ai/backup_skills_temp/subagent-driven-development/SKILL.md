---
name: subagent-driven-development
category: development
version: 1.0.0
description: >
  Desenvolvimento com subagentes frescos por tarefa + revisao.
  Ledger obrigatorio para rastreamento. Basado em Superpowers.
tags:
  - subagents
  - parallel
  - review
  - git-worktrees
  - superpowers
when_to_use: |
  Use quando:
  - Tarefas podem ser paralelizadas
  - Precisem de isolamento de workspace
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
      description: Modelo a usar (mechanical|integration|architecture|fix-loop)
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
      description: Status: DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED
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

## PRINCIPIOS

### Loop por Tarefa
1. Setup -> Dispatch Implementer -> Review -> Fix -> Complete

### REGRAS OBRIGATORIAS

- NEVER dispatch multiple implementers in parallel
- NEVER skip task review - spec compliance AND task quality required
- NEVER accept implementer self-review as replacement
- ALWAYS specify model explicitly when dispatching
- ALWAYS use BASE commit for review packages
- NEVER pre-judge reviewer findings

## SELECAO DE MODELOS

Tipo de Tarefa | Modelo
--------------|--------
Mecanico (1-2 arquivos, spec claro) | Barato/rapido
Integracao/julgamento (multi-arquivo) | Padrao
Arquitetura/design/revisao final | Mais capaz
Looping de fix 4-5 | Um nivel acima do implementador travado

## Condicoes de Parada

1. Operacao irreversivel/destrutiva
2. Acao sensivel a seguranca
3. Efeito colateral fora do worktree (merge, push, publish)
4. Plano tão quebrado que toda path é adivinhação

## Ledger Obrigatorio

Primeira linha: # SDD ledger — plan: <caminho do plano>
Rastrear: Commits, Reproducoes, Decisões (rulings)

Formato de Ruling: Ruling: <decisao> — <por que> — <custo se errado>

## SAÍDA ESPERADA

Ledger atualizado, Commits, Reproducoes, Status, Rulings
