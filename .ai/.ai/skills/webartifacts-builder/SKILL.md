---
name: webartifacts-builder
category: development
version: 1.0.0
description: >
  Construtor de artefatos web interativos (HTML/CSS/JS) para visualizacao e demonstracao.
  Baseado em Anthropics/skills web-artifacts-builder.
tags:
  - web
  - artifacts
  - html
  - css
  - javascript
  - interactive
  - visualization
when_to_use: |
  Use quando:
  - Criar demo interativa
  - Visualizar dados em browser
  - Build prototype UI
  - Gerar dashboard web
input:
  type: object
  properties:
    artifact_name:
      type: string
      description: Nome do artefato
    type:
      type: string
      enum: [dashboard, chart, form, demo, interactive]
      description: Tipo de artefato
    data:
      type: object
      description: Dados para o artefato
    libraries:
      type: array
      items:
        type: string
      description: Bibliotecas a usar (chart.js, d3, etc)
output:
  type: object
  properties:
    artifact_path:
      type: string
      description: Caminho do arquivo gerado
    preview_url:
      type: string
      description: URL para preview local
    dependencies:
      type: array
      items:
        type: string
      description: Dependencias instaladas
execution_time:
  min_seconds: 10
  max_seconds: 120
  typical_seconds: 30
---

# WEBARTIFACTS BUILDER

Construtor de artefatos web interativos.

## QUANDO USAR

- Criar demo interativa
- Visualizar dados em browser
- Build prototype UI
- Gerar dashboard web

## TIPOS DE ARTEFATO

### dashboard
Painel com metricas e graficos

### chart
Visualizacao de dados (bar, line, pie, scatter)

### form
Formulario interativo com validacao

### demo
Prototipo de funcionalidade

### interactive
Experiencia interativa customizada

## BIBLIOTECAS SUPORTADAS

- Chart.js
- D3.js
- Plotly
- Recharts
- Tailwind CSS
- Alpine.js

## SAIDA ESPERADA

Arquivo HTML/CSS/JS completo, pronto para abrir no browser.
