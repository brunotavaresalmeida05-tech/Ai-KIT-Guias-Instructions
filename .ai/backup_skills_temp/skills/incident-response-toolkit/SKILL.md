---
name: incident-response-toolkit
category: security
version: 1.0.0
description: >
  Toolkit completo de resposta a incidentes (DFIR) baseado no awesome-incident-response.
  Catálogo curado de 20+ categorias cobrindo o ciclo de vida completo: adversary emulation,
  coleta de evidências, análise de memória, logs, gestão de incidentes, playbooks,
  sandboxing, engenharia reversa e threat intelligence.
tags:
  - incident-response
  - dfir
  - forensics
  - malware-analysis
  - threat-intelligence
  - playbooks
  - soc
  - edr
  - soar
when_to_use: |
  Use quando precisar de:
  - Selecionar ferramentas para cada fase de resposta a incidentes
  - Montar cadeias de ferramentas (toolchains) por tipo de incidente
  - Referenciar playbooks para ransomware, data breach, cloud compromise
  - Mapear técnicas ATT&CK para ferramentas de detecção/emulação
  - Planejar coleta de evidências por SO (Windows/Linux/macOS)
  - Gerar runbooks executáveis para plataformas SOAR
input:
  type: object
  properties:
    incident_type:
      type: string
      description: Tipo de incidente (ransomware, data-breach, cloud-compromise, malware, insider-threat)
    phase:
      type: string
      description: Fase DFIR (preparation, detection, containment, eradication, recovery, lessons-learned)
    os_target:
      type: string
      description: Sistema operacional alvo (windows, linux, macos, cloud)
    goal:
      type: string
      description: Objetivo (tool-selection, playbook-generation, evidence-plan, attack-mapping, timeline-analysis)
output:
  type: object
  properties:
    toolchain:
      type: array
      items:
        type: object
        properties:
          category:
            type: string
          tools:
            type: array
            items:
              type: string
          description:
            type: string
      description: Cadeia de ferramentas recomendada por categoria
    playbook_template:
      type: string
      description: Template de playbook baseado em referências (AWS IR, PagerDuty, etc.)
    evidence_plan:
      type: object
      properties:
        windows:
          type: array
          items:
            type: string
        linux:
          type: array
          items:
            type: string
        macos:
          type: array
          items:
            type: string
        cloud:
          type: array
          items:
            type: string
      description: Plano de coleta de evidências por SO
    attck_mapping:
      type: array
      items:
        type: object
        properties:
          technique_id:
            type: string
          technique_name:
            type: string
          tools:
            type: array
            items:
              type: string
      description: Mapeamento ATT&CK para ferramentas
    timeline_workflow:
      type: string
      description: Workflow de análise de timeline (Plaso + Timesketch)
execution_time:
  min_seconds: 3
  max_seconds: 60
  typical_seconds: 10
---

# INCIDENT RESPONSE TOOLKIT

Toolkit completo de resposta a incidentes (DFIR) baseado no awesome-incident-response.

## QUANDO USAR

- Selecionar ferramentas para cada fase de resposta a incidentes
- Montar cadeias de ferramentas por tipo de incidente
- Referenciar playbooks para ransomware, data breach, cloud compromise
- Mapear técnicas ATT&CK para ferramentas de detecção/emulação
- Planejar coleta de evidências por SO (Windows/Linux/macOS)
- Gerar runbooks executáveis para plataformas SOAR

## CATEGORIAS PRINCIPAIS

### 1. Adversary Emulation
| Ferramenta | Uso |
|------------|-----|
| Atomic Red Team | Executar técnicas ATT&CK para teste |
| Caldera | Plataforma automatizada de emulação |
| Metta | Gerar eventos de segurança realistas |

### 2. Plataformas All-In-One
| Ferramenta | Uso |
|------------|-----|
| GRR Rapid Response | Forense remota ao vivo |
| Velociraptor | Visibilidade e coleta em endpoints |
| TheHive | Plataforma de resposta a incidentes |
| IRIS | Plataforma de resposta a incidentes |
| Limacharlie | Plataforma de segurança com EDR |

