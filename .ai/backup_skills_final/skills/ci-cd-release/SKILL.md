---
name: ci-cd-release
category: deployment
version: 1.0.0
description: Pipeline de CI/CD, processo de release, deploy e rollback.
tags:
- ci-cd
- deployment
- automation
when_to_use: Antes de cada deploy para garantir qualidade e consistência.
input:
  type: object
  properties:
    environment:
      type: string
output:
  type: object
  properties:
    pipeline_config:
      type: string
execution_time:
  min_seconds: 30
  max_seconds: 600
  typical_seconds: 120
---

# Ci Cd Release

# Ci Cd Release

# CI/CD RELEASE

## QUANDO USAR
- Configurar pipeline de CI/CD
- Preparar deploy
- Definir processo de release
- Planear rollback strategy

## PIPELINE COMPLETO

```
STAGE 1 — LINT & FORMAT
  □ Linter (eslint, pylint, rubocop, etc.)
  □ Formatter (prettier, black, etc.)
  □ Type checking (tsc, mypy)

STAGE 2 — TESTES
  □ Unit tests
  □ Integration tests
  □ Coverage mínima definida (ex: 80%)

STAGE 3 — SEGURANÇA
  □ Dependency audit (npm audit, pip-audit)
  □ SAST (Static Analysis Security Testing)
  □ Secret scanning (git-secrets, truffleHog)
  □ Container scanning (se aplicável)

STAGE 4 — BUILD
  □ Build production artifact
  □ Docker image (se aplicável)
  □ Asset optimization

STAGE 5 — DEPLOY (apenas após stages anteriores ✅)
  □ Deploy para staging
  □ Smoke tests em staging
  □ Aprovação manual (se produção)
  □ Deploy para produção
  □ Health check pós-deploy

STAGE 6 — MONITORIZAÇÃO
  □ Error rate monitoring
  □ Performance baseline
  □ Alertas configurados
```

## ROLLBACK PLAN

```
ALWAYS ter plano de rollback antes de deploy
Estratégias:
- Blue/Green: muda o traffic routing
- Feature flags: desactiva a feature
- Database migrations: migrations reversíveis
- Versioning: volta para a versão anterior

Tempo máximo para decisão de rollback: 15 min após deploy
```

## GUARDRAILS

```
NEVER fazer deploy directo para produção sem staging
NEVER fazer deploy sem testes a verde
NEVER fazer deploy de sexta-feira à tarde
ALWAYS ter rollback plan documentado
ALWAYS monitorizar os primeiros 30 min após deploy
IMPORTANT automatiza tudo o que for possível
```

## SAÍDA ESPERADA
Pipeline configurado + checklist de deploy + rollback plan.