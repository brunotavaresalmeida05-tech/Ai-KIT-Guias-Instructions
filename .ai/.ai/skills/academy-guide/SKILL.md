---
name: academy-guide
category: education
version: 1.0.0
description: >
  Guia para estudo e certificacao com caminhos de aprendizado estruturados.
  Baseado em Anthropics/skills academy-guide.
tags:
  - education
  - learning
  - certification
  - roadmap
  - study-plan
when_to_use: |
  Use quando:
  - Criar plano de estudo
  - Definir caminho de certificacao
  - Gerar roadmap de aprendizado
  - Preparar para exam
  - Acompanhar progresso
input:
  type: object
  properties:
    goal:
      type: string
      description: Objetivo de aprendizado
    timeframe_weeks:
      type: integer
      description: Tempo disponivel
    starting_point:
      type: string
      description: Nivel atual
    preferred_resources:
      type: array
      items:
        type: string
      description: Recursos preferidos (books, courses)
output:
  type: object
  properties:
    study_plan:
      type: object
      description: Plano de estudo detalhado
    resources:
      type: array
      items:
        type: string
      description: Recursos recomendados
    milestones:
      type: array
      items:
        type: object
      description: Marcadores de progresso
    estimated_completion:
      type: string
      description: Data estimada
execution_time:
  min_seconds: 10
  max_seconds: 120
  typical_seconds: 30
---

# ACADEMY GUIDE

Guia para estudo e certificacao.

## QUANDO USAR

- Criar plano de estudo
- Definir caminho de certificacao
- Gerar roadmap de aprendizado
- Preparar para exam
- Acompanhar progresso

## ESTRUTURA DO PLANO

- Overview do objetivo
- Recursos necessarios
- Cronograma por semanas
- Exames a passar
- Milestones de estudo

## SAIDA ESPERADO

Plano de estudo personalizado com recursos e timeline.