### 3. Coleta de Evidências
| Ferramenta | Uso |
|------------|-----|
| KAPE | Triagem de artefatos digitais prevalentes |
| FastIR | Coleta rápida para resposta a incidentes |
| CyLR | Coleta de artefatos para análise forense |
| DFIR ORC | Coleta automatizada de evidências |
| ir-rescue | Scripts de coleta automatizada |

### 4. Análise de Memória
| Ferramenta | Uso |
|------------|-----|
| Volatility 3 | Framework de extração de memória volátil |
| Rekall | Framework de análise de memória |
| MemProcFS | Forense de memória via filesystem |

### 5. Análise de Logs
| Ferramenta | Uso |
|------------|-----|
| Hayabusa | Análise rápida de logs de eventos Windows |
| Chainsaw | Análise rápida de logs (Rust) |
| Sigma | Formato genérico de regras de detecção |
| Zircolite | Avaliação standalone de regras Sigma |
| Plaso/log2timeline | Criação de super timeline |
| Timesketch | Plataforma de análise de timeline colaborativa |

### 6. Gestão de Incidentes
| Ferramenta | Uso |
|------------|-----|
| TheHive | Plataforma IR com gestão de casos |
| FIR | Resposta a incidentes rápida |
| RTIR | Request tracker para IR |
| Shuffle | Plataforma SOAR |

### 7. Playbooks e Runbooks
| Recurso | Foco |
|---------|------|
| AWS IR Runbook Samples | Resposta a incidentes na nuvem |
| Counteractive | Playbooks de resposta a incidentes |
| PagerDuty IR Documentation | Runbooks operacionais |
| ThreatHunter-Playbook | Playbooks de threat hunting |

### 8. Sandboxing e Engenharia Reversa
| Ferramenta | Uso |
|------------|-----|
| Cuckoo | Análise automatizada de malware |
| Ghidra | Framework de engenharia reversa |
| CAPA | Detecção de capacidades de malware |
| Joe Sandbox | Análise de malware na nuvem |

### 9. Análise de Rede
| Ferramenta | Uso |
|------------|-----|
| Zeek | Monitor de segurança de rede |
| Suricata | IDS/IPS/NSM |
| Arkime | Captura completa de pacotes |
| NetworkMiner | Forense de rede |

### 10. Análise de Disco e Arquivos
| Ferramenta | Uso |
|------------|-----|
| Autopsy | Plataforma de forense digital |
| Sleuth Kit | Análise de sistema de arquivos |
| FTK Imager | Imagem de disco |
| bulk_extractor | Carving de arquivos |

### 11. Threat Intelligence
| Ferramenta | Uso |
|------------|-----|
| MISP | Plataforma de threat intelligence |
| OpenCTI | Plataforma de threat intelligence |
| YARA | Pattern matching para malware |

## TOOLCHAINS POR TIPO DE INCIDENTE

### Ransomware
```
1. Containment: Isolamento de rede, EDR block
2. Evidence: KAPE (Windows), FastIR (Linux), Volatility (memory)
3. Analysis: Hayabusa/Chainsaw (logs), YARA (malware), Sigma (detection)
4. Recovery: Backup validation, decryptor search
4. Lessons: Root cause, ATT&CK mapping
```

### Data Breach
```
1. Detection: SIEM alerts, threat intel
2. Evidence: KAPE, FastIR, Arkime (network), Cloud logs
3. Analysis: Timesketch (timeline), Plaso (super timeline)
4. Containment: Access revocation, credential rotation
5. Notification: Legal, regulatory compliance
```

### Cloud Compromise
```
1. Detection: CloudTrail, GuardDuty, Falco
2. Evidence: Cloud IR Runbooks, ScoutSuite, Prowler
3. Analysis: Cloud logs, container forensics (Falco)
4. Containment: IAM revocation, security group changes
```

### Malware/Insider Threat
```
1. Detection: EDR, UEBA, YARA
2. Evidence: Volatility (memory), Autopsy (disk), CAPA (capabilities)
3. Analysis: Ghidra (reversing), Cuckoo (behavioral)
4. Attribution: Threat intel (MISP, OpenCTI), ATT&CK mapping
```

