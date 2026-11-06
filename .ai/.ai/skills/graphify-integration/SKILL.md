---
name: graphify-integration
category: analysis
version: 1.0.0
description: >
  Integracao com Graphify-Labs/graphify para geracao de knowledge graphs.
  Analise de codigo via AST parsing, geracao de grafos de conhecimento
  e particionamento usando algoritmo de Leiden.
  Baseado em graphify framework.
tags:
  - knowledge-graph
  - ast
  - network-analysis
  - leiden
  - graph
  - code-analysis
  - visualization
  - python
when_to_use: |
  Use quando:
  - Gerar representacao grafica de codigo
  - Analisar dependencias de projetos
  - Encontrar padroes ocultos em grafos
  - Visualizar arquitetura de sistemas
  - Particionar grafos para analise escalavel
input:
  type: object
  properties:
    project_path:
      type: string
      description: Caminho para o projeto a analisar
    language:
      type: string
      description: Linguagem de programacao (python, javascript, typescript)
    output_format:
      type: string
      enum: [graphml, json, csv, dot]
      description: Formato de saida do grafo
    partition:
      type: boolean
      description: Aplicar particionamento usando Leiden
    include_symbols:
      type: boolean
      description: Incluir simbolos AST na analise
output:
  type: object
  properties:
    graph_path:
      type: string
      description: Caminho do arquivo do grafo gerado
    nodes_count:
      type: integer
      description: Numero de noos no grafo
    edges_count:
      type: integer
      description: Numero de arestas no grafo
    partitions:
      type: array
      description: Particoes geradas pelo algoritmo Leiden
    visualization:
      type: string
      description: URL ou path da visualizacao interativa
execution_time:
  min_seconds: 10
  max_seconds: 300
  typical_seconds: 60
---

# GRAPHIFY INTEGRATION

Integracao com Graphify-Labs/graphify para geracao de knowledge graphs.

## QUANDO USAR

- Gerar representacao grafica de codigo
- Analisar dependencias de projetos
- Encontrar padroes ocultos em grafos
- Visualizar arquitetura de sistemas
- Particionar grafos para analise escalavel

## COMO FUNCIONA

1. **AST Parsing**
   - Leitura de arquivos fonte
   - Parsing para AST (Abstract Syntax Tree)
   - Extracao de simbolos, funcoes, classes, imports

2. **Graph Construction**
   - Nos: entidades (funcoes, classes, modulos)
   - Arestas: relacoes (dependencias, chamadas, heranca)
   - Atributos: tipo, linha, escopo

3. **Leiden Algorithm**
   - Particionamento com melhorias
   - Comunidades dentro do grafo
   - Modularidade otimizada

## OUTPUTS

- **GraphML**: Formato padrao para NetworkX
- **JSON**: Estrutura para visualizacao
- **CSV**: Dados tabulares para analise
- **DOT**: Formato Graphviz

## VISUALIZACAO

Recomendado:
- Gephi para analise interativa
- NetworkX + matplotlib para Python
- Cytoscape.js para web

## SAIDA ESPERADA

Grafo de conhecimento com nos, arestas e particionamentos.
