# ClipNode Media MCP Knowledge Map

This document is the entry map for AI clients and power users. It helps a reader understand the overall capability surface first, then descend into only the relevant branch.

## How To Read

Recommended order:

1. Read the two-tree overview first.
2. Read this map next if you need the full branch layout.
3. Read the branch that matches the current goal.
4. Only open the detailed docs for that branch.
5. Do not load every capability page unless you actually need cross-domain reasoning.
6. Do not try to reach the ClipNode local service from a sandboxed command. Use an out-of-sandbox request or the MCP tools when a real local-service check is needed.

## Capability Domains

| Domain | What It Covers | Start Here |
|---|---|---|
| Two capability trees | The parallel headless and live-session trees, how to choose between them, and what each tree is for. | [capability-trees.md](capability-trees.md) |
| Overview | What ClipNode Media MCP is, how the bridge works, and where the plugin fits. | [README.md](../README.md) |
| Entry choice | Shortest first-read page for the three main entry situations. | [entry-choice.md](entry-choice.md) |
| AI execution | Hard routing for current session edit, new export task, and source selection. | [ai-execution.md](ai-execution.md) |
| Task workflows | Main export-task branch for finished outputs. | [capabilities-task-workflows.md](capabilities-task-workflows.md) |
| Media discovery and sources | Phone media, asset library, uploads/downloads, validation, and probe flow. | [capabilities-media-sources.md](capabilities-media-sources.md) |
| Capability surface | Full task types, tool groups, workflow rules, mode matrix, patch grammar, and validation rules. | [capabilities.md](capabilities.md) |
| Natural-language usage | Copy-ready prompts grouped by goal and media type. | [ai-prompts.md](ai-prompts.md) |
| Patch examples | Patch cookbook with common section/object/action patterns. | [patch-examples.md](patch-examples.md) |
| Object edit matrix | Collection-by-collection summary of allowed ops, ids, required fields, and failure points. | [patch-examples-object-edit-matrix.md](patch-examples-object-edit-matrix.md) |
| Validation results | How to read suggestedFix, needConfirmation, revision_conflict, and pendingSections. | [capabilities-validation-results.md](capabilities-validation-results.md) |
| Showcase recipes | Sanitized end-to-end examples that generated app showcase outputs. | [showcase-recipes.md](showcase-recipes.md) |
| Live-session core | Fastest entry for current-session editing, state reading priority, and patch choice. | [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md) |
| Knowledge architecture | Documentation and indexing plan for scaling AI-readable capability docs. | [../../docs/ClipNode_MCP文档架构规划.md](../../docs/ClipNode_MCP文档架构规划.md) |
| Visual showcase | Example outputs and transition references. | [showcase.md](showcase.md) |
| Troubleshooting | Connection, auth, permissions, upload/download, and export failures. | [troubleshooting.md](troubleshooting.md) |
| Privacy and local service | Local network model, auth, and safety guidance. | [privacy-and-local-service.md](privacy-and-local-service.md) |
| Codex packaging | Plugin build, runtime layout, and Codex-specific notes. | [../integrations/codex/README.md](../integrations/codex/README.md) |

## Goal-Based Reading Paths

### I just want to know what this plugin can do

Read:

- `docs/capability-trees.md`
- `docs/entry-choice.md`
- `docs/ai-execution.md`
- `docs/capabilities-task-workflows.md`
- `docs/capabilities-media-sources.md`
- `README.md`
- `docs/knowledge-map.md`
- `docs/capabilities.md` top sections
- `docs/showcase-recipes.md` if you want real end-to-end examples

### I want to ask AI for a task

Read:

- `docs/capability-trees.md`
- `docs/entry-choice.md`
- `docs/ai-execution.md`
- `docs/capabilities-task-workflows.md`
- `docs/capabilities-media-sources.md` if the task needs sources
- `docs/knowledge-map.md`
- `docs/ai-prompts.md`
- the relevant branch inside `docs/capabilities.md`

### I want AI to edit the current session draft

Read:

- `docs/capability-trees.md`
- `docs/entry-choice.md`
- `docs/ai-execution.md`
- `docs/capabilities-task-workflows.md`
- `docs/knowledge-map.md`
- `docs/capabilities-live-session-patching-core.md`
- `docs/capabilities.md`
- `docs/patch-examples.md`
- `docs/patch-examples-object-edit-matrix.md`
- `docs/capabilities-validation-results.md`
- then the detailed branch pages for the exact collection or section

### I want to debug a broken connection or failed export

Read:

- `docs/capability-trees.md`
- `docs/entry-choice.md`
- `docs/ai-execution.md`
- `docs/knowledge-map.md`
- `docs/troubleshooting.md`
- `docs/privacy-and-local-service.md`

## Capability Branches

### Task Workflows

These cover headless export flows such as:

- `video_edit`
- `video_compress`
- `video_composition`
- `gif_edit`
- `video_to_gif`
- `image_edit`
- `image_compose`
- `hls_mp4_export`

Start in [capabilities-task-workflows.md](capabilities-task-workflows.md), then move to [ai-prompts-task-workflows.md](ai-prompts-task-workflows.md) for examples.

### Live Session Patching

These cover the currently open ClipNode edit page:

- reading current state
- reading `patchGrammar`
- choosing `sectionPatch`, `objectPatch`, or `actionPatch`
- validating patches
- applying patches
- handling `idMap`, `baseRevision`, undo, and redo

Start in [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md), then read [capabilities-live-session-patching.md](capabilities-live-session-patching.md).
Then read [ai-prompts-live-session.md](ai-prompts-live-session.md), [patch-examples-object-edit-matrix.md](patch-examples-object-edit-matrix.md), and the relevant patch example branch for concrete request shapes.

### Media Discovery And Sources

These cover:

- phone media lists
- asset library browsing
- upload and download
- path validation
- source probing

Start in [capabilities-media-sources.md](capabilities-media-sources.md), then use the task prompts branch in [ai-prompts-task-workflows.md](ai-prompts-task-workflows.md) when the task needs a concrete source-driven request.

### Catalogs And Style Systems

These cover:

- transition catalog
- sticker capability catalog
- sticker animation catalog
- built-in templates

Start in [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.md) and use [showcase.md](showcase.md) for visual context.

### Patch Cookbook

This is the fastest route when the AI already knows the goal and only needs a concrete patch shape:

- section patch examples
- sticker action examples
- object patch examples
- image-compose slot examples
- video-composition segment, transition, and canvas/export examples

Start in [patch-examples.md](patch-examples.md), then open the exact example branch and the matching capability branch. For video composition, choose the segment, transition, or canvas/export page first.
If you want one complete working flow, open [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.md).

### Documentation Plan

If you want to improve the docs structure itself, start here:

- [../../docs/ClipNode_MCP文档架构规划.md](../../docs/ClipNode_MCP文档架构规划.md)

## Rule Of Thumb

If the user request is small, load the branch only.
If the user request crosses branches, load the map first, then the relevant branches.
If the user only wants a summary, do not open the deep sections unless needed.
If a new tool family is added later, extend this map with one new branch instead of expanding an unrelated page.
