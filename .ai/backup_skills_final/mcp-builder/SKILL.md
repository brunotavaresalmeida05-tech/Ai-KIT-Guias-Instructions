---
name: mcp-builder
category: development
version: 1.0.0
description: >
  Construção de servidores Model Context Protocol (MCP) para integrar ferramentas,
  APIs e bancos de dados ao agente Claude. Baseado no padrão oficial da Anthropic.
tags:
  - mcp
  - integration
  - protocol
  - tooling
  - backend
  - typescript
  - python
when_to_use: |
  Use quando precisar de:
  - Expor funcionalidades externas (APIs, BDs, ferramentas) ao agente Claude
  - Criar extensões do runtime AI-KIT
  - Integrar serviços de terceiros ao fluxo de trabalho com IA
  - Definir ferramentas com validação de schema robusta
  - Habilitar recursos e prompts parametrizados
input:
  type: object
  properties:
    action:
      type: string
      enum: [research, implementation, review, evals]
      description: Fase do workflow MCP Builder
    feature_set:
      type: string
      description: "Recursos: 'tools', 'resources', 'prompts', 'all'"
    language:
      type: string
      enum: [typescript, python]
      description: Linguagem de implementação
output:
  type: object
  properties:
    server_config:
      type: string
      description: Configuração do servidor MCP (JSON/schema)
    scripts_created:
      type: array
      items:
        type: string
      description: Lista de scripts gerados
    validation_result:
      type: string
      description: Resultado do MCP Inspector test
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 60
---

# MCP BUILDER

Construção de servidores Model Context Protocol (MCP) para AI development.

## QUANDO USAR

- Precisas integrar APIs, bancos de dados ou ferramentas externas ao agente Claude
- Criar extensões do runtime AI-KIT
- Expor funcionalidades específicas como "tools" reconhecíveis por Claude
- Habilitar recursos dinâmicos (resources, prompts) para contexto
- Definir schema de validação robusto com Zod/Pydantic

## WORKFLOW (4 FASES)

### 1. RESEARCH (3-5 min)
- Escolher linguagem: **TypeScript (TS)** → `typescript` | **Python** → `python`
- Definir feature set:
  - `tools` → Funções que Claude pode chamar
  - `resources` → Dados dinâmicos que Claude pode ler
  - `prompts` → Templates parametrizados
  - `all` → Todos os recursos
- Schema recomendado: **JSON Schema** ou **Zod/Pydantic**

### 2. IMPLEMENTATION (10-20 min)
**TypeScript (TS) Stack:**
```
src/
├── server.ts          # FastMCP initialization
├── tools/             # Handlers com schema Zod
│   └── example-tool.ts
├── resources/         # Recursos dinâmicos
│   └── example-resource.ts
└── prompts/           # Prompts parametrizados
    └── example-prompt.ts
```

**Python Stack:**
```
mcp_server/
├── server.py          # FastMCP initialization
├── tools/
│   └── example_tool.py
├── resources/
│   └── example_resource.py
└── prompts/
    └── example_prompt.py
```

### 3. REVIEW/TEST (5-10 min)
- Executar testes com **MCP Inspector**:
  ```bash
  npx @modelcontextprotocol/inspector
  ```
- Validar que `tools`, `resources` e `prompts` aparecem corretamente
- Testar chamadas reais (ex: `calculate_sum(5, 10)`)
- Verificar `readOnlyHint` e `destructiveHint` nos annotations

### 4. EVALS (5 min)
- Criar `evals.json` com testes de integração
- Definir baseline: `% de ferramentas detectadas corretamente`
- Métrica: acurácia + latência < 500ms

## EXEMPLO: TOOL SCHEMA (ZOD)

```typescript
import { z } from 'zod';

export const searchCodeSchema = z.object({
  query: z.string().describe('Search query'),
  language: z.enum(['typescript', 'python', 'javascript'])
    .optional()
    .describe('Language to search in'),
  case_sensitive: z.boolean().optional().default(false)
});

export const searchCodeHandler = async (args: z.infer<typeof searchCodeSchema>) => {
  // Implementação real
  return { results: [], count: 0 };
};
```

## TRANSPORTE RECOMENDADO

| Caso de uso | Transporte | Exemplo |
|-------------|------------|---------|
| Uso local/CLI | STDIO | `npx mcp-server-example` |
| Uso remoto/HTTP | SSE (Streamable HTTP) | `mcp.anthropic.com` |
| Desenvolvimento | STDIO + Inspector | `npx @modelcontextprotocol/inspector` |

## ANOTAÇÕES (ANNOTATIONS)

- **`readOnlyHint: true`** → Tool não modifica estado
- **`destructiveHint: true`** → Tool pode causar perda de dados
- **`idempotentHint: true`** → Reexecução segura

## INTEGRAÇÃO COM AI-KIT

| Skill | Integração |
|-------|------------|
| `context-router` | Roteamento inteligente baseado em recursos MCP |
| `implementation-assistant` | Acesso a ferramentas externas via MCP |
| `strix-orchestrator` | Coordenação de múltiplos servidores MCP |
| `artifact-data` | Persistência de dados via resources MCP |

## ARQUIVOS GENERADOS

Após execução, estrutura típica:

```
.ai/skills/mcp-builder/
├── SKILL.md           # Esta skill
├── scripts/
│   ├── setup-mcp.sh   # Script de inicialização
│   └── inspector.json # Config para MCP Inspector
├── examples/
│   ├── typescript/    # Template TS
│   └── python/        # Template Python
└── references/
    └── mcp-spec.md    # Referência da spec oficial
```

## VALIDATION RULES (GRUOLS)

```
ALWAYS usar schema validation explícita (Zod ou Pydantic)
ALWAYS declarar readOnlyHint/destructiveHint em annotations
NEVER expor estado mutável sem controle explícito
IMPORTANT usar nomenclatura descritiva: verb_noun (ex: calculate_tax, search_code)
```