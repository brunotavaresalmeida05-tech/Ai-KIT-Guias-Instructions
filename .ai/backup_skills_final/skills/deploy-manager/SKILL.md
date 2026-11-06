---
name: deploy-manager
category: deployment
version: 1.0.0
description: >
  Gestão de deployments, CI/CD pipelines e ativação de serviços. Coordena release, rollback e monitorização pós-deploy.
tags:
  - deployment
  - ci-cd
  - release
  - operations
when_to_use: >
  Usado para coordenar processos de deploy, ativar serviços e garantir disponibilidade pós-actualização.
input:
  type: object
  properties:
    environment:
      type: string
      description: Target environment (staging, production)
    version:
      type: string
      description: Version to deploy
    rollback_on_failure:
      type: boolean
      default: true
output:
  type: object
  properties:
    status:
      type: string
      description: Deployment status
    deployed_version:
      type: string
      description: Successfully deployed version
execution_time:
  min_seconds: 30
  max_seconds: 1800
  typical_seconds: 120
---

# DEPLOY MANAGER

Gestão de deployments, CI/CD pipelines e ativação de serviços.

## QUANDO USAR

- Antes de cada deploy para garantir consistência
- Quando precisas de coordenar múltiplos serviços
- Para rollback de versões problemáticas
- Para ativar/desativar ambientes

## ESTRUTURA DE DEPLOY

```yaml
# pipeline.yaml
stages:
  - build:
      tasks: [compile, test, package]
  - test:
      tasks: [unit, integration, e2e]
  - deploy:
      pre_conditions: [all_tests_pass]
      tasks: [deploy_staging, run_smoke_tests]
      post_conditions: [health_check]
```

## CONFIGURAÇÃO

```
environment: staging
version: 1.0.0
rollback_on_failure: true
```

## GUARDRAILS

```
ALWAYS verify health before traffic migration
ALWAYS have rollback plan ready
NEVER deploy on Friday afternoons
IMPORTANT keep deployments < 5 minutes
```

## SAÍDA ESPERADA

Status de deploy com informações de versão e health checks.