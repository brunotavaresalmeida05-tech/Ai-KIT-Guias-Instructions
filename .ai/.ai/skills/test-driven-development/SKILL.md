---
name: test-driven-development
category: testing
version: 1.0.0
description: >
  Desenvolvimento guiado por testes com o ciclo Red-Green-Refactor.
  NENHUM CODIGO DE PRODUCAO sem teste falhando primeiro.
  Baseado em Superpowers.
tags:
  - tdd
  - testing
  - red-green-refactor
  - quality
  - superpowers
when_to_use: |
  Use quando:
  - Implementar nova funcionalidade
  - Corrigir bugs
  - Refatorar codigo
  - Garantir qualidade consistente
  - Evitar regressoes
input:
  type: object
  properties:
    test_file:
      type: string
      description: Caminho do arquivo de teste
    test_name:
      type: string
      description: Nome do teste a ser escrito
    failure_reason:
      type: string
      description: Por que o teste deve falhar inicialmente
output:
  type: object
  properties:
    test_written:
      type: boolean
      description: Se o teste foi escrito com sucesso
    test_fails:
      type: boolean
      description: Se o teste realmente falha por motivo correto
    implementation_needed:
      type: boolean
      description: Se codigo de implementacao e necessario
    refactor_notes:
      type: string
      description: Anotacoes para refatoracao
execution_time:
  min_seconds: 1
  max_seconds: 120
  typical_seconds: 20
---

# TEST-DRIVEN DEVELOPMENT

Desenvolvimento guiado por testes com ciclo Red-Green-Refactor.

## QUANDO USAR

- Implementar nova funcionalidade
- Corrigir bugs
- Refatorar codigo
- Garantir qualidade consistente
- Evitar regressoes

## LEI CENTRAL

> NENHUM CODIGO DE PRODUCAO SEM TESTE FALHANTE PRIMEIRO

## CICLO TDD

### RED
1. Escreva teste minimo para um comportamento
2. Nome do teste deve descrever comportamento
3. Execute e verifique falha pelo motivo correto

### VERIFY RED
- Teste falha? Continue para GREEN
- Teste passa? Delete codigo e reinicie RED

### GREEN
1. Implemente codigo minimo para passar no teste
2. Nao adicione funcionalidade extra
3. Nao pense em refatoracao agora

### VERIFY GREEN
1. Teste alvo passa
2. Suite completa do projeto passa
3. Sem regressões

### REFACTOR
1. Limpe codigo, remova duplicacao
2. Melhore nomes
3. Mantenha todos testes verdes

## REGRAS DE OURO

- ALWAYS write failing test first (RED)
- ALWAYS verify test fails for CORRECT reason
- ALWAYS implement minimal code to pass (GREEN)
- ALWAYS run FULL test suite after GREEN
- ALWAYS refactor when GREEN stable (REFACTOR)
- NEVER skip TDD for simple code
- NEVER write production code without test
- ALWAYS delete code that passes test immediately

## REDE FLAGS

Pare e reinicie o ciclo se:
- "Teste passa imediatamente"
- "Manter como referencia"
- Teste cobre muito código de uma vez
- Código de teste é mais complexo que implementação

## SAÍDA ESPERADA

Teste escrito, Status RED, Implementacao GREEN, Refatoracao, Suite completa PASS.
