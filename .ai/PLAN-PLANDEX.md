# Plandex Integration Strategy for AI-KIT

Integrate `plandex` architecture components into AI-KIT to enhance terminal-based AI coding and context management.

## Integration Plan

1.  **Project Mapping (Tree-sitter):**
    - Implement a `context-mapper` module in `AI-KIT` using `tree-sitter` bindings.
    - Objectives:
        - Generate efficient project index files (similar to Plandex maps) for context-heavy AI tasks.
        - Provide fuzzy autocomplete and semantic search capability based on mapped codebase structures.
    - Dependencies: `tree-sitter`, `tree-sitter-<language>` for supported stacks.

2.  **Cumulative Diff Sandbox:**
    - Extend AI-KIT's existing skill system to include a "Sandbox" layer.
    - Objectives:
        - Isolate AI-proposed changes until verified/tested.
        - Implement a mechanism to preview and apply multi-file diffs before merging into the main branch.

3.  **Chat-to-Implementation Flow:**
    - Enhance AI-KIT REPL with a dual-mode interaction:
        - `Chat Mode`: Exploration, planning, project discovery (leveraging the context mapper).
        - `Tell Mode`: Execution-focused, providing step-by-step instructions to the agent with cumulative sandboxing.

4.  **Version Control Integration:**
    - Automate commit message generation and branch management for agentic tasks.
    - Leverage existing git utilities but wrap them in the `plandex` workflow philosophy.

## Implementation Steps

- [ ] Analyze `tree-sitter` integration patterns in `plandex/cli` and `plandex/app`.
- [ ] Create `.ai/src/context/mapper.ts` (or equivalent) for project indexing.
- [ ] Develop the `Sandbox` diff manager to store and manage pending file modifications.
- [ ] Update `AI-KIT` CLI entry point to support stateful chat/tell modes.
