# Strix runtime orchestration

Last updated: 2026-11-03.

Implementation: [orchestrator.ts](../src/strix/orchestrator.ts). Public types include Agent, WorkflowDefinition, Workflow, Task and ExecutionContext. Configuration seeds are in [agent-registry.yml](../config/agent-registry.yml).

## Execution model

Register agents and handlers, then call executeWorkflow(definition). A handler receives a payload and execution context. Agent skills describe suitability; they do not load an LLM, install tools or execute a Markdown instruction automatically.

- sequential executes tasks in order, checking dependencies.
- parallel executes independent tasks subject to agent capacity.
- hybrid executes tasks when named dependencies are available.

Use unique task names, valid dependencies and explicit requiredSkills when affinity matters. Choose retries deliberately: repeated external operations can have side effects. A timeout cannot undo a request already sent to another system. See current tests for failure and capacity contracts.

Workflows are retained in process memory. The scheduler is not a durable job broker, and multiple runtime instances do not share agent capacity. Persist external results deliberately and use a proper queue if durable distributed execution is required.

## Verification

Run npm test -- --runInBand and inspect tests/strix*.test.ts. The executable example is [01-multi-agent-workflow.ts](../examples/01-multi-agent-workflow.ts). Use [IMPLEMENTATION_GUIDE](IMPLEMENTATION_GUIDE.md) for the HTTP/CLI workflow contract.

The former orchestrator/*.js implementation is no longer the active runtime.
