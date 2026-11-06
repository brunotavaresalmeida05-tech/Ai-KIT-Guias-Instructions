# Segurança: controlos e limites

Última atualização: 2026-11-03.

## Âmbito

Este runtime serve desenvolvimento local e integrações controladas. Não oferece autenticação multiutilizador, RBAC, isolamento de tenants, TLS nativo, encriptação de ficheiros em repouso ou uma fila distribuída durável.

## Configuração segura

O endereço default é 127.0.0.1. Defina API_HOST=0.0.0.0 apenas quando a configuração de rede o exigir, por exemplo num contentor com publicação local controlada.

Em NODE_ENV=production, configure API_KEY com pelo menos 32 caracteres aleatórios. Envie a chave em x-api-key ou Authorization: Bearer. Não coloque chaves em URLs. Uma chave partilhada dá acesso ao mesmo conjunto de recursos; não representa permissões por utilizador.

Mantenha .env e dados locais fora do Git, restrinja permissões dos ficheiros e use um gestor de segredos em ambientes partilhados. Configure origens CORS explícitas. CORS não substitui autenticação.

## Antes de expor o serviço

- TLS no proxy/ingress, headers verificados no caminho real e firewall com acesso mínimo.
- Serviços de dados apenas em rede privada; portas de debug nunca públicas.
- Autorização por identidade se existirem utilizadores ou clientes distintos.
- Backups, restauro e encriptação conforme a classificação dos dados.
- Monitorização, limites de recursos, retenção e rotação de segredos.
- Testes de integração, dependências, segredos e DAST em staging autorizado.

/health, documentação e superfícies operacionais podem fornecer informação de serviço; controle a exposição no proxy. Reveja middleware e rotas ao criar novas funcionalidades.

## Revisão e resposta

Use security-review e security-audit para revisão proporcional à superfície alterada. Execute os scanners configurados no ambiente e registe resultados; a existência de um workflow não prova que tenha corrido. Não anuncie zero vulnerabilidades sem evidência atual e âmbito definido.

Quando encontrar um problema: reproduza num ambiente isolado, escreva um teste, corrija, valide a correção e registe impacto. Não execute ataques contra serviços externos nem modifique produção sem autorização.

As ferramentas opcionais REA/BLA têm finalidade distinta e não substituem autenticação, gestão de vulnerabilidades ou testes de segurança da aplicação.
