---
name: implementation-plan
category: analysis
version: 1.0.0
description: >
  Decompõe uma feature ou sistema em tarefas sequenciais concretas com inputs.
tags:
- planning
- implementation
- design
when_to_use: Antes de implementar para planear a abordagem técnica.
input:
  type: object
  properties:
    requirements:
      type: array
      items:
        type: string
output:
  type: object
  properties:
    plan:
      type: string
    steps:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 30
---

# Implementation Plan

# IMPLEMENTATION PLAN

## QUANDO USAR
Após arquitectura aprovada, antes de implementar.

## O QUE FAZ
Produz um plano ordenado de tarefas com critérios claros de conclusão.

## FORMATO DO PLANO

```markdown
## PLANO: [Nome da Feature]

### Fase 1 — Fundação
- [ ] Task 1.1: [descrição]
  - Input: [o que precisa]
  - Output: [o que produz]
  - Test: [como validar]
  - Estimativa: [XS/S/M/L]

### Fase 2 — Core
- [ ] Task 2.1: ...

### Fase 3 — Integração & Polish
- [ ] Task 3.1: ...

### Fase 4 — Validação
- [ ] Todos os testes passam
- [ ] Code review feito
- [ ] Security review feito
- [ ] Documentação actualizada
```

## GUARDRAILS

```
ALWAYS quebrar em tarefas de máx. 2h de trabalho
ALWAYS definir critério de "done" por tarefa
NEVER saltar Fase 4 (validação)
IMPORTANT cada tarefa deve ter pelo menos 1 teste associado
```

## SAÍDA ESPERADA
Ficheiro `docs/plan-[feature].md` com plano completo.