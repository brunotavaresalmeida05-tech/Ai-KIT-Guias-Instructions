---
name: brainstorming
category: development
version: 1.0.0
description: >
  Estruturacao de intencoes. Prove: "Build what you believe your partner wants, and that belief is usually thinner than it feels." Descobrir intencao real antes de codificar. Baseado em Superpowers.
tags:
  - planning
  - spec-first
  - design
  - requirements
  - user-intent
  - superpowers
when_to_use: |
  Use quando:
  - Receber uma solicitacao de funcionalidade
  - Nao ter certeza do escopo ou requisitos
  - Precisar validar abordagem antes de codificar
  - Criar documentacao de design
  - Planejar mudancas complexas
input:
  type: object
  properties:
    request:
      type: string
      description: Solicitacao do usuario
    context:
      type: string
      description: Contexto adicional
output:
  type: object
  properties:
    design_doc:
      type: string
      description: Documento de design proposto
    approval_needed:
      type: boolean
      description: Se aprovação humana é necessária
    open_questions:
      type: array
      items:
        type: string
      description: Perguntas para esclarecer intencoes
execution_time:
  min_seconds: 2
  max_seconds: 30
  typical_seconds: 5
---

# BRAINSTORMING

Descobrir intencao real antes de codificar.

## QUANDO USAR

- Receber solicitacao de funcionalidade
- Nao ter certeza do escopo ou requisitos
- Precisar validar abordagem antes de codificar
- Criar documentacao de design
- Planejar mudancas complexas

## PRINCIPIO

> Você constrói o que acredita que seu parceiro quer, e essa crença geralmente é mais fina do que parece.

## FLUXO DE TRABALHO

### 1. Analise Inicial
- **Se solicitacao clara**: Execute, explique, done
- **Se não-trivial**: Progrida para esboço de abordagens

### 2. Esboço de Abordagens
Apresente 2-3 alternativas concretas com trade-offs:
- Abordagem A: [descricao] - Prós: [X], Contras: [Y]
- Abordagem B: [descricao] - Prós: [X], Contras: [Y]
- **Recomendação**: Escolha uma com justificativa

### 3. Documento de Design
Crie documentação de ~200-300 palavras com:
- Resumo do que será construído
- Decisões técnicas chave
- Perguntas abertas (se houver)

### 4. Gate de Aprovação
NADA é codificado sem aprovação humana, exceto:
- Perguntas já aprovadas
- Spikes aprovados (marcar como throwaway)

## REGRAS DE OURO

```
ALWAYS ask only when answer changes what gets built
ALWAYS present 2-3 approaches before choosing
ALWAYS create design doc before implementation
NEVER treat "sounds good" as document approval
NEVER skip brainstorming for non-trivial requests
NEVER fill silent defaults
```

## SAIDA ESPERADA

- Documento de design (formato: markdown)
- Perguntas abertas (se houver)
- Status: AWAITING_APPROVAL ou READY_TO_IMPLEMENT
