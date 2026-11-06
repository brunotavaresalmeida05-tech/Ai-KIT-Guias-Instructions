# BLA Tools - Defense Against Reverse Engineering Agents

Ferramentas de defesa baseadas no projeto [qybaihe/bla](https://github.com/qybaihe/bla).

## Installation
```bash
npm install -g bla-agents
```

## Core Concepts

### Exhaustion
Empurrar artefatos além dos limites de recursos documentados:
- ASAR headers ilimitados
- Nesting profundo de JSON
- Interfaces massivas
- Metadados redundantes

### Poison & Deception
Plantar elementos enganosos:
- Canary tokens format-valid
- Honey metadata
- Decoy control flow
- Rabbit holes (caminhos sem saída)

### Runtime Equivalence
Manter funcionalidade idêntica apesar das defesas.

## CLI Commands

### Harden Build
```bash
# Aplicar todas as defesas
bla harden ./build/

# Técnicas específicas
bla harden ./build/ --techniques exhaustion,poison,deception
bla harden ./build/ --scope logic,interfaces,metadata
```

### Validate Defense
```bash
# Red team validation
npx bla-agents validate ./build/ --redteam

# Benchmark resistência
bla benchmark ./build/
```

### MCP Integration
```json
{
  "mcpServers": {
    "bla": {
      "command": "npx",
      "args": ["bla-agents", "mcp"]
    }
  }
}
```

## MCP Tools
- `bla_harden` - Aplicar hardening
- `bla_defend` - Defesa específica
- `bla_validate` - Validação red-team
- `bla_benchmark` - Métricas de resistência

## Defense Strategies

| Technique | Description | Impact |
|-----------|-------------|--------|
| Resource Exhaustion | Blow up metadata size | Increases analysis time |
| Canary Injection | False positives | Misleads REA agents |
| Control Flow Flattening | Complex graphs | Harder symbolic execution |
| Interface Obfuscation | Hide real APIs | Blocks API discovery |
| Semantic Noise | Dead code injection | Token waste |

## Integration with Kit
```yaml
# docker-compose.yml adiciona:
services:
  bla-server:
    image: ghcr.io/qybaihe/bla-server:latest
    volumes:
      - ./build:/app/build
```
