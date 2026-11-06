---
name: evidence-collection
category: security
version: 1.0.0
description: >
  Coleta automatica de evidencias forenses usando KAPE, Velociraptor,
  GRR, FastIR e outras ferramentas da awesome-incident-response.
  Baseado em frameworks de coleta de evidencias DFIR.
tags:
  - forensics
  - evidence
  - kev
  - volatility
  - kape
  - velociraptor
  - grr
  - fastir
  - dfir
  - ir
when_to_use: |
  Use quando:
  - Coletar evidencias de sistemas Windows, Linux, macOS
  - Gerar playbooks automatizados de coleta
  - Criar targets/configs para KAPE/FastIR
  - Executar floes GRR/Velociraptor via API
  - Preservar cadeia de custodia (chain of custody)
  - Integrar com TheHive/Cortex para casos IR
input:
  type: object
  properties:
    action:
      type: string
      enum: [generate-targets, generate-configs, execute-collection, validate-evidence]
      description: Acao a executar
    os_target:
      type: string
      enum: [windows, linux, macos, cloud, all]
      description: Sistema operacional alvo
    incident_type:
      type: string
      description: Tipo de incidente (ransomware, data-breach, cloud-compromise)
    evidence_priority:
      type: string
      enum: [critical, high, medium, low]
      description: Prioridade dos artefatos
    tools:
      type: array
      items:
        type: string
      description: Ferramentas específicas a usar
output:
  type: object
  properties:
    collection_plan:
      type: object
      description: Plano de coleta com targets/configs
    generated_files:
      type: array
      items:
        type: object
      description: Arquivos gerados (targets, configs, scripts)
    execution_result:
      type: object
      description: Resultado da execucao da coleta
    custody_chain:
      type: object
      description: Cadeia de custodia das evidencias
execution_time:
  min_seconds: 2
  max_seconds: 120
  typical_seconds: 15
---

# EVIDENCE COLLECTION

Coleta automatica de evidencias forenses baseada em awesome-incident-response.

## QUANDO USAR

- Coletar evidencias de sistemas Windows/Linux/macOS
- Gerar playbooks automatizados de coleta
- Criar targets/configs para KAPE/FastIR
- Executar floes GRR/Velociraptor via API
- Preservar cadeia de custodia (chain of custody)
- Integrar com TheHive/Cortex para casos IR

## FERRAMENTAS SUPORTADAS

### Windows Evidence Collection
- KAPE: Triagem de artefatos (EventLogs, Registry, Prefetch, MFT)
- FastIR: Coleta modular por módulo
- DFIR ORC: Ferramentas especializadas

### Linux/MacOS Evidence Collection
- FastIR modules: logs, packages, users, cron
- LiME: Memory dump

### Cloud Evidence Collection
- AWS IR Runbooks, Prowler, ScoutSuite

## SAIDA ESPERADA

- Plano de coleta detalhado
- Targets/configs gerados
- Resultado da execucao
- Registro de custodia atualizado
