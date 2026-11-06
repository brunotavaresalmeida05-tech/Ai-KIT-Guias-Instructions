---
name: snippet-library
category: development
version: 1.0.0
description: Curated code snippet library from 30-seconds-of-code for AI-assisted development. Provides searchable access to 200+ snippets across JavaScript, Python, CSS, HTML, React, Git, and more.
tags:
  - snippets
  - code-patterns
  - code-reuse
  - 30-seconds-of-code
  - ai-development
when_to_use: Use when you need quick access to proven code patterns, algorithms, or best-practice implementations across multiple languages. Ideal for code generation, refactoring, learning patterns, and rapid prototyping.
input:
  type: object
  properties:
    query:
      type: string
      description: Search query for snippets (e.g., "deep clone", "debounce", "async retry")
    language:
      type: string
      enum: [javascript, python, css, html, react, git]
      description: Filter by programming language
    category:
      type: string
      description: Filter by category (e.g., "array", "object", "async", "hooks", "layout")
    tags:
      type: array
      items:
        type: string
      description: Filter by tags
    limit:
      type: integer
      default: 10
      description: Maximum number of results to return
output:
  type: object
  properties:
    snippets:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
          title:
            type: string
          language:
            type: string
          category:
            type: string
          tags:
            type: array
            items:
              type: string
          code:
            type: string
          description:
            type: string
          license:
            type: string
      description: Matching code snippets
    total:
      type: integer
      description: Total matching snippets
    query:
      type: string
      description: Original search query
execution_time:
  min_seconds: 1
  max_seconds: 10
  typical_seconds: 2
---

# SNIPPET LIBRARY

