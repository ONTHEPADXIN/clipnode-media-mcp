# Capability Trees

[中文版本](capability-trees.zh-CN.md)

ClipNode Media MCP has two parallel capability trees. The AI should pick one first, then only read the branch for that tree.

## Tree 1: Export Task Workflows

Use this tree for request-driven output creation.

Good fits:

- fresh finished outputs
- repeatable or batchable workflows
- script-like export recipes
- reusable examples that will later become export tasks

Typical flow:

1. Read capabilities.
2. Choose the task type.
3. Discover or probe sources.
4. Validate the plan.
5. Create the task.
6. Poll progress.
7. Download the result.

Best-fit branches:

- [capabilities-task-workflows.md](capabilities-task-workflows.md)
- [capabilities-media-sources.md](capabilities-media-sources.md)
- [ai-prompts-task-workflows.md](ai-prompts-task-workflows.md)
- [showcase-recipes.md](showcase-recipes.md)
- [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.md)

## Tree 2: Live Session Patching

Use this tree for editing the currently open ClipNode session.

Good fits:

- changing the current draft on the edit page
- letting AI follow a person's live editing intent
- shaping reusable settings or templates that later feed export workflows
- reading current state before choosing the smallest safe patch

Typical flow:

1. Read current state.
2. Read `modeRules`.
3. Use `editableIndex` for existing ids.
4. Pick the smallest patch kind.
5. Validate when uncertain.
6. Apply.
7. Re-read and trust `revision`, `idMap`, and `lastPatch`.

Best-fit branches:

- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [patch-examples.md](patch-examples.md)
- [patch-examples-object-edit-matrix.md](patch-examples-object-edit-matrix.md)
- [capabilities-validation-results.md](capabilities-validation-results.md)
- [ai-prompts-live-session.md](ai-prompts-live-session.md)

## Shared Foundation

Both trees use the same base layer:

- source discovery and probing
- App-readable path validation
- validation and recovery rules
- id handling and `editableIndex`
- catalogs, templates, and style systems
- export result reading and failure interpretation

Best-fit branches:

- [capabilities-media-sources.md](capabilities-media-sources.md)
- [capabilities-validation-and-rules.md](capabilities-validation-and-rules.md)
- [capabilities-validation-results.md](capabilities-validation-results.md)
- [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.md)

## Reading Rule

If the user wants a new output, start with the export-task tree.
If the user is already on the edit page, start with the live-session tree.
If the goal is unclear, read this page first, then branch once.
