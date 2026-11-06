---
name: test-fix-loop
category: testing
version: 1.0.0
description: >
  Ciclo automatico de teste-correcao: executa o projeto, lê erros, corrige codigo, revalida ate tudo passar.
tags:
  - testing
  - debugging
  - quality
  - ci-cd
when_to_use: |
  Use quando:
  - Executar ciclo automatico de teste-correcao
  - Debugar builds falhando
  - Corrigir testes quebrados automaticamente
  - Validar mudancas de codigo
input:
  type: object
  properties:
    command:
      type: string
      description: Comando a executar
    max_attempts:
      type: integer
      description: Maximo de tentativas de correcao
    test_patterns:
      type: array
      items:
        type: string
      description: Patterns de testes que indicam sucesso
    output_format:
      type: string
      enum: [json, markdown, html]
      description: Formato de saida
output:
  type: object
  properties:
    attempts:
      type: integer
      description: Numero de tentativas realizadas
    corrections:
      type: array
      items:
        type: object
      description: Lista de correcoes aplicadas
    final_status:
      type: string
      description: Status final
    log:
      type: string
      description: Log completo da execucao
execution_time:
  min_seconds: 5
  max_seconds: 600
  typical_seconds: 120
---

# TEST FIX LOOP

Ciclo automatico de teste-correcao.

## QUANDO USAR

- Executar ciclo automatico de teste-correcao
- Debugar builds falhando

## SAIDA ESPERADA

Status final, correcoes aplicadas, log completo.
