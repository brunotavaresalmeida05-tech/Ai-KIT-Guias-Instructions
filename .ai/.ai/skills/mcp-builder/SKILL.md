---
name: mcp-builder
category: development
version: 1.0.0
description: >
  Construtor de servidores MCP (Model Context Protocol).
  Geracao de estruturas de projeto, configuracoes e documentacao
  para servidores MCP compatíveis com Claude Desktop.
  Baseado em patterns da Anthropic Skills.
tags:
  - mcp
  - protocol
  - server
  - development
  - claude
  - api
  - integration
when_to_use: |
  Use quando:
  - Criar novo servidor MCP
  - Integrar APIs externas ao Claude
  - Gerar estrutura de projeto MCP
  - Documentar capacidades de um MCP server
  - Validar configuracao de servidor MCP
input:
  type: object
  properties:
    server_name:
      type: string
      description: Nome do servidor MCP
    capabilities:
      type: array
      items:
        type: object
      description: Lista de capacidades (tools, resources, prompts)
    transport:
      type: string
      enum: [std, http, websocket]
      description: Tipo de transporte
    language:
      type: string
      enum: [python, typescript, go, rust]
      description: Linguagem de implementacao
    output_dir:
      type: string
      description: Diretorio de saida para o projeto
output:
  type: object
  properties:
    project_created:
      type: boolean
      description: Se o projeto foi criado com sucesso
    config_file:
      type: string
      description: Caminho do arquivo de configuracao
    manifest_path:
      type: string
      description: Caminho do manifesto MCP
    test_command:
      type: string
      description: Comando para testar o servidor
    documentation:
      type: string
      description: Path para a documentacao gerada
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 15
---

# MCP BUILDER

Construtor de servidores MCP (Model Context Protocol).

## QUANDO USAR

- Criar novo servidor MCP
- Integrar APIs externas ao Claude
- Gerar estrutura de projeto MCP
- Documentar capacidades de um MCP server
- Validar configuracao de servidor MCP

## ESTRUTURA DO PROJETO

```
server-name/
├── src/
│   ├── server.ts          # Entry point MCP
│   ├── tools/             # Ferramentas registradas
│   ├── resources/         # Recursos disponibilizados
│   └── prompts/           # Prompts dinamicos
├── tests/
│   └── integration.test   # Testes de integracao
├── mcp.json               # Manifesto MCP
└── README.md              # Documentacao
```

## MCP MANIFESTO

Formato JSON com:
- name, version, description
- capabilities (tools, resources, prompts)
- transport config
- auth requirements

## CAPACIDADES SUPORTADAS

### Tools
- Funcoes que o LLM pode chamar
- Input/output schema
- Descriptions para user facing

### Resources
- Dados estaticos ou dinamicos
- URI patterns
- MIME types

### Prompts
- Templates reutilizaveis
- Input variables
- Default behaviors

## SAIDA ESPERADA

Projeto MCP completo com estrutura, configuracao e documentacao.
