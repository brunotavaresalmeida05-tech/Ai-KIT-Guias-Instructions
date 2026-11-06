---
name: debugging-loop
category: analysis
version: 2.0.0
description: >
  Diagnóstico estruturado de bugs e erros seguindo 4 fases Superpowers:
  1. Root Cause Investigation, 2. Pattern Analysis, 3. Hypothesis Testing, 4. Implementation.
  NENHUMA CORREÇÃO SEM INVESTIGAÇÃO DE CAUSA RAIZ PRIMEIRO.
tags:
- debugging
- troubleshooting
- superpowers
- root-cause
- tdd
when_to_use: |
  Use quando houver erros, comportamentos inesperados, testes a falhar, crashes,
  ou qualquer sinal de problema no sistema.
input:
  type: object
  properties:
    error_message:
      type: string
      description: Mensagem de erro completa com stack trace
    recent_changes:
      type: string
      description: Commits ou mudanças recentes
    environment:
      type: string
      description: Contexto do ambiente (local/test/prod)
    test_case:
      type: string
      description: Caso de teste que reproduz o problema
output:
  type: object
  properties:
    phase:
      type: string
      description: Fase atual (investigation, analysis, hypothesis, implementation)
    root_cause:
      type: string
      description: Causa raiz identificada
    recommended_action:
      type: string
      description: Ação recomendada
    stop_flag:
      type: boolean
      description: Se deve parar e questionar arquitetura
execution_time:
  min_seconds: 5
  max_seconds: 300
  typical_seconds: 30
---

# DEBUGGING LOOP (SUPERPOWERS)

Diagnóstico estruturado de bugs e erros.

## QUANDO USAR

- Erros, comportamentos inesperados
- Testes a falhar
- Crashes, performance issues
- Comportamento errado em qualquer camada

## LEI DO SISTEMA

> **NENHUMA CORREÇÃO SEM INVESTIGAÇÃO DE CAUSA RAIZ PRIMEIRO**

## 4 FASES OBRIGATÓRIAS

### FASE 1: Root Cause Investigation
- [ ] Ler mensagens de erro completamente (stack traces, line numbers)
- [ ] Reproduzir consistentemente antes de hipotetizar
- [ ] Verificar mudanças recentes (git diff, dependências, config)
- [ ] **Sistemas multi-componente**: Adicionar logging diagnóstico em cada boundary
- [ ] **Stack profundo**: Usar técnica de tracing hacia trás

### FASE 2: Pattern Analysis
- [ ] Encontrar exemplos de funcionamento no mesmo codebase
- [ ] Ler implementações de referência completamente
- [ ] Listar todas as diferenças entre funcionando/quebrado
- [ ] Mapear todas as dependências e pressupostos

### FASE 3: Hypothesis and Testing
- [ ] Estudar hipótese única: "Acredito que X porque Y"
- [ ] Testar minimalmente (uma variável, menor mudança)
- [ ] Verificar antes de continuar; formar nova hipótese se falhou
- [ ] Admitir "não entendo X" ao invés de adivinhar

### FASE 4: Implementation
- [ ] Criar teste falhando primeiro (usar TDD skill)
- [ ] Implementar correção de causa raiz única
- [ ] Verificar fix funciona, sem regressões
- [ ] **3+ fixes falhados**: Parar, questionar arquitetura com human partner

## RED FLAGS (PARE e retorne à FASE 1)

```
❌ "Quick fix for now"
❌ "Just try changing X"
❌ Múltiplas mudanças ao mesmo tempo
❌ Propondo soluções antes de tracing do data flow
❌ "One more fix attempt" após 2+ falhas
```

## Técnicas de Suporte

### Root Cause Tracing
Backward tracing do stack: identificar ponto de entrada até saída

### Multi-Layer Validation
Adicionar verificação em camadas diferentes do sistema

### Condition-Based Waiting
Polling condicional vs timeouts fixos

## SAÍDA ESPERADA

```
Fase atual: {investigation|analysis|hypothesis|implementation}
Causa raiz: {identified|investigating}
Ação recomendada: {fix|refactor|architect-decision}
STOP flag: {true|false}
```
