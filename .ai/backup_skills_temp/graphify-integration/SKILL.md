---
name: graphify-integration
category: analysis
version: 1.0.0
description: >
  Transforma codebase e documentação em um grafo de conhecimento consultável usando
  parsing AST determinístico. Permite navegação precisa, detecção de comunidades (Leiden),
  rastreamento de caminhos e visualização de dependências. Baseado em Graphify-Labs.
tags:
  - graph
  - knowledge-graph
  - ast
  - static-analysis
  - navigation
  - dependency-tracking
when_to_use: |
  Use quando precisar de:
  - Entender arquitetura e relações entre arquivos
  - Rastrear caminhos de execução ou dependências complexas
  - Fazer análise de impacto de mudanças (ripple effects)
  - Identificar comunidades de código logicamente relacionadas
  - Obter explicações transparentes para conexões de código
input:
  type: object
  properties:
    action:
      type: string
      enum: [ingest, query, trace, detect-communities]
    target:
      type: string
      description: Arquivo ou diretório alvo
    query:
      type: string
      description: Query para o grafo
output:
  type: object
  properties:
    graph_data:
      type: object
      description: Dados do grafo gerados ou consultados
    explanation:
      type: string
      description: Explicação das conexões encontradas
execution_time:
  min_seconds: 5
  max_seconds: 600
  typical_seconds: 30
---

# GRAPHIFY INTEGRATION

Transforma codebase em conhecimento consultável.

## QUANDO USAR

- Precisas de explorar relações complexas sem grepping
- Análise de impacto de mudanças (quem depende de quê?)
- Entender fluxo de execução entre arquivos
- Visualizar grupos de módulos relacionados (comunidades)

## CAPACIDADES PRINCIPAIS

### AST Determinístico
- Analisa sintaxe real do código, não apenas texto.
- Mapeia: chamadas de função, classes, imports, interfaces.

### Explicação de Arestas
- Cada conexão no grafo é justificada logicamente.
- Reduz alucinações de IA em navegação.

### Detecção de Comunidades (Leiden)
- Agrupa módulos relacionados automaticamente.
- Útil para identificar boundaries de microserviços.

## USO TÍPICO

### Rastreamento de Caminho
```
Input: "trace-path source=api.ts target=db.ts"
Output: Rota precisa através de importações e chamadas de função.
```

### Análise de Dependências
```
Input: "detect-impact target=api.ts"
Output: Lista de componentes impactados por mudanças na api.
```

## INTEGRAÇÃO COM AI-KIT

| Skill | Integração |
|-------|------------|
| `architecture-first` | Gera grafo de conhecimento da arquitetura |
| `code-review` | Identifica impacto de mudanças no grafo |
| `context-router` | Melhora routing baseado em comunidades |
| `research-agent` | Mapeia tópicos técnicos e bibliotecas |

## SAÍDA ESPERADA

Estrutura de grafo (nós e arestas) com justificações determinísticas para cada conexão.