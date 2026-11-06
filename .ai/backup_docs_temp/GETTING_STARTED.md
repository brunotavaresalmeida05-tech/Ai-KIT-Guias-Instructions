# Runtime: configuração e validação

Última atualização: 2026-11-03. Comece pelo [Quickstart](../QUICKSTART.md).

## Instalação mínima

Na pasta do package.json do kit, com Node.js >=22.13:

~~~sh
npm ci
npm run check
npm run cli -- validate
npm run dev
~~~

Não configure um fornecedor cloud apenas para testar o kit. O default memory/hash/none funciona sem serviços. /health informa o backend selecionado; /openapi.json descreve a API.

## Configuração

Copie .env.example para .env (PowerShell: Copy-Item .env.example .env; Bash: cp .env.example .env). Ajuste apenas as opções necessárias. A fonte de verdade é [src/config.ts](../src/config.ts).

| Variável | Utilização |
|---|---|
| API_HOST / API_PORT | Endereço e porta de escuta; default local 127.0.0.1:3000 |
| API_KEY | Chave de acesso; obrigatória em produção com pelo menos 32 caracteres |
| MEMORY_BACKEND | memory, json, sqlite ou postgres |
| MEMORY_PATH / SQLITE_PATH | Ficheiro para o backend escolhido |
| DATABASE_URL | Ligação PostgreSQL; obrigatória para postgres |
| EMBEDDING_PROVIDER | hash, openai, ollama ou fallback |
| LLM_PROVIDER | none, openai, anthropic, ollama ou fallback |
| CORS_ORIGIN | Origens explícitas separadas por vírgulas |

Use nomes de configuração presentes no código; variáveis de outro projeto não são automaticamente reconhecidas.

## Persistência local

Defina MEMORY_BACKEND=sqlite no .env para persistência SQLite ou MEMORY_BACKEND=json para um ficheiro JSON de uma única instância. Não partilhe o mesmo ficheiro JSON entre processos. Com memory, os dados desaparecem ao terminar o processo.

## Integração real

A suite de integração exige ativação explícita e os serviços que utiliza. Configure PostgreSQL com o schema de db/init.sql e Ollama acessível em localhost:11434 com o modelo de embeddings instalado. A suite não provisiona esses serviços.

PowerShell:

~~~powershell
$env:INTEGRATION_TESTS = 'true'
$env:MEMORY_BACKEND = 'postgres'
$env:DATABASE_URL = 'postgresql://USER:PASSWORD@127.0.0.1:5432/ai_dev'
npm run test:integration
Remove-Item Env:INTEGRATION_TESTS
~~~

Bash:

~~~sh
INTEGRATION_TESTS=true MEMORY_BACKEND=postgres DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/ai_dev' npm run test:integration
~~~

Substitua USER/PASSWORD por credenciais de um ambiente de teste isolado. Não use uma base de dados de produção. INTEGRATION_BACKEND e INTEGRATION_DATABASE_URL não são opções do carregador de configuração.

Para infraestrutura Docker opcional, reveja docker-compose.yml, configure os segredos locais exigidos e escolha os serviços necessários. Não confunda Compose de desenvolvimento com implantação de produção.

## Evidência de validação

Execute npm run test:coverage e consulte coverage/. Registe versão do Node, comandos, resultado e testes ignorados. Testes unitários não substituem integração, E2E, análise de dependências e validação do destino.
