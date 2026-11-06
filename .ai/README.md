# AI Development System (AI-KIT)

Kit para organizar desenvolvimento de projetos com IA: instruções reutilizáveis, perfis de agentes e um runtime opcional com API e CLI.

## Escolha o modo de utilização

| Modo | Para quê | Requisitos |
|---|---|---|
| Instruções | Orientar um assistente no seu projeto com skills e revisões | Cliente de IA que leia ficheiros |
| Runtime | Executar handlers de workflows, memória e eventos | Node.js >=22.13 e npm |
| Templates | Preparar infraestrutura da aplicação alvo | Stack e serviços escolhidos no projeto |

Comece pelo [QUICKSTART.md](QUICKSTART.md). Não precisa de instalar o runtime para usar as instruções.

## Runtime local

Na pasta que contém este README e package.json:

~~~sh
npm ci
npm run check
npm run cli -- validate
npm run dev
~~~

A API escuta por defeito em http://127.0.0.1:3000. Consulte /health, /dashboard e /openapi.json. O arranque mínimo usa memória volátil e embeddings locais por hash; não precisa de chave de LLM, Docker ou rede. A pesquisa por hash não equivale a compreensão semântica por um modelo.

Copie .env.example para .env apenas se precisar de personalizar a configuração. Para produção, configure NODE_ENV=production e uma API_KEY aleatória com pelo menos 32 caracteres. A chave autentica acesso partilhado; não implementa isolamento entre utilizadores. Veja [segurança](docs/SECURITY.md).

## Componentes

- Strix: estratégias sequencial, paralela e híbrida para handlers registados.
- Memória: backends memory, JSON, SQLite e PostgreSQL; fornecedores de embeddings configuráveis.
- Taste-Skill: catálogo de instruções Markdown e framework de handlers executáveis.
- Laya: encaminhamento de eventos e ações; integrações externas exigem handlers/configuração.

A lista de recursos encontra-se no [índice](INDEX.md). Os perfis Markdown não são processos autónomos e o catálogo de skills não executa instruções automaticamente.

## Validação

| Comando | Resultado |
|---|---|
| npm run check | Verificações locais agregadas; veja scripts em package.json |
| npm test | Testes TypeScript/Jest |
| npm run test:coverage | Testes e relatório de cobertura |
| npm run type-check | Verificação TypeScript |
| npm run lint | ESLint |
| npm run build | Compilação para dist/ |
| npm run cli -- validate | Validação dos metadados das skills |
| npm run test:integration | Suite opcional; requer ativação e serviços |

O relatório de cada execução é a evidência de qualidade. A suite padrão não comprova operação com PostgreSQL/Ollama nem implantação em Kubernetes. Consulte [GETTING_STARTED](docs/GETTING_STARTED.md) para integração real.

## Limites e manutenção

Receitas e templates são exemplos a adaptar e testar. Workflows e eventos não constituem uma fila durável distribuída. JSON destina-se a uma instância local; use um backend apropriado para concorrência entre processos. Os serviços opcionais e os templates de implantação precisam de validação no ambiente de destino.

A documentação descreve contratos implementados; documentos marcados como desenho histórico não são instruções operacionais. Consulte [arquitetura](docs/ARCHITECTURE.md), [API](docs/API_REFERENCE.md) e [AGENTS.md](AGENTS.md).

Licença MIT: [LICENSE](LICENSE). Última atualização: 2026-11-03.
