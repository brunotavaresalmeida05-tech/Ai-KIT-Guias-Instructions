# Implementar projetos com o kit

Última atualização: 2026-11-03.

## Desenvolvimento orientado por instruções

1. Especifique o problema e critérios de aceitação no projeto alvo.
2. Selecione skills pelo router: requisitos, arquitetura, plano, implementação/testes e revisão conforme a tarefa.
3. Preserve decisões existentes. Escolha ferramentas e linguagens pelos requisitos, não pelo catálogo disponível.
4. Entregue incrementos verificáveis. Registe testes reais e riscos pendentes.

Os perfis de agents/ ajudam a distribuir responsabilidades. Não instalam ferramentas nem criam agentes executáveis por si próprios.

## Workflow executável mínimo

Crie um ficheiro workflow.json na pasta de trabalho:

~~~json
{
  "name": "hello",
  "strategy": "sequential",
  "tasks": [
    { "name": "greeting", "type": "echo", "payload": { "message": "Hello" }, "retries": 0 }
  ]
}
~~~

Na pasta do kit:

~~~sh
npm run cli -- run workflow.json
~~~

Handlers integrados: echo, delay, memory.store, memory.search, skill.execute e event.ingest. Os payloads e referências a resultados estão em [src/workflows/service.ts](../src/workflows/service.ts). Operações de memória que armazenam documentos requerem uma sessão existente.

## Acrescentar comportamento

Use registerHandler(taskType, handler) no Orchestrator e registe agentes com competências apropriadas. Consulte o exemplo real [01-multi-agent-workflow.ts](../examples/01-multi-agent-workflow.ts) e os testes do orquestrador.

As classes TypeScript pertencem ao código deste repositório; imports fictícios como @strix/orchestrator ou @claude-mem/storage não são pacotes fornecidos pelo kit. Ao integrar como dependência, verifique os ficheiros exportados e o contrato que pretende suportar.

Uma skill Markdown pode orientar a implementação, mas não se torna executável pela presença de um SKILL.md. Implemente um handler e teste entradas, erros, efeitos externos e concorrência antes de o registar.
