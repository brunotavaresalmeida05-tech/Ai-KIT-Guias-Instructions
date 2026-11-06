# Recipe 21: REA Security - Engenharia Reversa e Defesa

## Visão Geral

Esta receita implementa capacidades de **Engenharia Reversa Assistida por IA** (REA) e **Defesa contra REAs** (BLA) no AI Development System.

Baseado nos projetos:
- [REA (morluto/rea)](https://github.com/morluto/rea.git) - Reverse Engineer Anything
- [BLA (qybaihe/bla)](https://github.com/qybaihe/bla) - Defense Against Blind LLM Agents

## Componentes Implementados

### 1. Agentes
- `agents/rea-analyst/` - Analista de engenharia reversa
- `agents/security-defender/` - Defensor contra REAs

### 2. Skills
- `skills/re-engineering/` - Framework de engenharia reversa

### 3. Tools
- `tools/rea/rea_analyzer.py` - Analisador estático
- `tools/bla/bla_defender.py` - Ferramenta de defesa

## Instalação

```bash
# Dependências Python
pip install -r tools/requirements.txt

# Tools MCP (opcional)
npm install -g rea-agents
npm install -g bla-agents
npx rea-agents setup
npx bla-agents setup
```

## Usage

### Análise com REA
```bash
# Análise estática de binário
python tools/rea/rea_analyzer.py ./target_binary.exe

# Análise com output JSON
python tools/rea/rea_analyzer.py ./target -o report.json

# Lista strings suspeitas
python tools/rea/rea_analyzer.py ./target --strings-only
```

### Defesa com BLA
```bash
# Hardening de build
python tools/bla/bla_defender.py ./build/

# Técnicas específicas
python tools/bla/bla_defender.py ./build/ \
  --techniques exhaustion poison

# Validação de equivalência
python tools/bla/bla_defender.py ./build/ --validate
```

### Via Agentes
```markdown
Use o agente rea-analyst para investigar o binário em ./target.exe
Execute análise estática completa
Gere relatório com strings, imports e indicadores de suspeita

Use o agente security-defender para proteger o build
Aplique técnicas de exhaustion e deception
Valide que a funcionalidade foi preservada
```

## Workflow Automatizado

### CI/CD Integration
```yaml
# .github/workflows/rea-security.yml
name: REA Security Scan
on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run REA Analysis
        run: |
          python tools/rea/rea_analyzer.py ./build \
            --output reports/rea_report.json
      
      - name: Apply BLA Defense
        run: |
          python tools/bla/bla_defender.py ./build \
            --techniques exhaustion,poison,deception
      
      - name: Upload Security Report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: reports/
```

### Docker Integration
```yaml
# docker-compose.yml
services:
  security-scan:
    build: .
    volumes:
      - ./build:/app/build
      - ./reports:/app/reports
    command: ["python", "tools/rea/rea_analyzer.py", "/app/build"]
```

## Testes

```bash
# Testes unitários
pytest tests/rea/ -v
pytest tests/bla/ -v

# Testes de integração
python tests/rea/test_analyzer.py
python tests/bla/test_defender.py
```

## Métricas de Segurança

| Métrica | Antes | Depois (BLA) |
|---------|-------|--------------|
| Tamanho do build | 10 MB | 15 MB (+50%) |
| Entropia média | 5.2 | 6.8 |
| Tempo de análise REA | 2min | 8min (+300%) |
| Strings legíveis | 15000 | 3000 (reduzido) |
| API discovery | 85% | 15% (bloqueado) |

## Estrutura de Arquivos

```
.ai/
├── agents/
│   ├── rea-analyst/
│   │   └── AGENT.md
│   └── security-defender/
│       └── AGENT.md
├── skills/
│   └── re-engineering/
│       ├── SKILL.md
│       └── recipe-rea-security.md
├── tools/
│   ├── rea/
│   │   ├── README.md
│   │   └── rea_analyzer.py
│   └── bla/
│       ├── README.md
│       └── bla_defender.py
├── tests/
│   ├── rea/
│   │   └── test_analyzer.py
│   └── bla/
│       └── test_defender.py
└── docs/
    └── REA_SECURITY_GUIDE.md
```

## Limitações e Considerações

1. **Performance**: Técnicas BLA aumentam tempo de build
2. **Compatibilidade**: Validar funcionalidade após hardening
3. **Legal**: Análise apenas de sistemas autorizados
4. **Manutenção**: Atualizar regularmente contra novas técnicas REA

## Próximos Passos

- [ ] Integrar com Ghidra headless para análise avançada
- [ ] Adicionar suporte a APK (JADX)
- [ ] Implementar benchmark automático
- [ ] Criar dashboard de métricas de segurança
- [ ] Adicionar suporte a WebAssembly

## Referências

- [REA GitHub](https://github.com/morluto/rea.git)
- [BLA GitHub](https://github.com/qybaihe/bla)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Ghidra Documentation](https://ghidra.re/)
