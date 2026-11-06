---
name: detection-rule-engine
category: security
version: 1.0.0
description: >
  Motor de regras de deteccao Sigma/YARA/Chainsaw/Hayabusa.
  Conversao, validacao e execucao de regras de deteccao.
  Baseado em awesome-incident-response.
tags:
  - detection
  - sigma
  - yara
  - chainsaw
  - hayabusa
  - rules
  - siem
  - ir
when_to_use: |
  Use quando:
  - Converter regras Sigma para multiplos SIEMs
  - Validar e testar regras YARA
  - Gerar queries Chainsaw/Hayabusa
  - Criar templates de regras baseados em ATT&CK
  - Automatizar deploy de regras em SIEMs
input:
  type: object
  properties:
    action:
      type: string
      enum: [convert, validate, generate, test, deploy]
      description: Acao a executar
    rule_format:
      type: string
      enum: [sigma, yara, chainsaw, hayabusa]
      description: Formato da regra
    source:
      type: string
      description: Regra fonte ou caminho do arquivo
    target_siem:
      type: string
      enum: [elastic, splunk, kql, spl, lucene, gremlin, logpoint, clickhouse]
      description: SIEM alvo para conversao
    attck_technique:
      type: string
      description: ID da tecnica ATT&CK (ex: T1059.001)
output:
  type: object
  properties:
    converted_rule:
      type: string
      description: Regra convertida para o SIEM alvo
    validation_result:
      type: object
      properties:
        valid:
          type: boolean
        errors:
          type: array
          items:
            type: string
        warnings:
          type: array
          items:
            type: string
      description: Resultado da validacao
    generated_queries:
      type: array
      items:
        type: string
      description: Queries gerados para Chainsaw/Hayabusa
    deployment_status:
      type: object
      description: Status do deploy no SIEM
execution_time:
  min_seconds: 2
  max_seconds: 60
  typical_seconds: 10
---

# DETECTION RULE ENGINE

Motor de regras de deteccao para Sigma, YARA, Chainsaw e Hayabusa.

## QUANDO USAR

- Converter regras Sigma para multiplos SIEMs
- Validar e testar regras YARA
- Gerar queries para Chainsaw/Hayabusa
- Criar templates baseados em ATT&CK
- Deploy automatizado em plataformas SIEM

## FORMATOS SUPORTADOS

### Sigma
- Formato YAML para SIEMs
- Tags ATT&CK, severity, logsources

### YARA
- Pattern matching para malware
- Rules com condition e strings

### Chainsaw/Hayabusa
- Windows event log queries
- Fast forensics timeline

## SAIDA ESPERADA

- Regra convertida/validada/gerada
- Relatorio de validacao
- Status de deploy
- Queries para Chainsaw/Hayabusa
