---
name: frontend-design
category: development
version: 1.0.0
description: >
  Projetos e templates de design frontend com layout, componentes e estilos.
  Baseado em Anthropics/skills frontend-design.
tags:
  - frontend
  - design
  - ui
  - ux
  - components
  - layout
when_to_use: |
  Use quando:
  - Criar layout de aplicacao web
  - Projetar componentes UI
  - Definir sistema de design
  - Gerar templates responsivos
  - Estilizar com Tailwind ou CSS
input:
  type: object
  properties:
    design_type:
      type: string
      enum: [dashboard, landing, admin, app, responsive]
      description: Tipo de projeto
    components:
      type: array
      items:
        type: string
      description: Componentes a incluir
    theme:
      type: string
      enum: [light, dark, system]
      description: Tema de cores
    responsive:
      type: boolean
      description: Layout responsivo
output:
  type: object
  properties:
    project_path:
      type: string
      description: Caminho do projeto criado
    files:
      type: array
      items:
        type: string
      description: Arquivos gerados
    preview_url:
      type: string
      description: URL para preview
execution_time:
  min_seconds: 30
  max_seconds: 180
  typical_seconds: 60
---

# FRONTEND DESIGN

Projetos e templates de design frontend.

## QUANDO USAR

- Criar layout de aplicacao web
- Projetar componentes UI
- Definir sistema de design
- Gerar templates responsivos
- Estilizar com Tailwind ou CSS

## TIPOS DE PROJETO

### dashboard
Painel administrativo

### landing
Pagina de apresentacao

### admin
Interface de administracao

### app
Aplicacao web completa

### responsive
Layout mobile-first

## SAIDA ESPERADA

Projeto frontend completo com HTML, CSS e preview.
