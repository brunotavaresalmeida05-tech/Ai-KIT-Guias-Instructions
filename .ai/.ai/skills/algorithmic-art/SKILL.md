---
name: algorithmic-art
category: development
version: 1.0.0
description: >
  Geracao de arte e visualizacao algorithmic com Python, Processing e bibliotecas criativas.
  Baseado em Anthropics/skills algorithmic-art.
tags:
  - art
  - algorithmic
  - visualization
  - creative-coding
  - generative
when_to_use: |
  Use quando:
  - Criar arte generativa
  - Visualizar dados algoritmicamente
  - Gerar pads e padroes
  - Projetos de creative coding
input:
  type: object
  properties:
    style:
      type: string
      enum: [generative, abstract, geometric, data-viz, interactive]
      description: Estilo artistico
    algorithm:
      type: string
      description: Algoritmo a usar
    seed:
      type: string
      description: Seed aleatoria
    output_format:
      type: string
      enum: [png, svg, json, html]
      description: Formato de saida
output:
  type: object
  properties:
    artworks_created:
      type: integer
      description: Numero de artes criadas
    files:
      type: array
      items:
        type: string
      description: Arquivos gerados
    visualization_code:
      type: string
      description: Codigo de visualizacao
execution_time:
  min_seconds: 5
  max_seconds: 120
  typical_seconds: 30
---

# ALGORITHMIC ART

Geracao de arte e visualizacao algorithmic.

## QUANDO USAR

- Criar arte generativa
- Visualizar dados algoritmicamente
- Gerar padroes
- Projetos de creative coding

## ESTILOS

### generative
Arte baseada em algoritmos

### abstract
Conceitos abstratos visualizados

### geometric
Formas geometricas

### data-viz
Visualizacao de dados

### interactive
Interatividade no browser

## SAIDA ESPERADO

Artes geradas, codigos, arquivos de output.
