---
name: qa-testing
category: testing
version: 1.0.0
description: "QA manual e funcional. Plano de testes, testes de regressão, validação\
  \ de\n  aceitação e relatório de qualidade. Complementa o tdd-workflow (que é técnico)\n\
  \  com a perspectiva do utilizador."
tags:
- qa
- testing
- quality
when_to_use: Para definir estratégia de testes e casos de teste.
input:
  type: object
  properties:
    feature:
      type: string
    requirements:
      type: array
      items:
        type: string
output:
  type: object
  properties:
    test_strategy:
      type: string
    test_cases:
      type: array
      items:
        type: string
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 45
---

# Qa Testing

# QA TESTING

## QUANDO USAR
- Antes de release para produção
- Validação de features completadas
- Testes de regressão após mudanças

## PLANO DE TESTES

```markdown
## Plano de Testes: [Feature/Release]

### Âmbito
- O que está em teste: [...]
- O que está fora: [...]

### Ambientes
- [ ] Local
- [ ] Staging
- [ ] Produção (smoke only)

### Tipos de Teste
- [ ] Funcional (happy path)
- [ ] Negativo (inputs inválidos)
- [ ] Boundary (limites)
- [ ] Regressão (features anteriores)
- [ ] Performance (se aplicável)
- [ ] Acessibilidade (se UI)
```

## CASOS DE TESTE PADRÃO

```
Para cada funcionalidade:
1. Happy path — fluxo normal com dados válidos
2. Dados inválidos — o sistema rejeita correctamente?
3. Dados extremos — muito longos, muito curtos, vazios
4. Permissões — utilizador sem permissão é bloqueado?
5. Concorrência — 2 utilizadores ao mesmo tempo?
6. Recovery — o sistema recupera de erro gracefully?
```

## LÓGICA vs SINTAXE (QA PERSPECTIVE)

```
Sinais de que a lógica está errada (mesmo com testes a verde):
- Resultado "funciona" mas não faz sentido de negócio
- Cálculos correctos mas com valores inesperados
- Fluxo completa mas utilizador não consegue atingir o objectivo
- Feature funciona em isolamento mas falha no contexto real
```

## GUARDRAILS

```
ALWAYS testar com dados reais ou próximos do real
ALWAYS documentar bugs encontrados com steps to reproduce
NEVER assumir que "parece funcionar" é suficiente
IMPORTANT testa como um utilizador real, não como o developer
```

## SAÍDA ESPERADA
Relatório de QA: testes executados + bugs encontrados + go/no-go para release.