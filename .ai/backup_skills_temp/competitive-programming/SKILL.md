---
name: competitive-programming
category: development
version: 1.0.0
description: >
  Biblioteca de programação competitiva Java com 60+ implementações de algoritmos
  e estruturas de dados. Cobertura completa de grafos, strings, matemática, geometria
  e estruturas de dados avançadas. Baseado em AhmadElsagheer/CP-Library.
tags:
  - algorithms
  - data-structures
  - competitive-programming
  - java
  - graphs
  - trees
  - strings
  - geometry
  - math
when_to_use: |
  Use quando precisar de implementações canônicas de algoritmos para:
  - Geração de código de programação competitiva
  - Otimização de estruturas de dados complexas
  - Resolução de problemas de grafos e fluxo
  - Geometria computacional
  - Estruturas de string avançadas (suffix arrays, Aho-Corasick)
input:
  type: object
  properties:
    algorithm:
      type: string
      description: Algorithm name (e.g., "segment-tree", "dijkstra", "fenwick")
    implementation_type:
      type: string
      enum: [java, pseudocode, python, typescript]
      description: Desired output language/implementation type
    complexity:
      type: object
      properties:
        time:
          type: string
          description: Required time complexity
        space:
          type: string
          description: Required space complexity
output:
  type: object
  properties:
    code:
      type: object
      properties:
        java:
          type: string
          description: Java implementation (original or adapted)
        pseudocode:
          type: string
          description: Pseudocode version
        explanation:
          type: string
          description: Algorithm explanation and when to use
        references:
          type: array
          items:
            type: string
          description: Links to further reading
    time_complexity:
      type: string
      description: Time complexity notation
    space_complexity:
      type: string
      description: Space complexity notation
    variants:
      type: array
      items:
        type: object
      properties:
        name:
          type: string
        description:
          type: string
        code:
          type: string
execution_time:
  min_seconds: 2
  max_seconds: 30
  typical_seconds: 5
---

# COMPETITIVE PROGRAMMING

Biblioteca de programação competitiva Java com 60+ implementações de algoritmos e estruturas de dados.

## QUANDO USAR

- Precisas de implementações canônicas de algoritmos complexos
- Gerar código para estruturas de dados avançadas
- Resolver problemas de grafos, geometria ou string
- Otimizar problemas de programação competitiva
- Validar soluções contra implementações de referência

## DOMÍNIOS DE ALGORITMOS

### Estruturas de Dados
| Implementação | Uso | Complexidade |
|---------------|-----|--------------|
| Segment Tree | Range queries/updates | O(log n) |
| Fenwick Tree | Prefix sums, order stats | O(log n) |
| Union-Find | Componentes conexas | O(α(n)) |
| Sparse Table | RMQ sem updates | O(1) query |
| HLD | Tree path queries | O(log²n) |

### Grafos
| Implementação | Uso | Complexidade |
|---------------|-----|--------------|
| Dijkstra | SSSP com pesos positivos | O(E log V) |
| Bellman-Ford | SSSP com pesos negativos | O(VE) |
| Kruskal | MST | O(E log E) |
| Dinic | Max Flow | O(V²E) |

### Strings
| Implementação | Uso | Complexidade |
|---------------|-----|--------------|
| KMP | Pattern matching | O(n+m) |
| Suffix Array | String indexing | O(n log n) |
| Aho-Corasick | Multi-pattern match | O(n) |
| Manacher | Palíndromos | O(n) |

### Geometria
| Implementação | Uso |
|---------------|-----|
| Point | Coordenadas 2D |
| Convex Hull | Polígono convexo |
| Line Sweep | Interseções |
| Polygon | Área, perímetro |

## EXEMPLOS PRINCIPAIS

### Segment Tree (Java)
```java
// Range Sum Query com lazy propagation
public class SegmentTree {
    int N;
    int[] array, sTree, lazy;
    
    void build(int node, int b, int e)     // O(n)
    void update_range(int i, j, val)       // O(log n)
    int query(int i, j)                  // O(log n)
}
```

### Fenwick Tree (Java)
```java
// Binary Indexed Tree - one-based
public class FenwickTree {
    int n;
    int[] ft;
    
    // Range sum query O(log n)
    int rsq(int a, int b) { return rsq(b) - rsq(a-1); }
    
    // Point update O(log n)
    void point_update(int k, int val) {
        while(k <= n) { ft[k] += val; k += k & -k; }
    }
}
```

### Dijkstra (Java)
```java
static final int INF = (int)1e9;
static ArrayList<Edge>[] adjList;

static int dijkstra(int S, int T) {
    int[] dist = new int[V];
    Arrays.fill(dist, INF);
    PriorityQueue<Edge> pq = new PriorityQueue<>();
    dist[S] = 0;
    pq.add(new Edge(S, 0));
    
    while(!pq.isEmpty()) {
        Edge cur = pq.remove();
        if(cur.cost > dist[cur.node]) continue;
        // process...
    }
    return dist[T];
}
```

## INTEGRAÇÃO COM AI-KIT

### Via Context Router
O context-router detecta quando:
- User pede "implementar segment tree"
- User precisa de "algoritmo de fluxo máximo"
- User tem problema de "geometria computacional"

### Fluxo de Geração
1. User: "Criar implementação de max flow tipo Dinic"
2. AI: Busca em competitive-programming
3. AI: Gera código Java adaptado
4. AI: Inclui explicação de complexidade
5. AI: Adiciona variações possíveis

## CURRÍCULO DE PRÁTICA

O repositório inclui 3 planos de estudo:

| Nível | Área | Duração |
|-------|------|---------|
| Pupil | Fundamentos básicos | 1-3 meses |
| Expert | Intermediário avançado | 3-6 meses |
| Specialist | Problemas complexos | 6+ meses |

## LIMITAÇÕES

```
⚠️ Todos os exemplos são em Java - precisam ser traduzidos
⚠️ Foco em competição - nem sempre otimizado para produção
⚠️ Assume familiaridade com complexidade algorítmica
```

## SAÍDA ESPERADA

Implementação completa com:
- Código fonte (Java)
- Complexidade temporal e espacial
- Explicação do algoritmo
- Variações possíveis
- Referências teóricas