---
name: theme-factory
category: development
version: 1.0.0
description: >
  Fabrica de temas - criar, editar e testar temas de aplicacoes, IDE e interfaces.
  Baseado em Anthropics/skills theme-factory.
tags:
  - theme
  - design-system
  - styling
  - customization
  - ui
when_to_use: |
  Use quando:
  - Criar tema de aplicacao
  - Customizar UI/UX
  - Gerar dark/light themes
  - Testar temas de IDE
  - Padronizar cores e estilos
input:
  type: object
  properties:
    theme_name:
      type: string
      description: Nome do tema
    base_colors:
      type: array
      items:
        type: string
      description: Cores base hex
    component_styles:
      type: array
      items:
        type: object
      description: Estilos de componentes
    output_format:
      type: string
      enum: [css, json, yaml, ts]
      description: Formato de saida
output:
  type: object
  properties:
    theme_files:
      type: array
      items:
        type: string
      description: Arquivos de tema criados
    css_variables:
      type: string
      description: Variaveis CSS
    preview:
      type: string
      description: Vista previa do tema
execution_time:
  min_seconds: 10
  max_seconds: 60
  typical_seconds: 20
---

# THEME FACTORY

Fabrica de temas.

## QUANDO USAR

- Criar tema de aplicacao
- Customizar UI/UX
- Gerar dark/light themes
- Testar temas de IDE
- Padronizar cores e estilos

## TIPOS DE TEMA

### light
Tema claro

### dark
Tema escuro

### high-contrast
Alta contraste

### colorblind
Para daltonistas

## SAIDA ESPERADO

Tema completo com arquivos e preview.
