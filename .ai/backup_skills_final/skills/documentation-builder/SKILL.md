---
name: documentation-builder
category: documentation
version: 1.0.0
description: 'Documentação técnica para engenheiros: README, ADRs, comentários de
  código,'
tags:
- documentation
- docs
- writing
when_to_use: Quando precisas de documentação técnica ou guias de utilizador.
input:
  type: object
  properties:
    content:
      type: string
    format:
      type: string
output:
  type: object
  properties:
    docs:
      type: string
execution_time:
  min_seconds: 10
  max_seconds: 600
  typical_seconds: 60
---

# Documentation Builder

# Documentation Builder

# DOCUMENTATION BUILDER

## QUANDO USAR
- Escrever ou actualizar README
- Documentar decisões de arquitectura (ADRs)
- Criar docs de API
- Handoff entre equipas ou agentes

## TEMPLATE README

```markdown
# [Nome do Projecto]

> [Descrição em 1 frase]

## Quick Start
\`\`\`bash
git clone ...
cp .env.example .env
# edita .env com os teus valores
npm install
npm run dev
\`\`\`

## Stack
- Frontend: [...]
- Backend: [...]
- Database: [...]

## Estrutura
\`\`\`
[árvore de directórios simplificada]
\`\`\`

## Variáveis de Ambiente
Ver `.env.example` — documenta todas as chaves necessárias.

## Testes
\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Deploy
Ver `docs/deploy.md`

## Contribuição
Ver `docs/contributing.md`
```

## COMENTÁRIOS DE CÓDIGO

```
Comenta O QUÊ e PORQUÊ, não COMO:
✅ # Usa SHA-256 porque MD5 tem colisões conhecidas
❌ # Cria hash da password

Funções complexas: JSDoc / docstring com:
- Parâmetros e tipos
- Valor de retorno
- Exemplos de uso
- Casos de erro
```

## GUARDRAILS

```
ALWAYS actualizar docs quando o código muda
NEVER deixar docs desactualizadas após refactor
IMPORTANT docs são código — revisão é obrigatória
```

## SAÍDA ESPERADA
Ficheiros de documentação prontos a usar, sincronizados com o código actual.