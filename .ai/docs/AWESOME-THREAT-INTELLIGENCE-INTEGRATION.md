# Awesome Threat Intelligence Integration

## Overview
Integration of hslatman/awesome-threat-intelligence - Curated list of threat intelligence tools, feeds, and resources for cybersecurity professionals.

## Key Categories Integrated

### Threat Intel Platforms (8)
1. **MISP** - Malware Information Sharing Platform
2. **IntelMQ** - Threat intel processing ecosystem
3. **AlienVault OTX** - Open Threat Exchange
4. **VirusTotal** - File and URL analysis API
5. **URLhaus** - Malicious URL database
6. **Abuse.ch** - Botnet C2, SSL Blacklist, Feodo tracker
7. **CIRCL** - Luxembourg CERT threat intelligence
8. **GREYNoise** - Internet background noise intelligence

### Feed Types (15+)
- Malware hashes
- Suspicious IPs
- Malicious domains
- Phishing URLs
- C2 servers
- Exploit kits

### Formats & Standards
- **STIX/TAXII** - Structured Threat Information eXpression
- **OpenIOC** - FireEye IOC format
- **MISP format** - Attribute-based IOCs
- **CSV/JSON** - Lightweight interchange

### Communities & Resources
- **CERTs** - Global Computer Emergency Response Teams
- **ISACs** - Information Sharing and Analysis Centers
- **Vendor feeds** - Commercial threat intel providers

## Skills Created
- **threat-intelligence** - Unified threat intelligence workflow

## Tools Registry
File: `docs/awesome-threat-intelligence/tool-registry.yaml`
- 50+ tools categorized by function
- API information and integration guides
- Platform support and licensing

## Workflow Patterns

### IOC Collection
```yaml
threat-intelligence:
  action: collect
  ioc_type: all
  sources: [misp, virustotal, urlhaus, otx]
  output_format: stix
```

### Threat Enrichment
```yaml
threat-intelligence:
  action: enrich
  ioc_type: ip
  sources: [greynoise, threatminer, alienvault]
  confidence_threshold: 0.7
```

### STIX Sharing
```yaml
threat-intelligence:
  action: share
  output_format: stix
  correlation_window: 7d
```

## Status
- ✅ 1 new skill: threat-intelligence
- ✅ 2 YAML data files
- ✅ 8 platform integrations with APIs
- ✅ 15+ feed types documented

## Integration Points
- MISP API for collection/sharing
- VirusTotal Intelligence API
- OTX Pulses API
- GREYNoise API
- Abuse.ch feeds
- URLhaus submissions API
