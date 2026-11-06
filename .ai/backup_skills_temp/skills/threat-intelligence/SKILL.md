---
name: threat-intelligence
category: security
version: 1.0.0
description: >
  Integração com ferramentas de Threat Intelligence: MISP, IntelMQ, CIRCL, VirusTotal, AlienVault OTX, URLhaus, etc.
  Automação de coleta, enriquecimento, correlação e compartilhamento de IOCs/TTPs.
  Baseado em hslatman/awesome-threat-intelligence.
tags:
  - threat-intelligence
  - ioc
  - misp
  - intelmq
  - virustotal
  - alienvault
  - urlhaus
  - circl
  - osint
  - enrichment
  - correlation
  - sharing
  - stix
  - taxii
when_to_use: |
  Use quando:
  - Coletar IOCs de múltiplas fontes
  - Enriquecimento automatizado de indicadores
  - Integração com threat feeds públicos
  - Compartilhamento STIX/TAXII
  - Curadoria de IOCs para SIEM
  - Análise de ameaças em tempo real
  - Integração com MISP/Malware Bazaar
  - Validação de URLs/dominios suspeitos
  - Correlação de eventos de segurança
  - Alimentação de playbooks de resposta a incidentes
input:
  type: object
  properties:
    action:
      type: string
      enum: [collect, enrich, validate, share, correlate, lookup, feed, generate-report]
      description: Acao a executar
    ioc_type:
      type: string
      enum: [ip, domain, url, hash, email, process, mutex, yara, all]
      description: Tipo de IOC
    sources:
      type: array
      items:
        type: string
      description: Fontes de threat intel (VirusTotal, OTX, MISP, URLhaus, etc)
    output_format:
      type: string
      enum: [json, stix, csv, yaml, text]
      description: Formato de saida
    correlation_window:
      type: string
      description: Janela de correlacao (24h, 7d, 30d)
    confidence_threshold:
      type: number
      description: Threshold de confiabilidade (0.0-1.0)
output:
  type: object
  properties:
    enrichment_results:
      type: object
      description: Resultados de enriquecimento com fontes
    correlated_events:
      type: array
      items:
        type: object
      description: Eventos correlacionados
    stix_objects:
      type: array
      items:
        type: string
      description: Objetos STIX gerados
    feed_entries:
      type: array
      items:
        type: string
      description: Entradas processadas
    threat_report:
      type: string
      description: Relatorio completo de ameaça
execution_time:
  min_seconds: 5
  max_seconds: 300
  typical_seconds: 30
---

# THREAT INTELLIGENCE

Integração com ferramentas de Threat Intelligence para coleta, enriquecimento e compartilhamento de IOCs.

## QUANDO USAR

- Coletar IOCs de múltiplas fontes
- Enriquecimento automatizado de indicadores
- Integração com threat feeds públicos
- Compartilhamento STIX/TAXII
- Curadoria de IOCs para SIEM
- Análise de ameaças em tempo real
- Integração com MISP/Malware Bazaar
- Validação de URLs/dominios suspeitos
- Correlação de eventos de segurança
- Alimentação de playbooks de resposta a incidentes

## FERRAMENTAS INTEGRADAS

### Threat Intelligence Platforms
- **MISP** - Malware Information Sharing Platform
- **IntelMQ** - Threat intel processing ecosystem
- **CIRCL** - Luxembourg CERT threat intelligence
- **OTX** (AlienVault) - Open Threat Exchange
- **VirusTotal** - File and URL analysis
- **URLhaus** - Malicious URL database
- **Abuse.ch** - Threat intelligence feeds
- **ThreatMiner** - IP/Domain reputation
- **GreyNoise** - Internet background noise

### Standards & Formats
- **STIX/TAXII** - Structured Threat Information eXpression
- **OpenIOC** - FireEye IOC format
- **YARA** - Pattern matching rules
- **CSV/JSON** - Lightweight formats

### Feeds e Recursos
- **Malaysia CERT** - Regional threat intel
- **JPCERT** - Japan Computer Emergency Response Team
- **CERT-LU** - Luxembourg CERT feeds
- **ENISA** - European threat landscape
- **MITRE ATT&CK** - Adversarial tactics, techniques

## ACOES DIVERSAS

### collect
Coletar IOCs de fontes múltiplas

### enrich
Enriquecer IOCs com dados adicionais

### validate
Validar autenticidade de indicadores

### share
Compartilhar IOCs em formato STIX

### correlate
Correlacionar eventos entre IOCs

### lookup
Procurar IOCs na base de dados

### feed
Alimentar threat feeds

### generate-report
Gerar relatório completo de ameaça

## SAIDA ESPERADA

Objeto completo com IOCs enriquecidos, correlacionados, formatados em STIX/JSON.
