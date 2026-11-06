---
name: pptx
category: development
version: 1.0.0
description: >
  Criacao e manipulacao de apresentacoes em PowerPoint.
  Baseado em Anthropics/skills pptx.
tags:
  - presentation
  - pptx
  - slides
  - office
  - template
when_to_use: |
  Use quando:
  - Criar apresentacoes
  - Gerar slides automaticamente
  - Ajustar layout de slides
  - Incluir conteudo visual
  - Exportar para PDF
input:
  type: object
  properties:
    action:
      type: string
      enum: [create, add-slide, format, export, template]
      description: Acao a executar
    slides:
      type: array
      items:
        type: object
      description: Conteudo dos slides
    template:
      type: string
      description: Template a usar
    output_path:
      type: string
      description: Caminho de saida
output:
  type: object
  properties:
    pptx_path:
      type: string
      description: Caminho do arquivo criado
    slides_count:
      type: integer
      description: Numero de slides
    preview_url:
      type: string
      description: Preview da apresentacao
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 20
---

# PPTX

Criacao e manipulacao de apresentacoes em PowerPoint.

## QUANDO USAR

- Criar apresentacoes
- Gerar slides automaticamente
- Ajustar layout de slides
- Incluir conteudo visual
- Exportar para PDF

## FORMATO DE ENTRADA

```yaml
slides:
  - title: "Slide Title"
    content: "Bullet points or rich text"
    visuals: ["image.png", "chart.svg"]
```

## SAIDA ESPERADA

Arquivo PPTX com slides, contagem, preview.
