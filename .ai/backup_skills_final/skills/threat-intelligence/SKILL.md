---
name: threat-intelligence
category: security
version: 1.0.0
description: >
  Integracao com ferramentas de Threat Intelligence: MISP, IntelMQ, CIRCL, VirusTotal, AlienVault OTX, URLhaus.
tags:
  - threat-intelligence
  - ioc
  - security
when_to_use: |
  Use quando:
  - Coletar IOCs de multiplas fontes
  - Enriquecimento automatico de indicadores
  - Integrar threat feeds publicos
input:
  type: object
  properties:
    action:
      type: string
      enum: [collect, enrich, validate, share, correlate, lookup, feed, generate-report]
      description: Acao a executar
    ioc_type:
      type: string
      description: Tipo de IOC
    sources:
      type: array
      items:
        type: string
      description: Fontes de threat intel
    output_format:
      type: string
      enum: [json, stix, csv, yaml, text]
      description: Formato de saida
output:
  type: object
  properties:
    enrichment_results:
      type: object
      description: Resultados de enriquecimento
    stix_objects:
      type: array
      items:
        type: string
      description: Objetos STIX gerados
execution_time:
  min_seconds: 5
  max_seconds: 300
  typical_seconds: 30
---

# THREAT INTELLIGENCE

Integracao com Threat Intelligence.

## QUANDO USAR

- Coletar IOCs de fontes multiplo
- Enriquecimento automatico

## SAIDA ESPERADA

Objetos STIX, resultados de enriquecimento.