## MAPEAMENTO ATT&CK PARA FERRAMENTAS

| Tática | Técnica | Ferramentas |
|--------|---------|-------------|
| Reconnaissance | T1590/T1595 | Amass, Shodan, Nmap |
| Initial Access | T1190/T1566 | Atomic Red Team, Metta |
| Execution | T1059/T1053 | Metta, Atomic Red Team |
| Persistence | T1547/T1505 | Autoruns, KAPE |
| Privilege Escalation | T1068/T1484 | BloodHound, CrackMapExec |
| Defense Evasion | T1070/T1562 | Volatility, Hayabusa |
| Credential Access | T1003/T1555 | mimikatz, CrackMapExec |
| Discovery | T1087/T1069 | BloodHound, enum4linux |
| Lateral Movement | T1021/T1550 | CrackMapExec, Evil-WinRM |
| Collection | T1005/T1530 | KAPE, FastIR |
| Exfiltration | T1041/T1567 | Arkime, NetworkMiner |
| Impact | T1486/T1490 | Ransomware simulation |

## EVIDÊNCIAS POR SISTEMA OPERACIONAL

### Windows
- KAPE targets: EventLogs, Registry, Prefetch, LNK, JumpLists, MFT, USN Journal
- Memory: Volatility 3, MemProcFS
- Logs: Hayabusa, Chainsaw, EvtxECmd
- Registry: RegistryExplorer, RegRipper

### Linux
- FastIR modules: logs, packages, users, cron, ssh, history
- Memory: LiME, Volatility 3
- Logs: journalctl, auditd, syslog
- Filesystem: Plaso, bulk_extractor

### macOS
- DFIR ORC: unified logs, TCC, quarantine, launchd
- Memory: Volatility 3
- Filesystem: APFS analysis tools

### Cloud (AWS/Azure/GCP)
- CloudTrail/Cloud Audit Logs
- GuardDuty/Falco findings
- Container images (Trivy, Grype)
- IAM policies and roles

## PLAYBOOKS DE REFERÊNCIA

### AWS IR Runbook Samples
- Credential compromise
- Data exfiltration
- Cryptomining
- Container compromise

### PagerDuty Incident Response
- Incident commander role
- Communication templates
- Post-mortem process

### Counteractive Playbooks
- Phishing response
- Ransomware response
- Vulnerability management

## INTEGRAÇÃO COM AI-KIT

| Skill | Integração |
|-------|------------|
| security-auditor | Cobertura de auditoria usando catálogo |
| security-review | Checklists baseados em playbooks |
| re-engineering | Ferramentas de análise de malware |
| snippet-library | Scripts de coleta, regras Sigma |
| cybersecurity-roadmap | Alinhamento de learning path |

## EXEMPLO DE USO

```
Input: "Preciso responder a ransomware em ambiente Windows"
Output:
  Toolchain:
    - Containment: EDR isolation, network segmentation
    - Evidence: KAPE (Windows), Volatility 3 (memory dump)
    - Analysis: Hayabusa (event logs), Sigma (detection), YARA (malware)
    - Recovery: Backup validation, NoMoreRansom decryptors
  Playbook: Ransomware response (PagerDuty/Counteractive)
  ATT&CK: T1486, T1490, T1070, T1485
  Timeline: Plaso + Timesketch para root cause
  Evidence Plan: KAPE targets prioritizados para ransomware
```

## LIMITAÇÕES

```
⚠️ Lista curada - verificar versões atuais das ferramentas
⚠️ Playbooks são referências - adaptar ao contexto organizacional
⚠️ Requer ambiente autorizado para testes/emulação
⚠️ Cadeia de custódia essencial para evidências legais
```

## SAÍDA ESPERADA

Estrutura completa com:
- Toolchain recomendada por tipo de incidente
- Template de playbook
- Plano de evidências por SO
- Mapeamento ATT&CK
- Workflow de timeline analysis