# Começar a usar o AI-KIT

Última atualização: 2026-11-03.

## 1. Usar as instruções no seu projeto

Copie apenas os recursos de orientação necessários: skills/, agents/, recipes/, context/ e os guias que referenciem. Coloque-os numa pasta .ai do projeto alvo. Pode copiar a pasta do kit completa, mas exclua .git, node_modules, dist, coverage, .env e dados locais.

Mantenha o AGENTS.md da raiz do seu projeto. Acrescente uma referência ao router e descreva objetivo, stack, comandos de teste, limites e decisões do projeto. Não substitua a especificação da aplicação pela especificação de manutenção deste kit.

Exemplo de instrução na raiz:

~~~markdown
# Instruções do projeto

Antes de trabalhar, leia este ficheiro e .ai/skills/context-router/SKILL.md.
Use apenas as skills pertinentes à tarefa. Preserve as decisões deste projeto.
Objetivo: preencher.
Stack: preencher a partir dos requisitos.
Validação: indicar comandos reais do projeto.
Limites: indicar ambientes, dados e ações autorizados.
~~~

Se o cliente usar outro nome de ficheiro de instruções, acrescente nele a mesma referência. A leitura de .ai não é universal nem automática: no primeiro pedido diga "Leia as instruções do projeto e escolha as skills relevantes para esta tarefa".

Para a primeira funcionalidade: descreva resultado esperado, utilizadores, restrições e critérios de aceitação. Peça um teste de comportamento, implementação, revisão e evidência da validação.

## 2. Usar o runtime opcional

É independente da aplicação alvo. Execute os comandos na pasta que contém o package.json do kit — nesta distribuição, .ai.

~~~sh
cd .ai
node --version
npm ci
npm run check
npm run cli -- validate
npm run dev
~~~

Requisito: Node.js >=22.13. No PowerShell, se a política bloquear npm.ps1, use npm.cmd nos mesmos comandos.

O modo mínimo não requer .env, Docker ou fornecedor de IA: memória volátil, embeddings por hash e LLM desativado. Abra http://127.0.0.1:3000/health e http://127.0.0.1:3000/dashboard.

Para experimentar a CLI, pare o servidor ou abra outro terminal na pasta do kit:

~~~sh
npm run cli -- init sandbox-project
npm run cli -- run sandbox-project/workflows/example.json
~~~

O comando init cria configuração e um workflow de exemplo. Não cria uma aplicação web completa nem instala dependências no projeto de destino. Os caminhos de dados relativos são resolvidos a partir da pasta de execução.

Para persistência e serviços externos, siga [GETTING_STARTED](docs/GETTING_STARTED.md). Para publicar a API, siga [SECURITY](docs/SECURITY.md); não a exponha usando apenas os defaults locais.

## 3. Usar templates de infraestrutura

Escolha templates individualmente, depois de criar a aplicação alvo e definir a stack. Leia cada Dockerfile/Compose/workflow e adapte caminhos, scripts, portas, nomes de imagem, secrets e serviços. Preserve ficheiros existentes e reveja o diff antes de os substituir.

Copiar templates não cria package.json, src/ ou db/init.sql. Um template só está pronto quando o build e os testes da aplicação alvo passam e a configuração foi validada no destino.

## Verificar antes de avançar

- O assistente confirmou as instruções e a stack do projeto.
- Os comandos documentados existem e passam no seu ambiente.
- Skills de orientação são distinguidas de handlers executáveis.
- Segredos e dados locais estão fora do controlo de versões.
- Integrações externas e implantação têm validação própria, com limitações registadas.

Problemas: [TROUBLESHOOTING_GUIDE](docs/TROUBLESHOOTING_GUIDE.md).
