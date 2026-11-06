---
name: tdd-workflow
category: testing
version: 1.0.0
description: Test-Driven Development. Escreve testes ANTES do código. Define casos
  de teste,
tags:
- testing
- tdd
- quality
when_to_use: Sempre que há código novo a escrever ou função a implementar.
input:
  type: object
  properties:
    function_name:
      type: string
    requirements:
      type: array
      items:
        type: string
output:
  type: object
  properties:
    test_file:
      type: string
    test_cases:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 5
  max_seconds: 180
  typical_seconds: 30
---

# Tdd Workflow

# Tdd Workflow

# TDD WORKFLOW

## QUANDO USAR
Sempre que há código novo a escrever ou função a implementar.

## O QUE FAZ
Guia o ciclo Red → Green → Refactor com disciplina.

## CICLO TDD

```
RED    → Escreve o teste que FALHA (feature não existe ainda)
GREEN  → Escreve o MÍNIMO de código para o teste passar
REFACTOR → Melhora o código SEM quebrar testes
REPEAT → Próxima funcionalidade
```

## ESTRUTURA DE TESTES

```
tests/
├── unit/           ← lógica isolada, sem I/O
├── integration/    ← múltiplos módulos + DB
├── e2e/            ← fluxo completo do utilizador
└── fixtures/       ← dados de teste reutilizáveis
```

## TEMPLATE DE TESTE

```python
# Exemplo universal (adapta para a tua linguagem)
def test_[funcionalidade]_[cenário]_[resultado_esperado]():
    # ARRANGE — prepara o estado
    input_data = ...
    
    # ACT — executa a acção
    result = funcao_a_testar(input_data)
    
    # ASSERT — verifica o resultado
    assert result == expected
```

## VALIDAÇÃO DE LÓGICA vs SINTAXE

```
IMPORTANTE: Sintaxe correcta ≠ Lógica correcta

Após testes passarem, valida:
□ O resultado faz sentido no contexto de negócio?
□ Casos extremos testados? (null, empty, overflow, negativo)
□ Comportamento com dados inválidos?
□ Race conditions em operações async?
□ Lógica de negócio reflecte os requisitos reais?
```

## GUARDRAILS

```
ALWAYS escrever teste antes do código
ALWAYS testar casos extremos e falhas
NEVER commitar código sem teste correspondente
NEVER marcar teste como "skip" sem justificação documentada
IMPORTANT testes são documentação viva — nomes descritivos
```

## SAÍDA ESPERADA
Suite de testes que cobre: happy path, edge cases, error cases.