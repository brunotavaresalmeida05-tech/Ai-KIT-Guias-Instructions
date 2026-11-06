---
name: skill-creator
category: development
version: 1.0.0
description: >
  Cria novas skills seguindo o padrão Agent Skills da Anthropic (agentskills.io)
  com sistema de evals, progressive disclosure e integração context-router.
tags:
  - skill
  - creator
  - ai-kit
  - anthropic
  - mcp
when_to_use: |
  Use quando precisar de:
  - Criar uma skill nova para workflow recorrente
  - Alinhar skill com especificação oficial da Anthropic
  - Integrar MCP (Model Context Protocol) ao agente
  - Definir evals quantitativos para skill
input:
  type: object
  properties:
    skill_name:
      type: string
      description: Nome da nova skill (kebab-case)
    purpose:
      type: string
      description: Propósito e quando usar
    feature_list:
      type: string
      description: "Ferramentas: 'tools', 'resources', 'prompts', 'all'"
output:
  type: object
  properties:
    folder_path:
      type: string
      description: Caminho da pasta criada
    validation_result:
      type: object
      description: Resultado da validação (status, errors)
execution_time:
  min_seconds: 5
  max_seconds: 120
  typical_seconds: 15
---

# SKILL CREATOR

Cria novas skills seguindo o padrão Agent Skills oficial da Anthropic.

## QUANDO USAR

Uma tarefa não tem skill adequada no sistema atual, ou precisa de alinhamento com a spec `agentskills.io`.

## PROGRESSIVE DISCLOSURE (3 NÍVEIS)

O agente fornece informações em 3 níveis conforme a complexidade da tarefa:

| Nível | Quando mostrar | Conteúdo |
|-------|---------------|----------|
| 1 | Resposta direta | Skill criada, pasta gerada |
| 2 | Detalhes técnicos | Templates, scripts, references |
| 3 | Estrutura completa | Arquivos, evals, configuração avançada |

## ANATOMIA DA SKILL

```
.ai/skills/[skill-name]/
├── SKILL.md              # Meta: name, description (YAML) + corpo Markdown
├── scripts/              # Scripts de execução (TS/Python/Shell)
├── references/           # Links e documentação externa
├── examples/             # Templates e variações de uso
└── evals.json            # Testes automatizados (opcional)
```

## PROCESSO DE CRIAÇÃO

```
PASSO 1 — AVALIAÇÃO
  □ Novo workflow identificado?
  □ Será usado mais de 3x?
  □ Distinta o suficiente para ser modular?

PASSO 2 — DESIGN (30-60 min)
  □ Name: kebab-case, descritivo
  □ Description: 1-2 linhas, clareza
  □ Tags: 3-6 termos relevantes
  □ When_to_use: triggers específicos

PASSO 3 — IMPLEMENTAÇÃO (1-2h)
  □ Criar pasta .ai/skills/[skill-name]/
  □ Escrever SKILL.md com frontmatter + corpo
  □ Adicionar scripts/helpers em scripts/
  □ Criar referências em references/
  □ Definir evals.json para testes

PASSO 4 — VALIDAÇÃO
  □ npm run cli -- validate
  □ Corrigir erros de frontmatter
  □ Atualizar context-router table
  □ Testar workflow completo

PASSO 5 — DOCUMENTAÇÃO
  □ Atualizar INDEX.md (count skills)
  □ Adicionar a docs/ se for documentação nova
```

## TEMPLATE RECOMENDADO

```markdown
---
name: skill-name
category: development | analysis | security | ...
version: 1.0.0
description: >
  Descrição clara do que a skill faz.
tags:
  - tag1
  - tag2
when_to_use: |
  Use quando precisar de:
  - Condição 1
  - Condição 2
input:
  type: object
  properties: ...
output:
  type: object
  properties: ...
execution_time:
  min_seconds: 5
  max_seconds: 120
  typical_seconds: 30
---

# SKILL NAME

## QUANDO USAR
[Lista de triggers concretos]

## O QUE FAZ
[Descrição do output esperado]

## O QUE NÃO FAZ
[Limites claros]

## PROCESSO
[Passos ordenados]

## EVALS (OPCIONAL)
Testes quantitativos em evals.json:
- Acurácia > 90%
- Falsos positivos < 5%
- Latência < 500ms
```

## EVALS (OPCIONAL)

Para skills críticas, crie `evals.json`:

```json
{
  "baseline": 90.0,
  "tests": [
    {
      "input": "contexto do teste",
      "expected": ["output esperado"],
      "score": 1.0
    }
  ]
}
```

## INTEGRAÇÃO COM ANTHROPIC SKILLS

| Recurso Anthropic | AI-KIT Mapping |
|-------------------|----------------|
| YAML frontmatter (`name`, `description`) | Padrão mantido |
| Progressive disclosure | Implementado em SKILL.md |
| MCP Builder | `skills/mcp-builder/` |
| Webapp Testing | complementa `qa-testing/` |
| Skill Creator (oficial) | Base deste skill |

## GRARDELLS

```
ALWAYS seguir o template exatamente
ALWAYS atualizar context-router após criar skill
ALWAYS validar com npm run cli -- validate
NEVER duplicar skill existente — consolidar se necessário
IMPORTANT nome da pasta = name no YAML frontmatter
IMPORTANT usar progressive disclosure nas respostas
```

## SAÍDA ESPERADA

Nova pasta `.ai/skills/[skill-name]/` com:
- `SKILL.md` validada
- `scripts/` com helpers
- `references/` com links úteis
- `evals.json` (opcional)
- `context-router` atualizado