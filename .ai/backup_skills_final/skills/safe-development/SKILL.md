---
name: safe-development
category: security
version: 1.0.0
description: >
  Guia de desenvolvimento seguro com prevenção de vulnerabilidades comuns, validação de entrada e testes de segurança.
tags:
  - security
  - secure-coding
  - devsecops
when_to_use: |
  Use quando:
  - Desenvolver funcionalidades web seguras
  - Implementar validação de entrada/saída
  - Revisar código para vulnerabilidades
  - Criar testes de segurança automatizados
input:
  type: object
  properties:
    action:
      type: string
      enum: [triage, score, capabilities, strings, ember-score, quark-score, enrich-iocs, generate-yara, ml-pipeline]
      description: Acao a executar
    sample_path:
      type: string
      description: Caminho da amostra
    ml_models:
      type: array
      items:
        type: string
      description: Modelos ML a usar
    output_format:
      type: string
      enum: [json, markdown, yaml, sarif, stix]
      description: Formato de saida
    severity_threshold:
      type: string
      enum: [low, medium, high, critical]
      description: Threshold de severidade
output:
  type: object
  properties:
    triage_report:
      type: object
      description: Relatorio de triagem completo
    ml_scores:
      type: object
      description: Scores dos modelos ML
    stix_objects:
      type: array
      items:
        type: string
      description: Objetos STIX gerados
execution_time:
  min_seconds: 5
  max_seconds: 120
  typical_seconds: 30
---

# SAFE DEVELOPMENT

Guia de desenvolvimento seguro.

## QUANDO USAR

- Desenvolver funcionalidades web seguras
- Criar testes de seguranca automatizados
- Validar entradas/saidas
- Prevenir vulnerabilidades comuns

## SAIDA ESPERADA

Relatorio de seguranca, codigos de validacao, scores ML.
