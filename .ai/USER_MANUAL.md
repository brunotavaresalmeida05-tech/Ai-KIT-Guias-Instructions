# Manual de Instruções - AI-KIT
## Sistema Universal de Desenvolvimento Assistido por IA

**Versão:** 2.1.0  
**Data:** 2026-11-05  
**Runtime:** Node.js >= 22.13.0

---

## Índice

1. [Introdução](#1-introdução)
2. [Requisitos do Sistema](#2-requisitos-do-sistema)
3. [Instalação e Configuração](#3-instalação-e-configuração)
4. [Estrutura do Projeto](#4-estrutura-do-projeto)
5. [Uso das Skills (Instruções)](#5-uso-das-skills-instruções)
6. [Uso do Runtime (Opcional)](#6-uso-do-runtime-opcional)
7. [API REST](#7-api-rest)
8. [Workflows](#8-workflows)
9. [Memória e Embeddings](#9-memória-e-embeddings)
10. [Agentes e Orquestração](#10-agentes-e-orquestração)
11. [Integrações](#11-integrações)
12. [Templates e Receitas](#12-templates-e-receitas)
13. [Segurança](#13-segurança)
14. [Testes e Validação](#14-testes-e-validação)
15. [Troubleshooting](#15-troubleshooting)
16. [FAQ](#16-faq)

---

## 1. Introdução

O **AI-KIT** é um sistema de desenvolvimento assistido por IA que combina:

- **Skills** (instruções em Markdown) para guiar o processo de desenvolvimento
- **Runtime** (API/CLI TypeScript) para workflows, memória e orquestração de agentes
- **Templates** de infraestrutura (Docker, CI/CD)
- **Receitas** para padrões comuns de desenvolvimento

### O que o AI-KIT faz

- Fornece instruções para desenvolvimento em diferentes áreas (frontend, backend, segurança, DevOps)
- Executa workflows automatizados com orquestração multi-agentes
- Gerencia memória persistente e busca semântica
- Oferece uma API REST para automação

### O que o AI-KIT NÃO faz

- Não instala ferramentas automaticamente
- Não cria aplicações completas sem intervenção humana
- Não transforma skills Markdown em agentes executáveis sozinhos
- Não substitui a lógica de negócio do seu projeto

---

## 2. Requisitos do Sistema

### Mínimos

- Node.js >= 22.13.0
- npm >= 10.x
- Git

### Recomendados

- Docker e Docker Compose (para templates de infraestrutura)
- PostgreSQL 14+ (para persistência avançada)
- Redis 7+ (para rate limiting distribuído)
- Python 3.11+ (para scripts opcionais de segurança)

### Verificação

```bash
node --version
npm --version
git --version
```

---

## 3. Instalação e Configuração

### 3.1 Copiar o Kit

```bash
# Copie apenas os recursos necessários para seu projeto
cp -r .ai/ ./
```

Ou copie todo o kit se estiver desenvolvendo dentro dele:

```bash
cd .ai
npm ci
```

### 3.2 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Obrigatório para produção
API_KEY=minimo_32_caracteres_aleatorios

# Opcional
NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=3000

# LLM Providers (opcional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

### 3.3 Primeiros Comandos

```bash
# Navegar até a pasta do kit
cd .ai

# Instalar dependências
npm ci

# Executar verificação completa
npm run check

# Iniciar desenvolvimento
npm run dev
```

---

## 4. Estrutura do Projeto

```
.ai/
├── AGENTS.md              # Instruções principais
├── QUICKSTART.md          # Guia rápido
├── package.json           # Dependências e scripts
├── tsconfig.json          # Configuração TypeScript
├── jest.config.js         # Configuração de testes
│
├── skills/                # Instruções (Markdown)
│   ├── _framework/        # Framework base
│   ├── context-router/    # Roteador de contexto
│   ├── code-review/       # Revisão de código
│   ├── test-driven-development/
│   ├── security-audit/
│   └── ... (43 skills)
│
├── agents/                # Perfis de agentes
│   ├── architect.md
│   ├── backend-specialist.md
│   ├── security-auditor.md
│   └── ...
│
├── src/                   # Código TypeScript
│   ├── api/               # Rotas REST
│   ├── strix/             # Orquestrador
│   ├── claude-mem/        # Sistema de memória
│   ├── workflows/         # Service de workflows
│   └── ...
│
├── tests/                 # Testes automatizados
├── docs/                  # Documentação
├── recipes/               # Receitas de implementação
├── examples/              # Exemplos de uso
└── backup/                # Backup automático
```

---

## 5. Uso das Skills (Instruções)

### O que são Skills?

Skills são arquivos `SKILL.md` com frontmatter YAML que contêm instruções para tarefas específicas. Elas guiam o assistente de IA durante o desenvolvimento.

### Como Usar

1. **Leia as instruções do projeto e escolha skills relevantes:**

```markdown
# Antes de trabalhar, leia:
# - AGENTS.md
# - .ai/skills/context-router/SKILL.md
# - .ai/skills/{skill-relevante}/SKILL.md
```

2. **Skills Principais por Categoria:**

#### Desenvolvimento
| Skill | Arquivo | Uso |
|-------|---------|-----|
| Architecture First | `architecture-first/SKILL.md` | Planejamento arquitetural |
| Writing Plans | `writing-plans/SKILL.md` | Criação de planos detalhados |
| TDD Workflow | `test-driven-development/SKILL.md` | Desenvolvimento orientado a testes |
| Code Review | `code-review/SKILL.md` | Revisão de código |
| Debugging Loop | `debugging-loop/SKILL.md` | Correção iterativa |
| Subagent Development | `subagent-driven-development/SKILL.md` | Desenvolvimento com subagentes |

#### Segurança
| Skill | Arquivo | Uso |
|-------|---------|-----|
| Security Audit | `security-audit/SKILL.md` | Auditoria de segurança |
| Security Review | `security-review/SKILL.md` | Revisão de segurança |
| Malware Analysis | `malware-analysis/SKILL.md` | Análise de malware |
| Incident Response | `incident-response-toolkit/SKILL.md` | Resposta a incidentes |
| Threat Intelligence | `threat-intelligence/SKILL.md` | Inteligência de ameaças |

#### Qualidade
| Skill | Arquivo | Uso |
|-------|---------|-----|
| Code Auditor | `code-auditor/SKILL.md` | Auditoria automática |
| Test Fix Loop | `test-fix-loop/SKILL.md` | Correção de testes |
| QA Testing | `qa-testing/SKILL.md` | Testes de qualidade |
| Performance Tuning | `performance-tuning/SKILL.md` | Otimização |

#### Educação
| Skill | Arquivo | Uso |
|-------|---------|-----|
| Cybersecurity Roadmap | `cybersecurity-roadmap/SKILL.md` | Trilha de aprendizado |

### 3. Criar uma Nova Skill

```bash
# 1. Copiar template base
cp skills/_framework/_base/SKILL.md skills/my-skill/SKILL.md

# 2. Editar o SKILL.md
# 3. Atualizar o router em skills/context-router/SKILL.md
# 4. Validar
npm run cli -- validate
```

---

## 6. Uso do Runtime (Opcional)

O runtime é um servidor Express/CLI opcional para executar workflows, gerenciar memória e orquestrar agentes.

### Iniciar o Servidor

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Modo produção
npm start

# Verificar saúde
curl http://127.0.0.1:3000/health
```

### CLI Commands

```bash
# Validar skills
npm run cli -- validate

# Inicializar projeto
npm run cli -- init meu-projeto

# Executar workflow
npm run cli -- run workflow.json
```

### Dashboard

Acesse o dashboard operacional:
- http://127.0.0.1:3000/dashboard
- http://127.0.0.1:3000/metrics

---

## 7. API REST

### Endpoints Principais

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do runtime |
| GET | `/dashboard` | Dashboard operacional |
| GET | `/metrics` | Métricas de operação |
| GET | `/openapi.json` | Especificação OpenAPI |
| GET | `/api/system/stats` | Estatísticas do sistema |

### Workflows

```bash
# Listar workflows
GET /api/workflows

# Executar workflow
POST /api/workflows
{
  "name": "meu-workflow",
  "strategy": "sequential",
  "tasks": [
    { "name": "tarefa-1", "type": "echo", "payload": { "value": "olá" } }
  ]
}

# Obter resultado
GET /api/workflows/:id
```

### Memória

```bash
# Criar sessão
POST /api/memory/sessions
{ "userId": "usuario-123" }

# Armazenar documento
POST /api/memory/documents
{
  "sessionId": "uuid-da-sessao",
  "content": "Conteúdo a armazenar",
  "type": "contexto",
  "metadata": { "fonte": "projeto" }
}

# Buscar documentos
GET /api/memory/search?q=documento&sessionId=uuid
```

### Skills

```bash
# Listar skills
GET /api/skills

# Validar catálogo
POST /api/skills/validate

# Executar skill (se handler registrado)
POST /api/skills/meu-skill/execute
```

### Eventos

```bash
# Ingerir evento
POST /api/events
{
  "source": "sistema",
  "type": "alert",
  "title": "Erro crítico",
  "description": "Descrição do problema"
}

# Listar eventos
GET /api/events
```

### Autenticação

Em produção, inclua o header:

```bash
curl -H "x-api-key: SEU_CHAVE" http://127.0.0.1:3000/api/workflows
# ou
curl -H "Authorization: Bearer SEU_CHAVE" http://127.0.0.1:3000/api/workflows
```

---

## 8. Workflows

### O que são Workflows?

Workflows são sequências de tarefas que podem ser executadas automaticamente pelo orquestrador.

### Estratégia de Execução

| Estratégia | Comportamento |
|------------|---------------|
| `sequential` | Tarefas executadas uma após outra |
| `parallel` | Tarefas executadas simultaneamente |
| `hybrid` | Combinação de sequencial e paralelo |

### Workflow Example

```json
{
  "name": "deploy-test",
  "strategy": "sequential",
  "tasks": [
    {
      "name": "lint",
      "type": "echo",
      "payload": { "message": "Executando lint" },
      "retries": 0
    },
    {
      "name": "test",
      "type": "echo",
      "payload": { "message": "Executando testes" },
      "retries": 2,
      "dependencies": ["lint"]
    },
    {
      "name": "build",
      "type": "echo",
      "payload": { "message": "Construindo" },
      "retries": 1,
      "dependencies": ["test"]
    }
  ]
}
```

### Handlers Integrados

| Tipo | Descrição |
|------|-----------|
| `echo` | Retorna o payload recebido |
| `delay` | Aguarda tempo especificado |
| `memory.store` | Armazena documento na memória |
| `memory.search` | Busca documentos na memória |
| `skill.execute` | Executa uma skill |
| `event.ingest` | Ingera um evento no sistema |

### Criar Handler Customizado

```typescript
import Orchestrator from './src/strix/orchestrator';

const orchestrator = new Orchestrator();

// Registrar handler
orchestrator.registerHandler('meu-tipo', async (payload, context) => {
  // Implementação
  return { resultado: 'sucesso' };
});

// Registrar agente com competência
orchestrator.registerAgent({
  name: 'meu-agente',
  type: 'worker',
  skills: ['meu-tipo'],
  status: 'idle',
  capabilities: {},
  maxConcurrent: 3
});
```

---

## 9. Memória e Embeddings

### Backend de Armazenamento

| Backend | Localização | Uso |
|---------|-------------|-----|
| MemoryStore | Memória RAM | Desenvolvimento, testes |
| JsonStore | Ficheiro JSON | Pequenos projetos |
| SqliteStore | Ficheiro SQLite | Projetos locais |
| PostgresStore | PostgreSQL | Produção escalável |

### Configuração

```typescript
import { createMemoryStore } from './src/claude-mem/store/factory';
import { InMemoryBackend } from './src/claude-mem/store/memory-store';

// Criar store
const store = createMemoryStore('json', { path: './data/memory.json' });
const memory = new InMemoryBackend(store, logger);
await memory.init();
```

### Embeddings

| Provider | Funcionalidade |
|----------|----------------|
| HashEmbeddingProvider | Hash local (rápido, sem ML) |
| OpenAIEmbeddingProvider | Embeddings via OpenAI API |
| CustomEmbeddingProvider | Implementação própria |

---

## 10. Agentes e Orquestração

### Perfis de Agentes

| Agente | Função |
|--------|--------|
| `architect` | Planejamento arquitetural |
| `backend-specialist` | Desenvolvimento backend |
| `frontend-specialist` | Desenvolvimento frontend |
| `security-auditor` | Auditoria de segurança |
| `test-writer` | Escrita de testes |
| `devops-specialist` | Infraestrutura e CI/CD |
| `doc-writer` | Documentação |

### Como Usar Perfis

```markdown
# Instrução para o assistente:
"Você atuará como [perfil]. Siga as instruções em agents/[perfil].md"
```

### Orquestração Multi-Agentes

```typescript
import Orchestrator from './src/strix/orchestrator';

const orchestrator = new Orchestrator();

// Registrar múltiplos agentes
const agent1 = orchestrator.registerAgent({
  name: 'analyst',
  type: 'specialist',
  skills: ['analysis', 'reporting'],
  status: 'idle',
  capabilities: {},
  maxConcurrent: 5
});

const agent2 = orchestrator.registerAgent({
  name: 'coder',
  type: 'worker',
  skills: ['coding', 'testing'],
  status: 'idle',
  capabilities: {},
  maxConcurrent: 3
});
```

---

## 11. Integrações

O AI-KIT integra-se com repositórios externos para skills adicionais:

| Repositório | Skills Integradas | Descrição |
|-------------|-------------------|-----------|
| `Anthropics/skills` | 19 skills | Frameworks de desenvolvimento, testing, documentação |
| `obra/superpowers` | 2 skills | Artefatos web, design |
| `Graphify-Labs/graphify` | 1 skill | Análise de código com graph |
| `Hamed233/Cybersecurity-Mastery-Roadmap` | 1 skill | Trilha de aprendizado cybersecurity |
| `Meirwah/awesome-incident-response` | 1 skill | Toolkit de resposta a incidentes |
| `CliftonLab/python-malware-analysis` | 1 skill | Análise de malware |
| `api-directory/public-apis` | 1 skill | Catálogo de APIs públicas |
| `ThreatInstitute/awesome-threat-intelligence` | 1 skill | Inteligência de ameaças |

### Verificar Integrações

```bash
# Validar todas as skills
npm run cli -- validate

# Verificar status
cat docs/*/INTEGRATION.md
```

---

## 12. Templates e Receitas

### Receitas Disponíveis

| Receita | Arquivo | Descrição |
|---------|---------|-----------|
| JWT Auth | `recipes/recipe-01-jwt-authentication.md` | Autenticação JWT |
| OAuth2 | `recipes/recipe-02-oauth2-integration.md` | OAuth2 |
| DB Migrations | `recipes/recipe-03-database-migrations.md` | Migrações de banco |
| Error Handling | `recipes/recipe-04-error-handling-logging.md` | Tratamento de erros |
| Rate Limiting | `recipes/recipe-05-rate-limiting.md` | Limitação de taxa |
| Caching | `recipes/recipe-06-caching-redis.md` | Cache Redis |
| GraphQL | `recipes/recipe-07-graphql-api.md` | API GraphQL |
| File Upload | `recipes/recipe-08-file-upload.md` | Upload de arquivos |
| Email | `recipes/recipe-09-email-service.md` | Serviço de email |
| SMS | `recipes/recipe-10-sms-service.md` | Serviço SMS |
| Elasticsearch | `recipes/recipe-11-elasticsearch.md` | Busca Elasticsearch |
| WebSocket | `recipes/recipe-12-websocket-realtime.md` | Tempo real WebSocket |
| Background Jobs | `recipes/recipe-13-background-jobs.md` | Jobs em background |
| API Versioning | `recipes/recipe-14-api-versioning.md` | Versionamento de API |
| Monitoring | `recipes/recipe-15-monitoring.md` | Monitoramento |
| Testing | `recipes/recipe-16-testing-qa.md` | Testes e QA |
| Performance | `recipes/recipe-17-performance-optimization.md` | Otimização |
| Security | `recipes/recipe-18-security-hardening.md` | Hardening |
| DevOps | `recipes/recipe-19-devops-deployment.md` | Deploy |
| Production Checklist | `recipes/recipe-20-production-checklist.md` | Checklist produção |
| REA Security | `recipes/recipe-21-rea-security.md` | Segurança REA |

### Templates de Infraestrutura

```bash
# Docker Compose
cat templates/docker/docker-compose.yml

# GitHub Actions
cat templates/ci/github-actions.yml

# Kubernetes
cat templates/k8s/deployment.yml
```

---

## 13. Segurança

### Configuração Segura

```bash
# Produção exige:
NODE_ENV=production
API_KEY=<32+ caracteres aleatórios>
API_HOST=127.0.0.1  # Apenas para desenvolvimento local

# Em produção:
# - Use TLS no proxy/reverso
# - Configure CORS explicitamente
# - Use firewall com acesso mínimo
# - Rotacione segredos periodicamente
```

### Checklist de Segurança

- [ ] API_KEY configurado (mínimo 32 caracteres)
- [ ] CORS configurado para origens específicas
- [ ] Rate limiting ativado
- [ ] Headers de segurança (helmet)
- [ ] Logs não expõem dados sensíveis
- [ ] Backups configurados
- [ ] Monitoramento ativo

### Comandos de Segurança

```bash
# Auditoria de dependências
npm run security:audit

# Scanning com Trivy
npm run security:trivy

# Gitleaks
npm run security:gitleaks

# Verificação de licenses
npm run security:license

# Todos os scans
npm run security:all
```

---

## 14. Testes e Validação

### Comandos de Teste

```bash
# Executar todos os testes
npm test

# Testes com cobertura
npm run test:coverage

# Testes de integração
npm run test:integration

# Build TypeScript
npm run build

# Validação de tipos
npm run type-check

# Lint
npm run lint

# Verificação completa
npm run check
```

### Estrutura de Testes

```
tests/
├── api.test.ts              # Testes da API REST
├── config.test.ts           # Testes de configuração
├── llm.test.ts              # Testes de providers LLM
├── observability.test.ts    # Testes de métricas/tracing
├── security-contracts.test.ts # Testes de segurança
├── skill-framework-internals.test.ts # Framework de skills
├── store.test.ts            # Testes de memória
├── strix.test.ts            # Testes do orquestrador
├── strix-contracts.test.ts  # Contratos do orquestrador
├── taste-skill.test.ts      # Framework de skills executáveis
├── workflow-service.test.ts # Testes de workflows
└── ...
```

### Cobertura Atual

- **Statements:** 85.85%
- **Branches:** 69.39%
- **Functions:** 86.61%
- **Lines:** 85.79%

---

## 15. Troubleshooting

### Problemas Comuns

#### Testes falhando

```bash
# Limpar cache e reinstalar
rm -rf node_modules
npm ci

# Executar com mais debug
npm test -- --verbose
```

#### Erro "AbortController is not defined"

Certifique-se de estar usando Node.js >= 22.13.0:
```bash
node --version
```

#### Erro de permissão no PowerShell

```powershell
# Executar com Bypass
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run dev
```

#### Erro "ENOENT: no such file or directory"

Verifique se está no diretório correto:
```bash
pwd  # Deve mostrar .ai
ls package.json
```

#### Validação falhando

```bash
# Verificar schema das skills
npm run cli -- validate --verbose

# Revalidar após criar/editar skill
cp skills/_framework/_base/SKILL.md skills/nova-skill/SKILL.md
```

### Verificações Automáticas

```bash
# Verificação completa
npm run check

# Relatório de saúde
curl http://127.0.0.1:3000/health
```

---

## 16. FAQ

### Q: Preciso usar o runtime?
**R:** Não. O kit funciona como instrução sem o runtime. Use o runtime apenas se precisar de workflows automatizados, memória persistente ou orquestração de agentes.

### Q: Como adicionar uma nova skill?
**R:**
1. Crie `skills/minha-skill/SKILL.md` baseado no template
2. Atualize o router em `skills/context-router/SKILL.md`
3. Execute `npm run cli -- validate`
4. Referencie nos agentes ou receitas

### Q: Skills são executáveis?
**R:** Não necessariamente. Skills são instruções Markdown. Para execução, implemente um handler em TypeScript e registre no orquestrador.

### Q: Como usar múltiplos LLM providers?
**R:** Configure no `.env`:
```bash
PROVIDER=openai  # ou anthropic, ollama, fallback
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
FALLBACK_ORDER=openai,anthropic,ollama
```

### Q: Posso usar Python junto com TypeScript?
**R:** Sim. Scripts Python opcionais existem em `src/autonomy/` e `src/rate_limit/`. Eles são integrados via subprocess, não são um segundo servidor.

### Q: Como fazer backup?
**R:** O kit cria backups automáticos em `backup/`. Você também pode usar:
```bash
npm run cli -- backup
```

### Q: Onde encontro exemplos?
**R:**
- `examples/` - Exemplos de código
- `recipes/` - Receitas de implementação
- `docs/` - Documentação técnica

### Q: Como contribuir?
**R:**
1. Fork o repositório
2. Crie branch (`git checkout -b feature/minha-feature`)
3. Faça alterações e adicione testes
4. Execute `npm run check`
5. Submit pull request

---

## Links Úteis

| Recurso | Localização |
|---------|-------------|
| README principal | `README.md` |
| Guia rápido | `QUICKSTART.md` |
| Arquitetura | `docs/ARCHITECTURE.md` |
| API Reference | `docs/API_REFERENCE.md` |
| Segurança | `docs/SECURITY.md` |
| Implementação | `docs/IMPLEMENTATION_GUIDE.md` |
| Troubleshooting | `docs/TROUBLESHOOTING_GUIDE.md` |
| Integrações | `docs/*/INTEGRATION.md` |

---

**AI-KIT v2.1.0** - Sistema de Desenvolvimento Assistido por IA  
*Desenvolvido com ❤️ por Agnes*
