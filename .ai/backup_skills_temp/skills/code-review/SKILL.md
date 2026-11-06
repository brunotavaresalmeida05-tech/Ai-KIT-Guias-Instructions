---
name: code-review
category: code-quality
version: 1.0.0
description: >
  Review código, detecta problemas de qualidade, boas práticas, segurança e sugestões de melhoria.
  Baseado no checklist de revisão do projeto com foco em funcionalidade, corretude e legibilidade.
tags:
  - code-quality
  - review
  - refactoring
  - security
  - testing
when_to_use: |
  Sempre que há novo código a revisar antes de merge ou quando precisas de feedback sobre qualidade de implementação.
  Útil para revisões de PR, refactoring e garantia de padrões de projeto.
input:
  type: object
  properties:
    code:
      type: string
      description: Código a revisar
    language:
      type: string
      description: Language of the code (JavaScript, TypeScript, Python, etc.)
    file_path:
      type: string
      description: Path to the file being reviewed
    pr_number:
      type: integer
      description: Pull request number (optional)
output:
  type: object
  properties:
    issues:
      type: array
      items:
        type: object
        properties:
          severity:
            type: string
            enum: [critical, high, medium, low]
          location:
            type: string
          message:
            type: string
          suggestion:
            type: string
      description: List of issues found in the code
    suggestions:
      type: array
      items:
        type: string
      description: Improvement suggestions organized by category
    score:
      type: number
      description: Overall code quality score (0-100)
execution_time:
  min_seconds: 5
  max_seconds: 300
  typical_seconds: 30
---

# CODE REVIEW

Review código, detecta problemas de qualidade, boas práticas, segurança e sugestões de melhoria.

## QUANDO USAR

- Sempre que há novo código a revisar antes de merge
- Quando precisas de feedback sobre qualidade de implementação
- Para revisões de pull requests
- Antes de refactoring
- Para garantia de padrões de projeto

## O QUE FAZ

Garante que o código:
- Funciona corretamente (bugs, edge cases)
- Siga boas práticas de código (legibilidade, manutenção)
- Este seguro ( vulnerabilidades, secrets)
- Este testado (cobertura, testes relevantes)
- Este documentado (JSDoc, comentários)

## CHECKLIST DE REVISÃO

### Functionality & Correctness
```
[ ] Código faz o que é supostamente fazer
[ ] Lógica correta
[ ] Edge cases tratados
[ ] Error cases tratados
[ ] Sem race conditions
[ ] Sem null pointer exceptions
```

### Code Quality
```
[ ] Nomeação clara (variáveis, funções, classes)
[ ] Funções com responsabilidade única (máx 50 linhas)
[ ] Sem duplicação de código (DRY)
[ ] Comentários explicam PORQUE, não O QUE
[ ] Código segue style guide do projeto
```

### Testing
```
[ ] Testes escritos ANTES do código (TDD)
[ ] Testes cobrem edge cases
[ ] Test coverage >80% para novo código
[ ] Testes são isolados (sem dependências entre testes)
```

### Security
```
[ ] Não há secrets no código
[ ] Input validation no lado server
[ ] SQL injection previsto (queries parametrizadas)
[ ] XSS previsto (sanitização)
[ ] Autenticação/autorização checados
```

### Performance
```
[ ] Não há N+1 queries
[ ] Database indexes usados quando apropriado
[ ] Loops e algoritmos eficientes
```

## SAÍDA ESPERADA

Objeto com `issues` (lista detalhada de problemas), `suggestions` (melhorias) e `score` (nota 0-100).