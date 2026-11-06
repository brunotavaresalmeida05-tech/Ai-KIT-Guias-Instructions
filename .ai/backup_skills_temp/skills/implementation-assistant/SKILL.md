---
name: implementation-assistant
category: development
version: 1.0.0
description: "Transforma planos e arquitecturas em código real. Segue a arquitectura\
  \ definida,\n  aplica TDD, respeita os design patterns do projecto e entrega código\
  \ testável."
tags:
- implementation
- coding
- assistant
when_to_use: Durante implementação de features para assistência de código.
input:
  type: object
  properties:
    task:
      type: string
    context:
      type: string
output:
  type: object
  properties:
    code:
      type: string
    tests:
      type: string
execution_time:
  min_seconds: 10
  max_seconds: 600
  typical_seconds: 60
---

# Implementation Assistant

# IMPLEMENTATION ASSISTANT

## QUANDO USAR
Após architecture-first + implementation-plan aprovados.

## O QUE FAZ
Executa tarefas do plano uma a uma, com código limpo e testado.

## PROCESSO

```
PARA CADA TAREFA DO PLANO:

1. LÊ a tarefa e verifica dependências
2. ESCREVE o teste primeiro (TDD)
3. IMPLEMENTA o mínimo para passar o teste
4. VALIDA: testes passam? lógica correcta?
5. REFACTORA se necessário
6. DOCUMENTA o que foi feito
7. AVANÇA para a próxima tarefa
```

## PAIR PROGRAMMING COM IA

```
Modo recomendado de trabalho:
- Tu defines O QUÊ e PORQUÊ
- A IA implementa O COMO
- Tu validas a lógica e o resultado
- Juntos detectam problemas

Não aceites código que não entendes.
Pede sempre explicação do que foi feito.
```

## QUALIDADE DO CÓDIGO

```
Antes de aceitar qualquer código, verifica:
□ Segue os patterns do projecto (AGENTS.md secção 8)?
□ Tem testes correspondentes?
□ Os testes validam lógica real ou apenas sintaxe?
□ Existem edge cases não tratados?
□ O código é legível sem comentários extensos?
□ Há duplicação que devia ser extraída?
```

## GUARDRAILS

```
ALWAYS seguir a arquitectura definida em architecture-first
ALWAYS aplicar TDD (teste antes do código)
NEVER aceitar código sem testes
NEVER ignorar patterns do projecto por conveniência
IMPORTANT código simples > código "elegante" mas complexo
```

## SAÍDA ESPERADA
Código implementado + testes passando + documentação actualizada.