Curated code snippet library from **30-seconds-of-code** (https://github.com/Chalarangelo/30-seconds-of-code) providing 200+ battle-tested patterns across 7 languages.

## QUANDO USAR

- Precisas de um padrão de código comprovado rapidamente
- Estás a gerar código e queres seguir best practices
- Refactoring para padrões mais idiomáticos
- Aprender novos padrões de programação
- Prototyping rápido com código validado

## O QUE FAZ

Fornece acesso instantâneo a snippets curados com:
- **Busca semântica** por funcionalidade
- **Filtros** por linguagem, categoria, tags
- **Templates** com variáveis para personalização
- **Atribuição automática** (licença CC-BY-4.0)

## ESTRUTURA DO ÍNDICE

```
.ai/skills/snippet-library/
├── SKILL.md              # Este ficheiro
├── index.json            # Índice pesquisável completo
├── templates/            # Templates de snippets
│   ├── js/
│   ├── python/
│   ├── css/
│   ├── html/
│   ├── react/
│   └── git/
└── scripts/
    ├── search.py         # Motor de busca
    └── render.py         # Renderização com variáveis
```

## CATEGORIAS PRINCIPAIS

### JavaScript (200+ snippets)

| Categoria | Exemplos |
|-----------|----------|
| `js/array` | `chunk`, `flatten`, `unique`, `shuffle`, `zip`, `intersection`, `difference` |
| `js/object` | `deepClone`, `merge`, `pick`, `omit`, `flattenObject`, `keys`, `values` |
| `js/function` | `debounce`, `throttle`, `memoize`, `curry`, `compose`, `pipe`, `once` |
| `js/async` | `retry`, `timeout`, `parallel`, `sequence`, `sleep`, `waitFor`, `fetchWithTimeout` |
| `js/string` | `capitalize`, `camelCase`, `kebabCase`, `slugify`, `truncate`, `reverse` |
| `js/math` | `clamp`, `randomInt`, `average`, `sum`, `factorial`, `gcd`, `lcm` |
| `js/date` | `formatDate`, `timeAgo`, `isLeapYear`, `daysBetween`, `addDays` |
| `js/dom` | `on`, `off`, `trigger`, `ready`, `serializeForm`, `getStyle` |
| `js/algorithm` | `binarySearch`, `quickSort`, `mergeSort`, `bfs`, `dfs`, `topologicalSort` |

### Python

| Categoria | Exemplos |
|-----------|----------|
| `python/data` | `flatten`, `chunk`, `unique`, `groupBy`, `csvToJson`, `jsonToCsv` |
| `python/string` | `slugify`, `camelCase`, `snakeCase`, `truncate`, `wordCount` |
| `python/file` | `readLines`, `writeLines`, `copyFile`, `getExtension`, `getMimeType` |
| `python/date` | `formatDate`, `timeAgo`, `daysBetween`, `addDays`, `isWeekend` |

### React

| Categoria | Exemplos |
|-----------|----------|
| `react/hooks` | `useDebounce`, `useLocalStorage`, `useMediaQuery`, `useOnClickOutside`, `useToggle` |
| `react/components` | `Modal`, `Tooltip`, `Dropdown`, `Tabs`, `Accordion`, `Carousel` |

### CSS

| Categoria | Exemplos |
|-----------|----------|
| `css/layout` | `flexCenter`, `gridCenter`, `stickyFooter`, `holyGrail`, `sidebar` |
| `css/animation` | `fadeIn`, `slideIn`, `pulse`, `spin`, `shake`, `heartbeat` |
| `css/typography` | `textGradient`, `textStroke`, `truncate`, `dropCap` |

### Git

| Categoria | Exemplos |
|-----------|----------|
| `git/workflow` | `undoCommit`, `amendCommit`, `squashCommits`, `cherryPick`, `rebase` |
| `git/inspection` | `logPretty`, `diffStaged`, `showBranches`, `findCommit` |

## EXEMPLOS DE USO

### Busca por funcionalidade
```
Input: query="deep clone object", language="javascript"
Output: Snippet com JSON.parse/stringify + structuredClone moderno
```

### Busca por categoria
```
Input: category="array", language="javascript", limit=5
Output: chunk, flatten, unique, shuffle, zip
```

### Busca por tags
```
Input: tags=["async", "retry"], language="javascript"
Output: retry, retryWithBackoff, timeout patterns
```

## SNIPPETS DESTAQUE PARA AI-DEVELOPMENT

### Padrões Assíncronos Essenciais

```javascript
// Retry com backoff exponencial
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, delay));
    return retry(fn, retries - 1, delay * 2);
  }
};

// Timeout para promises
const timeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
]);

// Execução paralela controlada
const parallel = async (fns, limit = 3) => {
  const results = [];
  for (let i = 0; i < fns.length; i += limit) {
    const batch = fns.slice(i, i + limit);
    results.push(...await Promise.all(batch.map(f => f())));
  }
  return results;
};
```

### Utilitários de Objeto/Array

```javascript
// Deep clone seguro (suporta Date, RegExp, Map, Set)
const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [k, deepClone(v)]));
  if (obj instanceof Set) return new Set([...obj].map(deepClone));
  return Array.isArray(obj)
    ? obj.map(deepClone)
    : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepClone(v)]));
};

// Merge profundo
const deepMerge = (target, ...sources) => {
  sources.forEach(source => {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    });
  });
  return target;
};
```

### React Hooks Úteis

```javascript
// useDebounce
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// useLocalStorage
const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setStoredValue = (val) => {
    try {
      setValue(val);
      localStorage.setItem(key, JSON.stringify(val));
    } catch (err) {
      console.error(err);
    }
  };
  return [value, setStoredValue];
};
```

## INTEGRAÇÃO COM AI-KIT

### Via Context Router
O context-router detecta automaticamente quando:
- User pede "como fazer X em JavaScript"
- User precisa de "padrão para Y"
- Code generation requer best practices

### Via Skills Complementares

| Skill | Integração |
|-------|------------|
| `implementation-assistant` | Lookup de padrões durante implementação |
| `code-review` | Referência de best practices para review |
| `implementation-plan` | Algoritmos para planeamento |
| `prototype-ui` | React/CSS components para prototipagem |
| `documentation-builder` | Artigos e guias para documentação |

## SCRIPTS DE BUSCA

### search.py
```python
#!/usr/bin/env python3
"""Busca snippets no índice local."""

import json
import sys
import argparse

def load_index():
    with open('index.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def search_snippets(index, query=None, language=None, category=None, tags=None, limit=10):
    results = index.get('snippets', [])
    
    if query:
        query_lower = query.lower()
        results = [s for s in results if query_lower in s.get('title', '').lower() 
                   or query_lower in s.get('description', '').lower()
                   or query_lower in s.get('code', '').lower()
                   or any(query_lower in tag.lower() for tag in s.get('tags', []))]
    
    if language:
        results = [s for s in results if s.get('language', '').lower() == language.lower()]
    
    if category:
        results = [s for s in results if s.get('category', '').lower() == category.lower()]
    
    if tags:
        tags_lower = [t.lower() for t in tags]
        results = [s for s in results if any(t.lower() in tags_lower for t in s.get('tags', []))]
    
    return results[:limit]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--query', '-q', help='Search query')
    parser.add_argument('--language', '-l', help='Filter by language')
    parser.add_argument('--category', '-c', help='Filter by category')
    parser.add_argument('--tags', '-t', nargs='+', help='Filter by tags')
    parser.add_argument('--limit', '-n', type=int, default=10, help='Max results')
    parser.add_argument('--format', choices=['json', 'text'], default='text')
    args = parser.parse_args()
    
    index = load_index()
    results = search_snippets(index, args.query, args.language, args.category, args.tags, args.limit)
    
    if args.format == 'json':
        print(json.dumps({'snippets': results, 'total': len(results), 'query': args.query}, indent=2))
    else:
        for s in results:
            print(f"\n--- {s['title']} ({s['language']}/{s['category']}) ---")
            print(f"Tags: {', '.join(s['tags'])}")
            print(f"Description: {s['description']}")
            print(f"Code:\n{s['code']}")
            print(f"License: {s['license']}")

if __name__ == '__main__':
    main()
```

### render.py
```python
#!/usr/bin/env python3
"""Renderiza snippet com substituição de variáveis."""

import re
import sys
import json
import argparse

def render_snippet(code, variables):
    """Substitui {{variable}} no código."""
    def replacer(match):
        var = match.group(1).strip()
        return variables.get(var, match.group(0))
    return re.sub(r'\{\{(\w+)\}\}', replacer, code)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snippet-id', required=True, help='Snippet ID')
    parser.add_argument('--variables', '-v', nargs='*', help='Variables as key=value')
    parser.add_argument('--format', choices=['json', 'text'], default='text')
    args = parser.parse_args()
    
    variables = {}
    if args.variables:
        for v in args.variables:
            if '=' in v:
                k, val = v.split('=', 1)
                variables[k] = val
    
    with open('index.json', 'r', encoding='utf-8') as f:
        index = json.load(f)
    
    snippet = next((s for s in index['snippets'] if s['id'] == args.snippet_id), None)
    if not snippet:
        print(f"Snippet {args.snippet_id} not found", file=sys.stderr)
        sys.exit(1)
    
    rendered = render_snippet(snippet['code'], variables)
    
    if args.format == 'json':
        print(json.dumps({'id': snippet['id'], 'rendered': rendered}, indent=2))
    else:
        print(rendered)

if __name__ == '__main__':
    main()
```

## ATRIBUIÇÃO E LICENÇA

```
Code snippets: CC-BY-4.0
Attribution: "From 30-seconds-of-code by Angelos Chalaris"
URL: https://github.com/Chalarangelo/30-seconds-of-code
```

**IMPORTANTE**: Artigos e documentação requerem consentimento explícito — apenas snippets de código são CC-BY-4.0.

## GUARDRAILS

```
ALWAYS incluir atribuição CC-BY-4.0 ao usar snippets
ALWAYS verificar se o snippet é adequado ao contexto (versão de linguagem, dependências)
NEVER copiar artigos/documentação sem permissão
IMPORTANT snippets são pontos de partida — adaptar ao teu caso de uso
```

## SAÍDA ESPERADA

Lista de snippets relevantes com código pronto a usar, incluindo:
- ID único para referência
- Código formatado
- Descrição do propósito
- Tags para descoberta
- Licença e atribuição