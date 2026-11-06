---
name: security-review
category: security
version: 1.0.0
description: Auditoria de segurança de código, arquitectura e configurações.
tags:
- security
- review
- audit
when_to_use: Antes de merge ou deploy para revisão de segurança.
input:
  type: object
  properties:
    code:
      type: string
    context:
      type: string
output:
  type: object
  properties:
    vulnerabilities:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 15
  max_seconds: 600
  typical_seconds: 60
---

# Security Review

# Security Review

# SECURITY REVIEW

## QUANDO USAR
- Antes de qualquer deploy
- Ao implementar autenticação ou autorização
- Ao processar inputs de utilizador
- Ao integrar APIs externas

## OWASP TOP 10 CHECKLIST

```
□ A01 — Broken Access Control
     Verifica: utilizador só acede ao que tem permissão
     Testa: tentar aceder a recursos de outro utilizador

□ A02 — Cryptographic Failures
     Verifica: dados sensíveis encriptados (at rest + in transit)
     Testa: passwords nunca guardadas em plain text

□ A03 — Injection
     Verifica: todos os inputs sanitizados e parametrizados
     Testa: SQL injection, XSS, command injection

□ A04 — Insecure Design
     Verifica: threat modeling feito na arquitectura
     Testa: abuse cases documentados

□ A05 — Security Misconfiguration
     Verifica: headers de segurança, CORS, debug mode off em prod
     Testa: headers com securityheaders.com

□ A06 — Vulnerable Components
     Verifica: dependências sem CVEs conhecidos
     Testa: npm audit / pip-audit / bundle audit

□ A07 — Auth Failures
     Verifica: rate limiting em login, MFA disponível, sessões expiram
     Testa: brute force, session fixation

□ A08 — Integrity Failures
     Verifica: CI/CD pipeline seguro, dependências verificadas
     Testa: supply chain attacks

□ A09 — Logging Failures
     Verifica: logs de segurança existem e são monitorizados
     Testa: login falhado é registado?

□ A10 — SSRF
     Verifica: URLs externas validadas antes de request
     Testa: tentar aceder a internal endpoints via input
```

## SEGREDOS E CONFIGURAÇÃO

```
NEVER .env em repositório
NEVER chaves em código fonte
NEVER logs com dados sensíveis (passwords, tokens, PII)
ALWAYS .gitignore com .env antes do primeiro commit
ALWAYS variáveis de ambiente para configuração
ALWAYS rotação de chaves documentada
```

## ATTACK SURFACE REVIEW

```
Para cada endpoint/função, pergunta:
1. Quem pode chamar isto? (autenticação)
2. O que pode fazer? (autorização)
3. Com que dados? (validação de input)
4. O que pode correr mal? (error handling seguro)
5. Que dados sensíveis toca? (data minimisation)
```

## IA COMO ATACANTE

```
Instrui a IA a atacar o próprio sistema:
"Actua como um atacante. Encontra vulnerabilidades neste código/arquitectura."
→ Gera relatório de vulnerabilidades
→ Prioriza por criticidade (Critical / High / Medium / Low)
→ Corrige antes de deploy
```

## GUARDRAILS

```
ALWAYS pensar em segurança desde o design, não depois
ALWAYS validar inputs em todas as camadas (frontend + backend)
NEVER confiar em dados do cliente sem validação server-side
IMPORTANT segurança em profundidade: múltiplas camadas de defesa
```

## SAÍDA ESPERADA
Relatório de vulnerabilidades + plano de remediação priorizado.