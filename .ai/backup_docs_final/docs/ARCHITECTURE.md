# Arquitetura implementada

Última atualização: 2026-11-03.

## Limites do sistema

O kit contém uma biblioteca de instruções e um runtime TypeScript opcional. O runtime é um processo Express/CLI; não implementa uma plataforma distribuída de agentes nem um executor universal de Markdown.

Fluxo principal: CLI ou HTTP -> validação -> WorkflowService -> Strix -> handlers registados -> memória, skills executáveis ou eventos.

## Componentes e contratos

| Componente | Código | Responsabilidade |
|---|---|---|
| Arranque e composição | src/server.ts, src/runtime.ts | Configuração, construção e encerramento dos serviços |
| HTTP | src/app.ts, src/api/ | REST, dashboard, OpenAPI, validação e middleware |
| Workflows | src/workflows/service.ts | Handlers integrados e referências a resultados anteriores |
| Orquestração | src/strix/orchestrator.ts | Execução sequencial, paralela ou por dependências |
| Memória | src/claude-mem/store/ | Backends memory, JSON, SQLite e PostgreSQL |
| Embeddings | src/claude-mem/embeddings.ts | Hash local e fornecedores configuráveis |
| Skills | src/skills/catalog.ts, src/taste-skill/skill-framework.ts | Catálogo Markdown separado dos handlers executáveis |
| Eventos | src/laya/notification-hub.ts | Classificação, encaminhamento e ações |
| LLM | src/llm/ | Fornecedores e fallback configurados explicitamente |
| Observabilidade | src/observability/ | Métricas e contexto de tracing |

Os caminhos da tabela são relativos à pasta do kit. Redis, Elasticsearch, Prometheus e Grafana nos templates não implicam integração automática com todos os componentes. Não existe uma API GraphQL ou Socket.IO implementada neste runtime.

## Estado e concorrência

Workflows e eventos são mantidos no processo, sem garantia de recuperação após reinício. A persistência de memória depende do backend. JSON é para uma única instância; SQLite usa o mecanismo local de base de dados; PostgreSQL exige infraestrutura e schema apropriados.

Handlers com efeitos externos devem ser idempotentes ou usar retries=0. Timeout não garante cancelamento de uma chamada externa já enviada. Teste estes contratos antes de ligar sistemas reais.

## Extensões

Registe handlers explicitamente e forneça testes. Um perfil em agents/ ou uma skill Markdown não concede acesso a browser, shell, serviços ou modelos. A integração Python é opcional e não é um segundo servidor de execução do runtime TypeScript.

Use [IMPLEMENTATION_GUIDE](IMPLEMENTATION_GUIDE.md) para o percurso suportado e [SECURITY](SECURITY.md) para os limites de exposição.
