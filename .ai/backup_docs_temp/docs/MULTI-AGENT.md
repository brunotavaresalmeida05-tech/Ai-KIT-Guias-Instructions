# Working with multiple agents

Last updated: 2026-11-03.

## Two distinct mechanisms

Host assistants may provide subagent tools. Use those tools according to the host's permissions and project instructions. The profiles in agents/ are reusable role guidance, not automatically instantiated processes.

The optional Strix runtime schedules registered JavaScript/TypeScript handlers against agent records. It does not itself start a team of coding assistants from Markdown profiles. See [STRIX_ORCHESTRATOR](STRIX_ORCHESTRATOR.md).

## Reliable delegation

1. Define one observable outcome and acceptance criteria.
2. Split independent work by component or file ownership.
3. Give each agent relevant context, constraints and an explicit deliverable.
4. Avoid concurrent edits to the same files; integrate dependent changes sequentially.
5. Review the combined result and execute integration checks after merging work.
6. Report evidence and unresolved limitations rather than treating agreement between agents as proof.

Parallelism helps independent work. It does not remove dependencies, review requirements or resource limits. Tool access, model choice and context limits depend on the host and should not be invented in agent profiles.
