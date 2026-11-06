---
name: brand-guidelines
category: development
version: 1.0.0
description: >
  Guia de identidade de marca - cores, tipografia, logo usage, tone of voice.
  Baseado em Anthropics/skills brand-guidelines.
tags:
  - brand
  - design
  - identity
  - guidelines
  - marketing
when_to_use: |
  Use quando:
  - Definir identidade visual
  - Criar brand guidelines
  - Padronizar tone of voice
  - Documentar logo usage
  - Definir paleta de cores
input:
  type: object
  properties:
    brand_name:
      type: string
      description: Nome da marca
    brand_values:
      type: array
      items:
        type: string
      description: Valores da marca
    colors:
      type: array
      items:
        type: string
      description: Paleta de cores hex
    typography:
      type: array
      items:
        type: string
      description: Fontes a usar
output:
  type: object
  properties:
    guidelines_doc:
      type: string
      description: Documento de guidelines criado
    color_palette:
      type: string
      description: Paleta de cores no formato
    brand_assets:
      type: array
      items:
        type: string
      description: Ativos da marca
execution_time:
  min_seconds: 10
  max_seconds: 60
  typical_seconds: 20
---

# BRAND GUIDELINES

Guia de identidade de marca.

## QUANDO USAR

- Definir identidade visual
- Criar brand guidelines
- Padronizar tone of voice
- Documentar logo usage
- Definir paleta de cores

## ELEMENTOS

### Visual Identity
- Cores primarias e secundarias
- Tipografia
- Logo variations
- Imagens de marca

### Tone of Voice
- Voz da marca
- Linguagem
- Mensagem principal

## SAIDA ESPERADO

Documento de brand guidelines completo.
