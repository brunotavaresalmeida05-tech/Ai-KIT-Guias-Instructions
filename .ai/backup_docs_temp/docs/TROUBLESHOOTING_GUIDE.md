# Resolução de problemas

Última atualização: 2026-11-03.

| Sintoma | Verificação e ação |
|---|---|
| npm não encontra package.json | Entre na pasta do runtime (.ai nesta distribuição) |
| npm.ps1 bloqueado no Windows | Use npm.cmd ou ajuste a política de execução segundo as regras do seu ambiente |
| Script inexistente | Consulte npm run; o comando de testes é npm test |
| Erro de versão ou node:sqlite | Use Node.js >=22.13 e reinstale com npm ci |
| Produção recusa arrancar | Configure API_KEY aleatória com pelo menos 32 caracteres e reveja a mensagem de configuração |
| HTTP 401 | Envie a chave em x-api-key ou Authorization: Bearer |
| Dados desaparecem ao reiniciar | memory é volátil; configure um backend persistente |
| Skill não executável | Markdown fornece orientação; execução exige handler registado |
| Pesquisa pouco semântica | O default hash é determinístico; configure e teste um fornecedor de embeddings se precisar de semântica |
| Integração ignorada | Ative INTEGRATION_TESTS=true e prepare os serviços descritos em GETTING_STARTED |
| Porta ocupada | Escolha API_PORT livre; não termine processos desconhecidos |
| Contentor não responde | Verifique API_HOST, mapeamento de portas, logs e configuração do backend |

Reproduza o problema com npm run check e, quando relevante, npm run test:coverage. Registe versões, comando, erro e backend. Redija logs antes de partilhar: não inclua tokens, URLs com credenciais ou dados pessoais.

Não existe um script npm run diagnostic. Os contratos atuais estão em package.json, src/config.ts e /openapi.json.
