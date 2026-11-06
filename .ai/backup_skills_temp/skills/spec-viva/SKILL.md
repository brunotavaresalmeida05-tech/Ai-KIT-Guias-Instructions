---
name: spec-viva
category: testing
version: 1.0.0
description: Project Charter e Spec que evolui. Usa no início de qualquer projecto
  para
tags:
- specification
- testing
- spec
when_to_use: Para escrever especificações vivas que se comportam como testes.
input:
  type: object
  properties:
    spec_name:
      type: string
    description:
      type: string
output:
  type: object
  properties:
    spec_file:
      type: string
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 45
---

# Spec Viva

# Spec Viva

# SPEC VIVA

## QUANDO USAR
- Início de projecto
- Mudança de scope significativa
- Antes de qualquer decisão de arquitectura

## O QUE FAZ
Conduz um processo de briefing estruturado e produz/actualiza o AGENTS.md.

## PROCESSO DE BRIEFING

```
FASE 1 — CONTEXTO
  □ O que é este projecto? (1 frase)
  □ Quem é o utilizador final?
  □ Que problema resolve?
  □ O que o torna diferente?

FASE 2 — REQUISITOS
  □ Funcionalidades core (must-have)
  □ Funcionalidades secundárias (nice-to-have)
  □ O que está FORA do scope?
  □ Integrações necessárias?

FASE 3 — TÉCNICO
  □ Stack preferida ou imposta?
  □ Restrições de performance?
  □ Restrições de segurança?
  □ Budget / timeline?

FASE 4 — CRITÉRIOS DE SUCESSO
  □ Como sabemos que está pronto?
  □ Métricas de qualidade?
  □ Critérios de aceitação por feature?
```

## VALIDAÇÃO DE IDEIAS (antes de codar)

Antes de qualquer implementação, responde:
1. Esta feature resolve um problema real do utilizador?
2. É a solução mais simples possível?
3. Temos como testá-la?
4. Existe risco de segurança?
5. Encaixa na arquitectura actual?

Se 3+ respostas forem "Não" → redesenha antes de avançar.

## GUARDRAILS

```
ALWAYS actualizar AGENTS.md após briefing
ALWAYS validar ideias antes de codar
NEVER começar implementação sem spec aprovada
IMPORTANT spec evolui — actualiza a cada sprint/iteração
```

## SAÍDA ESPERADA
AGENTS.md completo com secções 1-12 preenchidas.