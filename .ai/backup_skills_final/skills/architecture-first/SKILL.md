---
name: architecture-first
category: architecture
version: 1.0.0
description: "Desenho de arquitectura de sistema antes de qualquer implementação.\n\
  \  Cobre backend, frontend, base de dados, integrações e decisões técnicas (ADRs).\n\
  \  Usa para sistemas novos ou mudanças arquitecturais significativas."
tags:
- architecture
- design
- planning
when_to_use: '- Antes de implementar qualquer feature nova de relevo

  - Ao iniciar um projecto

  - Quando há dúvidas sobre como estruturar o sistema'
input:
  type: object
  properties:
    requirements:
      type: array
      items:
        type: string
      description: Functional and non-functional requirements
    scale:
      type: string
      description: Expected scale
output:
  type: object
  properties:
    architecture_diagram:
      type: string
    adrs:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 10
  max_seconds: 600
  typical_seconds: 60
---

# Architecture First

# ARCHITECTURE FIRST

## QUANDO USAR
- Antes de implementar qualquer feature nova de relevo
- Ao iniciar um projecto
- Quando há dúvidas sobre como estruturar o sistema

## O QUE FAZ
Produz um plano de arquitectura documentado com trade-offs explícitos.

## CHECKLIST DE ARQUITECTURA

### Backend
```
□ Padrão (MVC / Clean / Hexagonal / Microservices)?
□ Camadas: Controller → Service → Repository → DB
□ Gestão de erros centralizada?
□ Logging e observabilidade?
□ Rate limiting e throttling?
□ Cache strategy?
□ Queue/jobs para operações pesadas?
```

### Frontend
```
□ SPA / SSR / SSG / Islands?
□ Estado global vs local?
□ Data fetching strategy (SWR / React Query / Server Components)?
□ Code splitting e lazy loading?
□ Acessibilidade (WCAG 2.1)?
□ Performance budget definido?
```

### Base de Dados
```
□ Relacional vs NoSQL — justificação?
□ Schema / modelos desenhados?
□ Índices críticos identificados?
□ Migrations strategy?
□ Backup e recovery plan?
```

### Segurança (embutida na arquitectura)
```
□ Autenticação e autorização desenhadas?
□ Dados sensíveis encriptados at rest?
□ Comunicações HTTPS/TLS?
□ CORS configurado correctamente?
□ Input validation em todas as camadas?
```

## DECISÕES TÉCNICAS (ADR)

Para cada decisão relevante, documenta:
```markdown
## ADR-001: [Título]
**Contexto:** [Porquê esta decisão é necessária]
**Decisão:** [O que escolhemos]
**Alternativas:** [O que considerámos]
**Consequências:** [Trade-offs]
**Data:** YYYY-MM-DD
```

## GUARDRAILS

```
ALWAYS documentar trade-offs de cada decisão
ALWAYS pensar em segurança como parte da arquitectura
NEVER assumir que "optimizamos depois" — design matters now
IMPORTANT arquitectura deve suportar testes desde o início
```

## SAÍDA ESPERADA
Diagrama textual da arquitectura + ADRs + checklist preenchido.