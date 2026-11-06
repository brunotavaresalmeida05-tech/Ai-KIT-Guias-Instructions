# Awesome Incident Response Integration

## Overview

Integration of `meirwah/awesome-incident-response` - a curated list of 20+ categories covering the full DFIR (Digital Forensics and Incident Response) lifecycle with tools, frameworks, playbooks, and resources.

## Repository Overview

- **Source**: https://github.com/meirwah/awesome-incident-response
- **License**: Apache-2.0 (permissive - allows reuse, modification, distribution with attribution)
- **Format**: Curated markdown list with 20+ categories
- **Focus**: Complete DFIR lifecycle from adversary emulation to incident management

## Key Categories

### 1. Adversary Emulation
| Tool | Purpose |
|------|---------|
| Atomic Red Team | Execute ATT&CK techniques for testing |
| Caldera | Automated adversary emulation platform |
| Metta | Generate realistic security events |

### 2. All-In-One Platforms
| Tool | Purpose |
|------|---------|
| GRR Rapid Response | Remote live forensics framework |
| Velociraptor | Endpoint visibility and collection |
| TheHive | Scalable incident response platform |
| IRIS | Incident response platform |
| Limacharlie | Security platform with EDR |

### 3. Evidence Collection
| Tool | Purpose |
|------|---------|
| KAPE | Triage tool for prevalent digital artifacts |
| FastIR | Fast incident response evidence collection |
| CyLR | Collect artifacts for forensic analysis |
| DFIR ORC | Automated evidence collection |
| ir-rescue | Automated collection scripts |

### 4. Memory Analysis
| Tool | Purpose |
|------|---------|
| Volatility 3 | Volatile memory extraction framework |
| Rekall | Memory analysis framework |
| MemProcFS | Memory forensics over filesystem |

### 5. Log Analysis
| Tool | Purpose |
|------|---------|
| Hayabusa | Fast Windows event log analysis |
| Chainsaw | Fast Windows event log analysis (Rust) |
| Sigma | Generic detection rule format |
| Zircolite | Standalone Sigma rule evaluation |
| Plaso/log2timeline | Super timeline creation |
| Timesketch | Timeline analysis platform |

### 6. Incident Management
| Tool | Purpose |
|------|---------|
| TheHive | Incident response platform with cases |
| FIR | Fast incident response |
| RTIR | Request tracker for incident response |
| Shuffle | SOAR platform |

### 6. Playbooks & Runbooks
| Resource | Focus |
|----------|-------|
| AWS IR Runbook Samples | Cloud incident response |
| Counteractive | Security incident response playbooks |
| PagerDuty IR Documentation | Operational runbooks |
| ThreatHunter-Playbook | Threat hunting playbooks |

### 7. Sandboxing & Reversing
| Tool | Purpose |
|------|---------|
| Cuckoo | Automated malware analysis |
| Ghidra | Reverse engineering framework |
| CAPA | Malware capability detection |
| Joe Sandbox | Cloud malware analysis |

### 8. Network Analysis
| Tool | Purpose |
|------|---------|
| Zeek | Network security monitor |
| Suricata | IDS/IPS/NSM |
| Arkime | Full packet capture |
| NetworkMiner | Network forensics |

### 9. Disk & File Analysis
| Tool | Purpose |
|------|---------|
| Autopsy | Digital forensics platform |
| Sleuth Kit | File system analysis |
| FTK Imager | Disk imaging |
| bulk_extractor | File carving |

### 10. Threat Intelligence
| Tool | Purpose |
|------|---------|
| MISP | Threat intelligence platform |
| OpenCTI | Threat intelligence platform |
| YARA | Pattern matching for malware |

## AI Development Utility

### 1. Tool Chain Recommendation Engine
Input: Incident type (ransomware, data breach, cloud compromise)
Output: Recommended tool chain with execution order

### 2. ATT&CK Mapping
- Atomic Red Team → Technique execution templates
- Sigma rules → Detection rule generation
- Atomic + Sigma → Complete detect-test cycle

### 3. Playbook Generation
From AWS IR, Counteractive, PagerDuty runbooks:
- Parse into structured workflows
- Generate executable runbooks for SOAR platforms

### 4. Evidence Collection Planning
By OS (Windows/Linux/macOS) and artifact type:
- KAPE targets for Windows
- FastIR modules for Linux
- DFIR ORC for macOS

### 5. Timeline Analysis
Plaso + Timesketch integration:
- Super timeline creation
- Collaborative timeline analysis
- AI-assisted event correlation

## Integration Points with AI-KIT

| AI-KIT Skill | Integration |
|--------------|-------------|
| `security-audit` | Use tool catalog for audit coverage |
| `security-review` | Reference playbooks for review checklists |
| `re-engineering` | Malware analysis tools for binary analysis |
| `snippet-library` | Collection scripts, Sigma rules |
| `cybersecurity-roadmap` | Align learning path with IR tooling |

## License Compliance

```
✅ Apache-2.0 - permissive
✅ Can copy, modify, distribute
✅ Attribution required: "From awesome-incident-response by meirwah"
```

## Next Steps for AI-KIT

1. Create `incident-response-toolkit` skill
2. Build tool catalog index (JSON)
3. Create playbook templates from listed resources
4. Map ATT&CK techniques to tools
5. Add to context-router for IR queries