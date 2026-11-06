---
name: graph-visualization
category: analysis
version: 1.0.0
description: >
  Visualização e análise de grafos para AI development. Gera conhecimentos sobre
  grafos, dependências, fluxos de dados e arquiteturas. Suporta DOT, Mermaid, JSON
  e formatos de visualização interativa. Baseado em conceitos de Graphify-Labs.
tags:
  - visualization
  - graph
  - knowledge-graph
  - architecture
  - mermaid
  - dot-language
  - d3
  - network-analysis
when_to_use: |
  Use quando precisar de:
  - Visualizar arquiteturas de sistemas
  - Mapear dependências entre componentes
  - Criar knowledge graphs de habilidades
  - Analisar fluxos de dados e tarefas
  - Gerar diagramas de relacionamento
  - Visualizar grafos de agentes multi-agente
input:
  type: object
  properties:
    graph_type:
      type: string
      description: Tipo de grafo (architecture, dependencies, workflow, knowledge, agent)
    output_format:
      type: string
      description: Formato de saída (mermaid, dot, json, svg, interactive)
    include_security:
      type: boolean
      description: Incluir anotações de segurança
    node_style:
      type: string
      description: Estilo dos nós (box, circle, ellipse)
output:
  type: object
  properties:
    diagram_code:
      type: string
      description: Código do diagrama no formato escolhido
    nodes:
      type: array
      items:
        type: string
      description: Lista de nós no grafo
    edges:
      type: array
      items:
        type: object
      description: Arestas entre nós
    mermaid:
      type: string
      description: Diagrama Mermaid pronto para renderizar
    dot:
      type: string
      description: Código DOT para Graphviz
    json_graph:
      type: object
      description: Estrutura de dados JSON do grafo
execution_time:
  min_seconds: 1
  max_seconds: 30
  typical_seconds: 5
---

# GRAPH VISUALIZATION

Visualização e análise de grafos para AI development.

## QUANDO USAR

- Visualizar arquiteturas de sistemas
- Mapear dependências entre componentes
- Criar knowledge graphs de habilidades
- Analisar fluxos de dados e tarefas
- Gerar diagramas de relacionamento
- Visualizar grafos de agentes multi-agente

## TIPOS DE GRAFO

### 1. Architecture Graph
- Nós: Serviços, bancos de dados, APIs
- Arestas: Comunicação, dependêncicias, dados
- Uso: Documentação, revisão, onboarding

### 2. Dependencies Graph
- Nós: Pacotes, módulos, bibliotecas
- Arestas: Dependências, importações
- Uso: Análise de risco, atualização de dependências

### 3. Workflow Graph
- Nós: Tarefas, agentes, decisões
- Arestas: Fluxo de execução, dependências
- Uso: Orquestração, otimização de processos

### 4. Knowledge Graph
- Nós: Conceitos, habilidades, tópicos
- Arestas: Prerequisites, relacionamentos, uso
- Uso: Recomendação de aprendizado, roteamento de skills

### 5. Agent Coordination Graph
- Nós: Agentes, tarefas, recursos
- Arestas: Mensagens, coordenação
- Uso: Visualização de multi-agente

## FORMATOS DE SAÍDA

### Mermaid
```mermaid
graph LR
    A[Node A] --> B[Node B]
    B --> C[Node C]
    A --> C
```

### DOT (Graphviz)
```dot
digraph G {
    A [label="Node A", shape=box];
    B [label="Node B", shape=box];
    A -> B [label="relaciona"];
}
```

### JSON Graph
```json
{
  "nodes": [{"id": "A", "label": "Node A"}],
  "edges": [{"source": "A", "target": "B", "label": "relaciona"}]
}
```

## EXEMPLOS DE USO

### Knowledge Graph de Skills
```
Input:
{
  "graph_type": "knowledge",
  "output_format": "mermaid",
  "nodes": [
    "security-audit", "code-review", "architecture", 
    "implementation", "qa-testing", "deployment"
  ],
  "edges": [
    {"from": "architecture", "to": "code-review", "type": "requires"},
    {"from": "security-audit", "to": "implementation", "type": "requires"},
    {"from": "implementation", "to": "qa-testing", "type": "requires"}
  ]
}

Output: Mermaid diagram showing skill dependencies
```

### Arquitetura de Sistema
```
Input:
{
  "graph_type": "architecture",
  "output_format": "mermaid",
  "include_security": true
}

Output: Diagram showing services, data flows, security boundaries
```

### Coordonação de Agentes
```
Input:
{
  "graph_type": "agent",
  "output_format": "mermaid",
  "nodes": ["User", "Context-Router", "Implementation-Assistant", "QA-Tester"]
}

Output: Flow chart of agent interactions
```

## INTEGRAÇÃO COM AI-KIT

| Skill | Uso |
|-------|-----|
| architecture-first | Gerar diagrams de arquitetura |
| context-router | Visualizar routing de skills |
| stix-orchestrator | Mostrar coordenação de agentes |
| skill-library | Criar knowledge graphs de habilidades |
| snippet-library | Mapear relacionamentos entre snippets |

## RECURSOS ADICIONAIS

- [Mermaid Docs](https://mermaid.js.org/) - Sintaxe e exemplos
- [Graphviz](https://graphviz.org/) - Ferramenta de layout
- [D3.js](https://d3js.org/) - Visualização web interativa
- [NetworkX](https://networkx.org/) - Python graph algorithms

## LIMITAÇÕES

```
⚠️ Diagramas são estáticos sem interação
⚠️ Grafos complexos podem precisar de layout específico
⚠️ Visualização web requer integração adicional
```

## SAÍDA ESPERADA

Objeto com:
- Código do diagrama (Mermaid/DOT)
- Estrutura de nós e arestas
- JSON exportável
- Instruções de renderização