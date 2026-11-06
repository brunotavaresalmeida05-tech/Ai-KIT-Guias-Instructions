---
name: prompt-builder
category: development
version: 1.0.0
description: "Design e construção de prompts para tarefas específicas, agentes e sistemas\
  \ multi-agente.\n  Produz prompts claros, com exemplos, guardrails e formato de\
  \ saída definido."
tags:
- prompt
- engineering
- llm
when_to_use: Para construir prompts eficazes para LLMs.
input:
  type: object
  properties:
    goal:
      type: string
    context:
      type: string
output:
  type: object
  properties:
    prompt:
      type: string
execution_time:
  min_seconds: 5
  max_seconds: 120
  typical_seconds: 15
---

# Prompt Builder

# PROMPT BUILDER

## QUANDO USAR
- Criar prompts para agentes especializados
- Melhorar prompts que não dão os resultados esperados
- Desenhar system prompts para aplicações com IA

## ANATOMIA DE UM BOM PROMPT

```
1. PAPEL / IDENTIDADE
   "És um engenheiro sénior de segurança com 15 anos de experiência..."

2. CONTEXTO
   "O projecto usa [stack]. O código é [descrição]..."

3. TAREFA ESPECÍFICA
   "Analisa o seguinte código e identifica vulnerabilidades OWASP..."

4. FORMATO DE SAÍDA
   "Responde com: Vulnerabilidade | Criticidade | Linha | Solução"

5. GUARDRAILS
   "Nunca sugires soluções que requerem mudança de arquitectura."
   "Se não encontrares problemas, diz explicitamente que está OK."

6. EXEMPLOS (few-shot)
   "Exemplo de input: [...]"
   "Exemplo de output esperado: [...]"
```

## TÉCNICAS AVANÇADAS

```
Chain-of-thought: "Pensa passo a passo antes de responder"
Self-critique: "Antes de responder, critica a tua própria resposta"
Role separation: usa papéis distintos para perspectivas diferentes
Context compression: resume contexto longo antes de enviar
Progressive disclosure: começa simples, adiciona complexidade
```

## PROMPT PARA MELHORAR PROMPTS

```
"Actua como um especialista em prompt engineering.
Analisa este prompt e sugere melhorias para:
1. Clareza da instrução
2. Completude do contexto
3. Especificidade do output
4. Guardrails necessários
Prompt actual: [...]"
```

## GUARDRAILS

```
ALWAYS incluir formato de saída esperado
ALWAYS incluir pelo menos 1 exemplo concreto
NEVER prompts ambíguos ou com instruções contraditórias
IMPORTANT menos é mais — prompts curtos e precisos superam os longos e vagos
```

## SAÍDA ESPERADA
Prompt pronto a usar + variação alternativa + explicação das escolhas.