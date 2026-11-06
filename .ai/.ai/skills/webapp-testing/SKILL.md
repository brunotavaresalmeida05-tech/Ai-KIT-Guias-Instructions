---
name: webapp-testing
category: testing
version: 1.0.0
description: >
  Testes automatizados para aplicacoes web (E2E, integracao, componente).
  Baseado em Anthropics/skills webapp-testing.
tags:
  - testing
  - e2e
  - integration
  - playwright
  - cypress
  - component
  - web
when_to_use: |
  Use quando:
  - Testar aplicacoes web end-to-end
  - Testes de integracao de API
  - Testes de componente isolado
  - Validar fluxos de usuario
input:
  type: object
  properties:
    test_type:
      type: string
      enum: [e2e, integration, component, visual, accessibility]
      description: Tipo de teste
    framework:
      type: string
      enum: [playwright, cypress, vitest, jest]
      description: Framework de teste
    target_url:
      type: string
      description: URL da aplicacao a testar
    test_scenarios:
      type: array
      items:
        type: string
      description: Cenarios a testar
output:
  type: object
  properties:
    tests_created:
      type: boolean
      description: Se testes foram criados
    test_files:
      type: array
      items:
        type: string
      description: Arquivos de teste gerados
    run_command:
      type: string
      description: Comando para executar testes
    coverage_report:
      type: string
      description: Path do relatorio de cobertura
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 60
---

# WEBAPP TESTING

Testes automatizados para aplicacoes web.

## QUANDO USAR

- Testar aplicacoes web end-to-end
- Testes de integracao de API
- Testes de componente isolado
- Validar fluxos de usuario

## TIPOS DE TESTE

### e2e
Testes end-to-end simulando usuario real

### integration
Testes de integracao entre servicos

### component
Testes de componentes isolados

### visual
Testes de regressao visual

### accessibility
Testes de acessibilidade (WCAG)

## FRAMEWORKS

- Playwright (recomendado)
- Cypress
- Vitest (component)
- Jest

## SAIDA ESPERADA

Testes criados, arquivos gerados, comando de execucao, relatorio de cobertura.
