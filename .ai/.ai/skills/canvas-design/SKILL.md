---
name: canvas-design
category: development
version: 1.0.0
description: >
  Design de tela (canvas) usando HTML5 Canvas, SVG e bibliotecas de visualizacao.
  Baseado em Anthropics/skills canvas-design.
tags:
  - canvas
  - html5
  - visualization
  - svg
  - graphics
when_to_use: |
  Use quando:
  - Criar visualizacoes interativas
  - Desenhar em canvas HTML5
  - Gerar graficos dinamicamente
  - Projetar animacoes SVG
  - Manipular imagens no browser
input:
  type: object
  properties:
    canvas_type:
      type: string
      enum: [html5-canvas, svg, both]
      description: Tipo de canvas
    elements:
      type: array
      items:
        type: string
      description: Elementos a desenhar
    interactivity:
      type: boolean
      description: Ativar interatividade
    output:
      type: string
      enum: [html, svg, png]
      description: Formato de saida
output:
  type: object
  properties:
    html_file:
      type: string
      description: Arquivo HTML gerado
    svg_file:
      type: string
      description: Arquivo SVG gerado
    preview_url:
      type: string
      description: URL para visualizacao
execution_time:
  min_seconds: 5
  max_seconds: 90
  typical_seconds: 20
---

# CANVAS DESIGN

Design de tela com HTML5 Canvas e SVG.

## QUANDO USAR

- Criar visualizoes interativas
- Desenhar em canvas HTML5
- Gerar graficos dinamicamente
- Projetar animacoes SVG
- Manipular imagens no browser

## TIPOS DE CANVAS

### html5-canvas
Desenho raster via JavaScript

### svg
Gráficos vetoriais responsivos

### both
Combinacao de ambos

## SAIDA ESPERADO

Arquivos HTML e/ou SVG prontos para visualizacao.
