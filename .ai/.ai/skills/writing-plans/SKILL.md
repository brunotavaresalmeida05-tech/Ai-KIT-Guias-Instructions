---
name: writing-plans
category: development
version: 1.0.0
description: >
  Criacao de planos de implementacao granular antes de tocar codigo.
  Cada etapa = uma acao verificavel. Baseado em Superpowers com foco em TDD.
tags:
  - planning
  - development
  - tdd
  - task-breakdown
  - superpowers
when_to_use: |
  Use quando:
  - Ter especificacao ou requisitos para tarefa multi-etapa
  - Precisar de granularidade para TDD
  - Planejar integracao de codigo
  - Criar roadmap de desenvolvimento
  - Definir criterios de aceitacao claros
input:
  type: object
  properties:
    feature_name:
      type: string
      description: Nome da funcionalidade
    spec_path:
      type: string
      description: Caminho para especificacao/requisitos
    goals:
      type: array
      items:
        type: string
      description: Objetivos da implementacao
    constraints:
      type: array
      items:
        type: string
      description: Restricoes globais de projeto
output:
  type: object
  properties:
    plan_path:
      type: string
      description: Caminho do plano criado
    tasks:
      type: array
      items:
        type: object
      description: Lista de tarefas granularizadas
    tdd_checklist:
      type: object
      description: Checklist de verificacao TDD
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 15
---

# WRITING PLANS

Criacao de planos de implementacao granular antes de tocar codigo.

## QUANDO USAR

- Ter especificacao ou requisitos para tarefa multi-etapa
- Precisar de granularidade para TDD
- Planejar integracao de codigo
- Criar roadmap de desenvolvimento
- Definir criterios de aceitacao claros

## ESTRUTURA DO PLANO

Localizacao: docs/superpowers/plans/YYYY-MM-DD-<feature>.md

### Cabecalho Obrigatorio

- Nome da funcionalidade
- Data
- Objetivo claro
- Arquitetura
- Tech Stack
- Especificação
- Restrições globais
- Foco de revisão

## REGRA DE GRANULARIDADE

Cada passo deve ser executavel em 2-5 minutos e ter resultado verificavel.

## CHECKLIST TDD

- [ ] Cada função tem teste
- [ ] Testes foram assistidos falhando (RED)
- [ ] Implementação mínima para passar (GREEN)
- [ ] Refatoração com testes verdes (REFACTOR)
- [ ] Testes relevantes cobrem casos de borda

## SAIDA ESPERADA

Plano com tarefas granularizadas e checklist TDD preenchido.
