> Scope: reference guidance and illustrative designs. External tools, MCP servers and commands mentioned below are not installed or registered by this kit. Verify prerequisites and implementation before use. Current runtime contracts: [ARCHITECTURE](ARCHITECTURE.md), [API_REFERENCE](API_REFERENCE.md). Reviewed scope: 2026-11-03.

# Guia de Segurança REA/BLA

## Visão Geral

Este guia documenta a implementação de capacidades de **Engenharia Reversa Assistida por IA** (REA) e **Defesa contra REAs** (BLA) no AI Development System.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Development System                   │
├─────────────────────────────────────────────────────────────┤
│  Agents              │  Skills            │  Tools         │
│  ├─ rea-analyst      │  ├─ re-engineering │  ├─ rea/       │
│  └─ security-defender│  └─ security-audit │  └─ bla/       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Analysis                         │
├─────────────────────────────────────────────────────────────┤
│  REA MCP Server ──────────► Ghidra/JADX/binwalk            │
│  BLA MCP Server ──────────► Hardening pipeline             │
└─────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. REA (Reverse Engineer Anything)
Permite a agentes de IA inspecionarem:
- Binários nativos (ELF, PE, Mach-O)
- Aplicativos Android (APK)
- WebAssembly
- Firmware
- Capturas de rede

**Ferramentas Integradas:**
- Ghidra (headless)
- JADX
- binwalk/Unblob
- tshark (Wireshark CLI)
- wabt (WebAssembly tools)

### 2. BLA (Blind LLM Agents Defense)
Protege software contra análise automatizada:

| Técnica | Efeito | Custo |
|---------|--------|-------|
| **Exhaustion** | Blow up metadata/headers | +10-50% size |
| **Poison** | Canary tokens false positives | Baixo |
| **Deception** | Decoy flows, rabbit holes | Baixo |

## Uso dos Agentes

### Analisando com REA Analyst
```markdown
USe o agente rea-analyst para investigar o binário em ./target.exe
Execute análise estática completa
Gere relatório com:
- Strings extraídas
- Funções detectadas
- Indicadores de suspeita
- Recomendações de segurança
```

### Aplicando Defesa BLA
```markdown
USe o agente security-defender para proteger o build
Aplique técnicas: exhaustion, poison, deception
Valide equivalência funcional
Gere relatório de segurança
```

## Workflows Comuns

### 1. Auditoria de Segurança
```
1. REA Analisa binário alvo
2. Identifica exponenciais (APIs, segredos)
3. BLA Aplica hardening
4. Red-team valida resistência
5. Documenta vulnerabilidades
```

### 2. Proteção de Build
```
1. Build normal do projeto
2. BLA Harden aplica defesas
3. Validação funcional
4. Deploy versão protegida
```

### 3. Análise Forense
```
1. REA Extrai artefato
2. Agente investiga comportamento
3. Reconstrói lógica potencial
4. Relatório técnico gerado
```

## Configuração MCP

### REA MCP
```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["rea-agents", "mcp"]
    }
  }
}
```

### BLA MCP
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

## Métricas de Resistência

Após aplicar BLA, verificar:

| Métrica | Benchmark |
|---------|-----------|
| Tempo de análise REA | +200-500% |
| Tokens consumidos | +150-300% |
| Taxa de sucesso REA | <-30% |
| Falsos positivos | >80% |

## Segurança & Compliance

### Leis Relevantes
- DMCA Section 1201 (EUA) - Anti-circumvention
- Diretiva EU 2009/24/EC - Software Directive
- LGPD/GDPR - Proteção de dados

### Boas Práticas
- ✅ Análise apenas de sistemas autorizados
- ✅ Manter rastreabilidade
- ✅ Não modificar evidências originais
- ✅ Documentar todas as transformações
- ✅ Respeitar licenses e IP

## Troubleshooting

### REA não detecta formato
```bash
# Verificar suporte
npx rea-agents list-formats

# Instalar engine ausente
pip install ghidra-headless
```

### BLA quebra funcionalidade
```bash
# Valida equivalência
python tools/bla/bla_defender.py . --validate

# Reverter mudanças
git checkout -- build/
```

## Recursos
- [REA GitHub](https://github.com/morluto/rea.git)
- [BLA GitHub](https://github.com/qybaihe/bla)
- [MCP Spec](https://modelcontextprotocol.io/)
- [Ghidra Docs](https://ghidra.re/)
