---
name: devops-secops
category: deployment
version: 1.0.0
description: Infra, observabilidade, segurança operacional e DevOps. Cobre IaC, monitoring,
tags:
- devops
- secops
- infrastructure
when_to_use: Para configuração de infraestrutura, monitors e políticas de segurança.
input:
  type: object
  properties:
    services:
      type: array
      items:
        type: string
output:
  type: object
  properties:
    config_files:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 60
  max_seconds: 1800
  typical_seconds: 300
---

# Devops Secops

# Devops Secops

# DEVOPS SECOPS

## QUANDO USAR
- Configurar infra (servidores, containers, cloud)
- Definir monitoring e alerting
- Responder a incidentes
- Hardening de segurança operacional

## AI JAIL (ISOLAMENTO DE AGENTES)

```
Princípio: Agentes de IA devem correr em ambientes isolados.

Implementa:
□ Containers com recursos limitados (CPU, RAM, disco)
□ Sem acesso a rede externa desnecessário
□ Sem acesso a filesystem de produção
□ Logs de todas as acções do agente
□ Rate limiting nas chamadas a APIs externas
□ Timeout em todas as operações do agente
```

## INFRA CHECKLIST

```
□ Servers actualizados (security patches)
□ Firewall configurado (apenas portas necessárias)
□ SSH: apenas key-based auth, root login desactivado
□ Secrets em vault (não em env files no servidor)
□ Backups automáticos e testados
□ TLS/HTTPS em todas as endpoints públicas
□ Logs centralizados e com retenção definida
```

## OBSERVABILIDADE

```
3 Pilares:
1. LOGS    — o que aconteceu? (structured JSON logs)
2. METRICS — como está a correr? (CPU, RAM, latência, errors)
3. TRACES  — porquê está lento? (request tracing)

Alertas críticos:
- Error rate > 1%
- Latência p99 > 2s
- Disco > 80%
- CPU > 90% por > 5min
- 0 requests por > 5min (serviço down?)
```

## INCIDENT RESPONSE

```
PASSO 1 — DETECTAR (alerta ou reporte)
PASSO 2 — COMUNICAR (notifica equipa)
PASSO 3 — ISOLAR (minimiza impacto)
PASSO 4 — DIAGNOSTICAR (causa raiz)
PASSO 5 — CORRIGIR (fix ou rollback)
PASSO 6 — VERIFICAR (sistema estável)
PASSO 7 — POST-MORTEM (documenta e previne recorrência)
```

## GUARDRAILS

```
NEVER credenciais em código ou logs
ALWAYS princípio do mínimo privilégio
ALWAYS infra como código (versionada e revisada)
IMPORTANT testa o plano de disaster recovery regularmente
```

## SAÍDA ESPERADA
Infra configurada + runbook de operações + plano de incident response.