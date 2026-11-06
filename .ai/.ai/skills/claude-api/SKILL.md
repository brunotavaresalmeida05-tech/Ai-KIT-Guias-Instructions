---
name: claude-api
category: development
version: 1.0.0
description: >
  Integracao com a API do Claude (Anthropic Messages API).
  Geracao de clientes, streaming, tool use, caching, token counting.
  Baseado em Anthropics/skills claude-api.
tags:
  - claude
  - api
  - anthropic
  - messages
  - streaming
  - tool-use
  - caching
  - tokens
when_to_use: |
  Use quando:
  - Integrar API do Claude em aplicacao
  - Implementar streaming de respostas
  - Usar tool use / function calling
  - Configurar prompt caching
  - Contar tokens e estimar custos
input:
  type: object
  properties:
    action:
      type: string
      enum: [generate-client, streaming-example, tool-use-example, caching-config, token-estimate]
      description: Acao a executar
    language:
      type: string
      enum: [python, typescript, javascript, go]
      description: Linguagem do cliente
    model:
      type: string
      description: Modelo a usar (opus, sonnet, haiku)
    features:
      type: array
      items:
        type: string
      description: Features a incluir
output:
  type: object
  properties:
    code_generated:
      type: boolean
      description: Se codigo foi gerado
    files:
      type: array
      items:
        type: string
      description: Arquivos gerados
    usage_example:
      type: string
      description: Exemplo de uso
    cost_estimate:
      type: object
      description: Estimativa de custo
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 15
---

# CLAUDE API

Integracao com a API do Claude (Anthropic Messages API).

## QUANDO USAR

- Integrar API do Claude em aplicacao
- Implementar streaming de respostas
- Usar tool use / function calling
- Configurar prompt caching
- Contar tokens e estimar custos

## FEATURES SUPORTADAS

### Mensagens
- Create message
- Streaming
- Multi-turn conversations

### Tool Use
- Function definitions
- Tool results handling
- Parallel tool calls

### Caching
- Prompt caching (ephemeral/1hr)
- Cache control headers

### Token Counting
- count_tokens endpoint
- Cost estimation

## MODELOS

- claude-opus-4-1
- claude-sonnet-4
- claude-haiku-3-5

## SAIDA ESPERADA

Cliente API funcional com exemplos e documentacao.
