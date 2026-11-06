# Diagram-Design Skill Integration for AI-KIT

## Integration Summary

Successfully integrated the `cathrynlavery/diagram-design` framework as a visualization skill within AI-KIT for creating editorial-quality diagrams.

## Files Created

```
.ai/skills/diagram-design/
├── SKILL.md           # Skill metadata, 45 diagram types, usage patterns
├── INTEGRATION_GUIDE.md  # Complete reference guide
├── references/
│   ├── style-guide.md        # Color tokens, typography, design system
│   ├── semantic-patterns.md  # Pattern selection decision tree
│   ├── output-spec.md        # Size presets, type catalog, export commands
│   └── doctor.md           # CI integration and diagnostics
├── scripts/
│   └── self_check.py         # Output validation script
└── assets/
    └── template.html         # Base HTML template (light/dark mode)
```

## Key Features Integrated

### 1. 45 Diagram Types
- **Architecture**: system, service, deployment, component, data-flow, db-schema, layered, hexagonal, clean, onion, microservices, api-gateway
- **Flow**: flowchart, sequence, state, swimlane, loop, recursion
- **Analysis**: quadrant, radar, pyramid, heatmap, venn
- **Strategy**: wardley-map, capability, value-chain
- **Data**: sankey, network, org-chart, hierarchy, matrix, timeline, Gantt

### 2. Brand Matching
- Onboarding flow to extract palette from URLs
- Customizable color tokens (paper, ink, accent, muted, border)
- Typography: Instrument Serif, Geist sans, Geist Mono

### 3. Import Support
- Mermaid diagram import
- draw.io (VSDX) import
- Excalidraw JSON import

### 4. Design Constraints
- 4px grid alignment
- Max 9 nodes, 12 arrows, 2 accent elements
- Accessibility: role="img", aria-labelledby, title element

### 5. Export Options
- SVG (inline in HTML)
- PNG (via Playwright)
- Registry metadata (JSON sidecar)

## AI-KIT Integration

### Context Router Entry
Added to `.ai/skills/context-router/SKILL.md`:

```
| **UI diagrams & visualization** | **diagram-design** | **skills/diagram-design/SKILL.md** |
```

### Usage in Workflows

**Documentation Builder:**
```typescript
const diagram = await invokeSkill('diagram-design', {
  type: 'system-architecture',
  title: 'AI-KIT Runtime Overview',
  elements: ['CLI', 'Runtime', 'Skills', 'Observability']
});
```

**CI Validation:**
```yaml
- name: Validate diagrams
  run: python3 scripts/self_check.py --ci
```

**Autonomous Catalog:**
```json
{
  "action": "create-diagram",
  "category": "visualization",
  "skill": "diagram-design",
  "inputs": { "type": "system", "title": "Auth Flow", "elements": ["client", "auth", "db"] }
}
```

## Related Skills

- **architecture-first**: System architecture planning
- **documentation-builder**: Generates docs with diagrams
- **domain-modeling**: Data structure visualization
- **prototype-ui**: UI mockups and wireframes

## References

- Full specification: `skills/diagram-design/references/`
- Style gate: `references/style-guide.md`
- Pattern selection: `references/semantic-patterns.md`
- Validation: `scripts/self_check.py`
- Integration guide: `INTEGRATION_GUIDE.md`

---
