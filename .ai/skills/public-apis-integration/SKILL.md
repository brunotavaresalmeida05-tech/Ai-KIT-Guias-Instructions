---
name: public-apis-integration
category: development
version: 1.0.0
description: >
  Integracao com mais de 200+ APIs publicas gratis para desenvolvimento de IA.
  Foco em APIs para ML/AI, processamento de texto, documentacao e ferramentas.
tags:
  - apis
  - public
  - ml
  - ai
  - integration
when_to_use: |
  Use quando:
  - Integrar APIs publicas em aplicacoes
  - Processar texto com NLP
  - Gerar conteudo com IA
  - Validar dados
input:
  type: object
  properties:
    action:
      type: string
      enum: [generate-client, call-api, integrate-sdk, validate-config]
      description: Acao a executar
    api_name:
      type: string
      description: Nome da API
    use_case:
      type: string
      description: Caso de uso da API
output:
  type: object
  properties:
    client_code:
      type: string
      description: Codigo do cliente gerado
    api_config:
      type: object
      description: Configuracao da API
    examples:
      type: array
      items:
        type: string
      description: Exemplos de uso
execution_time:
  min_seconds: 5
  max_seconds: 120
  typical_seconds: 30
---

# PUBLIC APIS INTEGRATION

Integracao com APIs publicas para IA.

## QUANDO USAR

- Integrar APIs publicas em aplicacoes
- Processar texto com NLP
- Gerar conteudo com IA

## SAIDA ESPERADA

Cliente funcional, configuracao, exemplos.
