---
name: refactor-guardrail
category: development
version: 1.0.0
description: Refactoring seguro e behavior-preserving. Simplifica, reestrutura e melhora
tags:
- refactoring
- quality
- guardrails
when_to_use: Antes de refatorar código existente para garantir segurança.
input:
  type: object
  properties:
    file_path:
      type: string
output:
  type: object
  properties:
    refactored_code:
      type: string
execution_time:
  min_seconds: 30
  max_seconds: 600
  typical_seconds: 60
---

# Refactor Guardrail

# Refactor Guardrail

# REFACTOR GUARDRAIL

## QUANDO USAR
Código funciona mas precisa de ser mais limpo, legível ou eficiente.

## O QUE FAZ
Guia refactoring com segurança, garantindo que nada quebra.

## PROCESSO

```
ANTES de refactorizar:
  □ Todos os testes existentes passam? (baseline)
  □ Cobertura de testes é suficiente?
  □ O scope do refactor está claro?

DURANTE:
  □ Uma mudança de cada vez
  □ Testes passam a cada mudança
  □ Commits atómicos por mudança

DEPOIS:
  □ Todos os testes passam
  □ Performance não degradou
  □ Code review feito
```

## SINAIS PARA REFACTORIZAR

```
Code Smells a eliminar:
- Função > 30 linhas → extrair
- Parâmetros > 4 → agrupar em objecto
- Duplicação > 2x → extrair função/módulo
- Comentário que explica "como" → o código deve explicar-se
- Condições aninhadas > 2 níveis → extrair ou simplificar
- Magic numbers/strings → constants nomeadas
```

## ANTI-PATTERNS A EVITAR

```
NEVER adicionar abstracção sem necessidade provada
NEVER refactorizar e adicionar features ao mesmo tempo
NEVER "melhorar" o que não está partido
IMPORTANT YAGNI: "You Aren't Gonna Need It"
IMPORTANT KISS: "Keep It Simple, Stupid"
```

## GUARDRAILS

```
ALWAYS manter testes a verde durante todo o processo
ALWAYS commits atómicos com mensagem clara
NEVER refactorizar sem cobertura de testes prévia
IMPORTANT se precisas de mais de 1h para refactorizar → quebra em partes
```

## SAÍDA ESPERADA
Código melhorado, todos os testes passam, sem features novas.