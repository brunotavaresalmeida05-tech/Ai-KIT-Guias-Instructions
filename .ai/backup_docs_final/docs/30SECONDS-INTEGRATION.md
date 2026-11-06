# 30 Seconds of Code Integration for AI-KIT

## Overview

Integration of `Chalarangelo/30-seconds-of-code` - a curated collection of 30-second code snippets for leveling up development skills across multiple languages.

## Repository Overview

- **Source**: https://github.com/Chalarangelo/30-seconds-of-code
- **License**: Code snippets CC-BY-4.0; other materials require explicit consent
- **Categories**: JavaScript, Python, CSS, HTML, React, Git, Articles, Demo
- **Total Snippets**: 200+ across 9 categories

## Structure

```
content/
├── snippets/
│   ├── js/          # JavaScript snippets (200+)
│   ├── python/      # Python snippets
│   ├── css/         # CSS snippets
│   ├── html/        # HTML snippets
│   ├── react/       # React component snippets
│   ├── git/         # Git command snippets
│   ├── articles/    # Written guides
│   ├── demo/        # Demonstration snippets
│   └── update-logs/ # Changelogs
├── collections/     # Curated collections
├── components/      # Reusable components
└── languages/       # Language-specific configs
```

## Integration for AI-KIT

### 1. Snippet Library Skill

Create a skill to access and use snippets:

```
.ai/skills/snippet-library/
├── SKILL.md
├── index.json        # Searchable snippet index
├── templates/        # Snippet templates
└── scripts/
    ├── search.py     # Search snippets
    └── render.py     # Render snippet with variables
```

### 2. Snippet Categories for AI Development

| Category | Use Cases |
|----------|-----------|
| **js/async** | Async patterns, fetch, timeouts, composition |
| **js/array** | Array manipulation, filtering, sorting |
| **js/object** | Object manipulation, merging, cloning |
| **js/function** | Arrow functions, closures, currying |
| **python/data** | Data manipulation, CSV/JSON conversion |
| **react/hooks** | Custom hooks, state management |
| **git/workflow** | Git commands, branching, rebasing |
| **css/layout** | Flexbox, grid, responsive patterns |

### 3. Use Cases for AI Development

#### Quick Pattern Lookup
```
User: "How to deep clone an object in JS?"
AI: Searches snippet library → Returns structuredClone or JSON.parse/stringify pattern
```

#### Code Generation
```
User: "Generate async retry wrapper"
AI: Composes from async snippets → Returns composed solution
```

#### Best Practice Reference
```
User: "Best way to debounce in React?"
AI: Returns useMemo/useCallback + lodash debounce pattern from snippets
```

### 4. Implementation

#### Snippet Index Structure
```json
{
  "snippets": [
    {
      "id": "js-deep-clone",
      "title": "Deep Clone Object",
      "category": "js/object",
      "tags": ["clone", "object", "deep"],
      "code": "const clone = JSON.parse(JSON.stringify(obj));",
      "description": "Simple deep clone using JSON",
      "license": "CC-BY-4.0"
    }
  ]
}
```

#### Search Integration
```python
# search_snippets.py
def search(query, category=None, language=None):
    """Search snippets by query, category, or language"""
    # Returns formatted snippets with variables
```

### 5. AI-KIT Integration Points

| AI-KIT Skill | 30-seconds Integration |
|--------------|------------------------|
| implementation-assistant | Quick pattern lookup |
| code-review | Best practice references |
| implementation-plan | Algorithm snippets |
| prototype-ui | React/CSS snippets |
| documentation-builder | Article snippets |

### 6. License Compliance

- **Code snippets**: CC-BY-4.0 (attribution required)
- **Articles/Docs**: Require explicit consent
- **Attribution**: "From 30-seconds-of-code by Angelos Chalaris"

## Next Steps

1. Create snippet index from repository
2. Build search skill for AI-KIT
3. Integrate with context-router
4. Add to autonomy catalog for tracking