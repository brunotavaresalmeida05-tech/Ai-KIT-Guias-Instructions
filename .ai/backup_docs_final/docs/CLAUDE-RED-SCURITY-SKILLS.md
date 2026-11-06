# Claude-Red Offensive Security Skills Integration

## Integration Summary

The `SnailSploit/Claude-Red` repository (78 offensive security skills across 23 categories) has been analyzed for integration into AI-KIT's security development workflow.

## Key Integration Points

### AI Security Skills
**Repository**: `Skills/ai/offensive-ai-security/`

**Coverage**:
- Prompt Injection (direct, indirect, encoding, multi-turn)
- RAG poisoning and tool chaining attacks
- Model extraction and training data poisoning
- OWASP LLM Top 10 (LLM01-LLM10)

**AI-KIT Integration**:
- Use with `security-review` skill for defensive analysis
- Use with `documentation-builder` to document security findings
- Use with `qa-testing` to validate security controls
- NEVER for unauthorized offensive operations

### Cloud Security Skills
**Repository**: `Skills/cloud/`

**Coverage**:
- AWS/Azure/GCP credential harvesting and privilege escalation
- Cloud metadata service attacks
- CI/CD pipeline injection

### Container/Kubernetes Skills
**Repository**: `Skills/container/`

**Coverage**:
- RBAC abuse and kubelet exploitation
- Cloud metadata access via containers
- Sidecar/pod compromise techniques

### Web Application Skills
**Repository**: `Skills/web/`

**Coverage**:
- SQL injection (5-step methodology)
- Command injection, XSS, SSRF
- NoSQL injection (MongoDB, Neo4j)

## Usage Guidelines

### PERMITTED Uses (Defense Context):
- CTF challenges and competitions
- Authorized pen-testing engagements
- Security research on owned systems
- Security training and education
- Bug bounty programs with proper scope

### PROHIBITED Uses (Offensive Context):
- Mass targeting or automated attacks
- Supply chain compromise
- Detection evasion for malicious purposes
- Destructive techniques against production systems

## Integration with AI-KIT Security Skills

| AI-KIT Skill | Claude-Red Complement |
|--------------|----------------------|
| security-audit | cloud-attack, container-attack |
| security-review | web-exploit, ai-security |
| devops-secops | cicd-pipeline, infrastructure-attack |

## Key References
- Repository: https://github.com/SnailSploit/Claude-Red
- OWASP LLM Top 10: https://owasp.org/llm-top-10/
- MITRE ATLAS: https://attack.mitre.org/matrices/ai/

## Next Steps for Integration

1. Create `skills/ai-security/` directory in AI-KIT
2. Import key methodologies from `offensive-ai-security/SKILL.md`
3. Create defensive countermeasure skills
4. Integrate with context-router for security testing workflows
5. Add to autonomy catalog for authorized security assessments
