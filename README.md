# AI-KIT — Sistema Universal de Desenvolvimento Assistido por IA

<div align="center">

**Versão:** 2.1.0 &nbsp;|&nbsp; **Skills:** 43 &nbsp;|&nbsp; **Testes:** 160 passados &nbsp;|&nbsp; **Cobertura:** 85.85%

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 22.13](https://img.shields.io/badge/node-%3E%3D22.13-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-160_passing-success.svg)](.ai/tests/)
[![Coverage](https://img.shields.io/badge/coverage-85.85%25-orange.svg)](https://github.com/brunotavaresalmeida05-tech/Ai-KIT-Guias-Instruções)

</div>

---

## 🚀 O que é o AI-KIT?

O **AI-KIT** é um sistema completo de desenvolvimento assistido por IA que combina:

| Camada | O que faz | Onde está |
|--------|-----------|-----------|
| **Skills** | Instruções Markdown que guiam o processo de desenvolvimento | `.ai/skills/` |
| **Runtime** | API REST, orquestração de agentes, memória e workflows | `.ai/src/` |
| **Templates** | Infraestrutura pronta (Docker, Kubernetes, CI/CD) | `.ai/templates/` |
| **Receitas** | Padrões de implementação para problemas comuns | `.ai/recipes/` |

### O que o kit FAZ:
- ✅ Fornece instruções estruturadas para cada fase do desenvolvimento
- ✅ Executa workflows automatizados com multi-agentes
- ✅ Gerencia memória persistente com busca semântica
- ✅ Oferece uma API REST completa
- ✅ Documenta integrações com 9 repositórios externos

### O que o kit NÃO faz:
- ❌ Não instala ferramentas automaticamente
- ❌ Não cria aplicações completas sem direção humana
- ❌ Não transforma skills em agentes executáveis por si só
- ❌ Não substitui decisões de negócio do seu projeto

---

## 📦 Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/brunotavaresalmeida05-tech/Ai-KIT-Guias-Instru-ções.git
cd Ai-KIT-Guias-Instru-ções

# Instale as dependências
npm ci --prefix .ai

# Execute a verificação completa
npm run check --prefix .ai

# Inicie o servidor
npm run dev --prefix .ai

# Abra no navegador
# http://127.0.0.1:3000/dashboard
```

---

## 📁 Estrutura do Projeto

```
Ai-KIT-Guias-Instruções/
├── README.md                # Este arquivo
├── USER_MANUAL.md           # Manual completo do usuário (18 capítulos)
├── AGENTS.md                # Instruções do projeto
│
├── .ai/                     # KIT COMPLETO
│   ├── skills/              # 43 skills (instruções Markdown)
│   │   ├── _framework/      # Framework base
│   │   ├── context-router/  # Roteador de contexto
│   │   ├── code-review/     # Revisão de código
│   │   ├── test-driven-development/
│   │   ├── security-audit/
│   │   └── ... (38 outras)
│   │
│   ├── agents/              # 17 perfis de agentes
│   │   ├── architect.md
│   │   ├── backend-specialist.md
│   │   ├── security-auditor.md
│   │   └── ...
│   │
│   ├── src/                 # Código TypeScript
│   │   ├── strix/           # Orquestrador multi-agente
│   │   ├── claude-mem/      # Sistema de memória
│   │   ├── laya/            # Hub de notificações
│   │   ├── api/             # Rotas REST
│   │   └── workflows/       # Serviço de workflows
│   │
│   ├── tests/               # 16 suites de teste (160 testes)
│   ├── docs/                # Documentação técnica
│   ├── recipes/             # 21 receitas de implementação
│   ├── templates/           # Docker, Kubernetes, CI/CD
│   ├── examples/            # Exemplos de código
│   └── package.json         # Dependências do runtime
│
└── .gitignore
```

---

## ⚙️ Como Funciona

### 1. Skills (Camada de Instrução)

Cada skill é um arquivo `SKILL.md` com **frontmatter YAML** que contém:
- **Nome, categoria e versão** da skill
- **Descrição** do que faz
- **Tags** para categorização
- **When to use** — quando invocar esta skill
- **Input/Output** — schema de dados
- **Execution time** — tempo típico

**Exemplo de fluxo:**
```
Usuário pede "faça code review"
    ↓
Kit lê .ai/skills/context-router/SKILL.md
    ↓
Contexto direciona para .ai/skills/code-review/SKILL.md
    ↓
Instruções são seguidas pelo assistente IA
    ↓
Resultado é produzido seguindo o padrão
```

### 2. Runtime (Camada Executável)

O runtime é um servidor **Express + TypeScript** opcional que oferece:

| Componente | Responsabilidade |
|------------|------------------|
| **Strix** | Orquestração de workflows (sequencial, paralelo, híbrido) |
| **claude-mem** | Memória persistente com busca semântica |
| **Laya** | Hub de eventos e notificações |
| **API REST** | 15+ endpoints para automação |
| **CLI** | Interface de linha de comando |

**Endpoints principais:**
```
GET  /health                    # Status do runtime
GET  /dashboard                 # Painel operacional
GET  /openapi.json              # Especificação da API
POST /api/workflows             # Executar workflow
GET  /api/workflows/:id         # Status do workflow
POST /api/memory/sessions       # Criar sessão
POST /api/memory/documents      # Armazenar documento
GET  /api/memory/search         # Buscar na memória
GET  /api/skills                # Listar skills
POST /api/events                # Ingerir evento
```

### 3. Agentes (Perfis de Trabalho)

O kit define **17 perfis de agentes** em `.ai/agents/`:

| Agente | Função | Quando usar |
|--------|--------|-------------|
| `architect` | Planejamento arquitetural | Início de projeto novo |
| `backend-specialist` | Desenvolvimento backend | APIs, banco de dados |
| `frontend-specialist` | Desenvolvimento frontend | UI, componentes |
| `security-auditor` | Auditoria de segurança | Revisão de código |
| `test-writer` | Escrita de testes | Cobertura e qualidade |
| `code-reviewer` | Revisão de código | Antes de merge |
| `devops-specialist` | Infraestrutura e CI/CD | Deploy, pipelines |
| `doc-writer` | Documentação | Manuais, APIs |

**Uso:**
```markdown
Você atuará como [nome-do-agente].
Siga as instruções em .ai/agents/[nome].md
```

---

## 🧰 Skills Disponíveis (43)

### Desenvolvimento (35)
```
architecture-first      brainstorming         ci-cd-release
code-auditor            code-review          competitive-programming
context-router          continuous-loop      debugging-loop
deploy-manager          documentation-builder graph-visualization
graphify-integration    incident-response-toolkit malware-analysis
mcp-builder             pm-analyst           prompt-builder
public-apis-integration qa-testing           refactor-guardrail
research-agent          safe-development     skill-creator
snippet-library         spec-viva            subagent-driven-development
technical-writer        test-driven-development test-fix-loop
test-generator          threat-intelligence   writing-plans
agent-orchestration     planning-analyst
```

### Segurança (6)
```
detection-rule-engine   evidence-collection  malware-analysis
threat-intelligence     safe-development     code-auditor
```

### Análise (2)
```
graphify-integration    graph-visualization
```

### Educação (1)
```
academy-guide
```

### Criativo (1)
```
algorithmic-art
```

---

## 🔗 Integrações Externas (9 repositórios)

| Repositório | Skills | Descrição |
|-------------|--------|-----------|
| `Anthropics/skills` | 19 skills | Frameworks de desenvolvimento, testing, docs |
| `Graphify-Labs/graphify` | 1 skill | Análise de código com graph (AST/Leiden) |
| `obra/superpowers` | 2 skills | Artefatos web interativos |
| `Hamed233/Cybersecurity-Mastery-Roadmap` | 1 skill | Trilha de aprendizado cybersecurity |
| `Meirwah/awesome-incident-response` | 1 skill | Toolkit DFIR (150+ ferramentas) |
| `CliftonLab/python-malware-analysis` | 1 skill | Análise de malware com ML |
| `public-apis/public-apis` | 1 skill | Catálogo de APIs públicas |
| `hslatman/awesome-threat-intelligence` | 1 skill | Inteligência de ameaças |
| `swisskyrepo/PayloadsAllTheThings` | 1 skill | Técnicas de exploração e segurança |

---

## 🧪 Testes e Qualidade

```bash
# Executar todos os testes
npm test --prefix .ai

# Testes com cobertura
npm run test:coverage --prefix .ai

# Validação completa
npm run check --prefix .ai
```

**Resultado atual:**
- ✅ **16 test suites** — 16 passadas, 1 skipped
- ✅ **160 testes** — 160 passed, 10 skipped
- ✅ **85.85%** statements coverage
- ✅ **86.61%** functions coverage
- ✅ **43 skills** validadas
- ✅ **TypeScript** compilando sem erros

---

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [USER_MANUAL.md](USER_MANUAL.md) | Manual completo do usuário (18 capítulos) |
| [.ai/QUICKSTART.md](.ai/QUICKSTART.md) | Guia de início rápido |
| [.ai/AGENTS.md](.ai/AGENTS.md) | Instruções do kit |
| [.ai/docs/ARCHITECTURE.md](.ai/docs/ARCHITECTURE.md) | Arquitetura do sistema |
| [.ai/docs/API_REFERENCE.md](.ai/docs/API_REFERENCE.md) | Referência da API REST |
| [.ai/docs/SECURITY.md](.ai/docs/SECURITY.md) | Guia de segurança |
| [.ai/docs/IMPLEMENTATION_GUIDE.md](.ai/docs/IMPLEMENTATION_GUIDE.md) | Guia de implementação |
| [.ai/docs/TROUBLESHOOTING_GUIDE.md](.ai/docs/TROUBLESHOOTING_GUIDE.md) | Guia de troubleshooting |

---

## 🔐 Configuração de Segurança

```bash
# Produção — obrigatório
API_KEY=<32+ caracteres aleatórios>
NODE_ENV=production

# LLM Providers (opcional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

**Antes de expor em produção:**
- [ ] TLS configurado no proxy/reverso
- [ ] CORS configurado explicitamente
- [ ] Rate limiting ativado
- [ ] API_KEY com 32+ caracteres
- [ ] Firewall restringindo acesso
- [ ] Logs sem dados sensíveis

---

## 🐳 Docker (opcional)

```bash
# Iniciar com Docker Compose
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down
```

---

## 🤝 Contribuindo

```bash
# 1. Fork o repositório
# 2. Crie uma branch
git checkout -b feature/minha-feature

# 3. Faça suas alterações
# 4. Execute testes
npm run check --prefix .ai

# 5. Commit e push
git commit -m "feat: adicione minha-feature"
git push origin feature/minha-feature

# 6. Abra Pull Request
```

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

<div align="center">

**AI-KIT v2.1.0** — Sistema Universal de Desenvolvimento Assistido por IA  
Desenvolvido com ❤️ por Claude Code

</div>
