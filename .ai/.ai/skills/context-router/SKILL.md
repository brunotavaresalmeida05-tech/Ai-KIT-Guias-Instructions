---
name: context-router
category: development
version: 1.0.0
description: >
  Roteamento de contexto para selecionar habilidades (skills) apropriadas
  com base no prompt do usuario, tipo de tarefa e requisitos.
  Baseado em patterns de routagem de contexto AI-KIT.
tags:
  - routing
  - context
  - selection
  - skills
  - workflow
  - ai-kit
when_to_use: |
  Use quando:
  - Selecionar skill apropriada para uma tarefa
  - Rotear prompt para skill correta
  - Listar skills disponiveis por categoria
  - Validar se skill suporta o uso atual
  - Gerar recomendacoes de skill
input:
  type: object
  properties:
    action:
      type: string
      enum: [recommend, list-by-category, validate, search]
      description: Acao a executar
    task_description:
      type: string
      description: Descricao da tarefa
    category:
      type: string
      description: Categoria de skill
    search_term:
      type: string
      description: Termo de busca
output:
  type: object
  properties:
    recommended_skills:
      type: array
      items:
        type: object
      description: Skills recomendados
    skill_list:
      type: array
      items:
        type: string
      description: Lista de skills
    validation_result:
      type: object
      description: Resultado da validacao
execution_time:
  min_seconds: 1
  max_seconds: 30
  typical_seconds: 5
---

# CONTEXT ROUTER

Roteamento de contexto para selecao de skills.

## QUANDO USAR

- Selecionar skill apropriada para uma tarefa
- Rotear prompt para skill correta
- Listar skills disponiveis por categoria
- Validar se skill suporta o uso atual
- Gerar recomendacoes de skill

## ACOES

### recommend
Recomendar skills baseado em descricao da tarefa

### list-by-category
Listar skills de uma categoria especifica

### validate
Verificar se skill suporta um cenario

### search
Buscar skills por termo

## SAIDA ESPERADO

Lista de skills recomendados ou validacao satisfatoria.
