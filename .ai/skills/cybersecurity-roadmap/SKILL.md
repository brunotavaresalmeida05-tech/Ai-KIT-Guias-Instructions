---
name: cybersecurity-roadmap
category: security
version: 1.0.0
description: >
  Roteiro completo de domínio em cibersegurança do iniciante ao expert. Baseado no
  Cybersecurity-Mastery-Roadmap (Hamed233) com 5 fases de aprendizado, catálogo de
  ferramentas por categoria, exercícios práticos, trilhas de certificação e caminhos
  de carreira. Ideal para estruturar aprendizado e treino de IA em segurança.
tags:
  - cybersecurity
  - roadmap
  - learning-path
  - certifications
  - tools
  - offensive
  - defensive
  - cloud-security
  - forensics
  - malware-analysis
when_to_use: |
  Use quando precisar de:
  - Estruturar aprendizado de cibersegurança passo a passo
  - Selecionar ferramentas por categoria (recon, vuln scanning, web, exploit, etc.)
  - Planejar certificações (Security+, OSCP, CISSP, etc.)
  - Criar exercícios de laboratório (CTF, home lab, SIEM, forensics)
  - Mapear carreiras (SOC, Red Team, Cloud Sec, AppSec)
  - Gerar templates de automação de segurança
input:
  type: object
  properties:
    phase:
      type: string
      description: Fase do roadmap (foundation, technical-skills, specialization, advanced, professional)
    track:
      type: string
      description: Trilha de especialização (offensive, defensive, cloud, all)
    goal:
      type: string
      description: Objetivo da consulta (learning-path, tool-selection, exercise-generation, certification-planning, career-guidance)
    current_level:
      type: string
      description: Nível atual do usuário (beginner, intermediate, advanced, expert)
output:
  type: object
  properties:
    learning_path:
      type: array
      items:
        type: string
      description: Caminho de aprendizado estruturado
    tool_recommendations:
      type: array
      items:
        type: string
      description: Ferramentas recomendadas por categoria
    exercise_template:
      type: string
      description: Template de exercício prático
    certification_plan:
      type: array
      items:
        type: string
      description: Plano de certificação
    career_guidance:
      type: string
      description: Orientação de carreira
execution_time:
  min_seconds: 3
  max_seconds: 60
  typical_seconds: 10
---

# CYBERSECURITY ROADMAP

Roteiro completo de domínio em cibersegurança - do iniciante ao expert.

## QUANDO USAR

- Estruturar aprendizado de cibersegurança passo a passo
- Selecionar ferramentas por categoria (recon, vuln scanning, web, exploit, etc.)
- Planejar certificações (Security+, OSCP, CISSP, etc.)
- Criar exercícios de laboratório (CTF, home lab, SIEM, forensics)
- Mapear carreiras (SOC, Red Team, Cloud Sec, AppSec)
- Gerar templates de automação de segurança

## AS 5 FASES DO ROADMAP

### Fase 1: Foundation (Fundamentos)
| Tópico | Recursos Práticos |
|--------|-------------------|
| Operating Systems | Linux (OverTheWire Bandit), Windows Internals |
| Networking | TCP/IP, DNS, HTTP, Wireshark |
| Programming | Python, Bash, C, Assembly |
| Linux | Filesystem, permissions, services |
| Security Principles | CIA triad, threat modeling |
| Cryptography | Symmetric/asymmetric, hashing, PKI |
| Basic Tools | Nmap, Netcat, basic scripts |

### Fase 2: Technical Skills (Habilidades Técnicas)
| Domínio | Foco | Ferramentas |
|---------|------|-------------|
| Network Security | Firewalls, IDS/IPS, VPN | Snort, Suricata, Zeek |
| System Security | Hardening, patching | Lynis, OpenSCAP |
| Web App Security | OWASP Top 10, secure coding | Burp Suite, OWASP ZAP |

### Fase 3: Specialization (Especialização)
| Trilha | Foco | Certificações |
|--------|------|-----------------|
| **Offensive** | Pen testing, exploit dev | OSCP, CEH |
| **Defensive** | SOC, incident response, forensics | CySA+, GCIH |
| **Cloud Security** | AWS/Azure/GCP, containers | CCSP, AWS Security |

### Fase 4: Advanced (Avançado)
| Domínio | Foco |
|---------|------|
| Malware Analysis | Static/dynamic analysis |
| Threat Intelligence | TTPs, IOCs, ATT&CK |
| APTs | Advanced persistent threats |
| Specialized | IoT, Mobile, ICS/SCADA |

### Fase 5: Professional Development
| Área | Ação |
|------|------|
| Certifications | Manter/avançar certificações |
| Networking | Comunidade, conferências |
| Continuous Learning | Threat intel, CTFs |

## CATÁLOGO DE FERRAMENTAS

### Reconnaissance → Vulnerability Scanning → Web Application → Exploitation → Password/Credential → Forensics → Defensive → Cloud → Mobile → OSINT

## INTEGRAÇÃO COM AI-KIT

| Skill | Integração |
|-------|------------|
| security-audit | Auditoria usando roadmap |
| security-review | Review de código OWASP |
| re-engineering | Análise de malware/binários |
| snippet-library | Templates de exploit |
| competitive-programming | Algoritmos para crypto |

## SAÍDA ESPERADA

Caminho de aprendizado com ferramentas, exercícios e planes de certificação.