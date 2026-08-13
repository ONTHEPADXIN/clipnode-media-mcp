# ClipNode Media MCP Knowledge Map

This document is the entry map for AI clients and power users. It helps a reader understand the overall capability surface first, then descend into only the relevant branch.

## How To Read

Recommended order:

1. Read this map first.
2. Read the branch that matches the current goal.
3. Only open the detailed docs for that branch.
4. Do not load every capability page unless you actually need cross-domain reasoning.
5. Do not try to reach the ClipNode local service from a sandboxed command. Use an out-of-sandbox request or the MCP tools when a real local-service check is needed.

## Capability Domains

| Domain | What It Covers | Start Here |
|---|---|---|
| Overview | What ClipNode Media MCP is, how the bridge works, and where the plugin fits. | [README.md](../README.md) |
| Capability surface | Task types, tool groups, workflow rules, mode matrix, patch grammar, and validation rules. | [capabilities.md](capabilities.md) |
| Natural-language usage | Copy-ready prompts grouped by goal and media type. | [ai-prompts.md](ai-prompts.md) |
| Patch examples | Patch cookbook with common section/object/action patterns. | [patch-examples.md](patch-examples.md) |
| Visual showcase | Example outputs and transition references. | [showcase.md](showcase.md) |
| Troubleshooting | Connection, auth, permissions, upload/download, and export failures. | [troubleshooting.md](troubleshooting.md) |
| Privacy and local service | Local network model, auth, and safety guidance. | [privacy-and-local-service.md](privacy-and-local-service.md) |
| Codex packaging | Plugin build, runtime layout, and Codex-specific notes. | [../integrations/codex/README.md](../integrations/codex/README.md) |

## Goal-Based Reading Paths

### I just want to know what this plugin can do

Read:

- `README.md`
- `docs/knowledge-map.md`
- `docs/capabilities.md` top sections

### I want to ask AI for a task

Read:

- `docs/knowledge-map.md`
- `docs/ai-prompts.md`
- the relevant branch inside `docs/capabilities.md`

### I want AI to edit the current session draft

Read:

- `docs/knowledge-map.md`
- `docs/capabilities.md`
- `docs/patch-examples.md`
- especially `Interactive Session Editing`, `Interactive Patch Contract`, `Id rules`, and `Validation Contract`

### I want to debug a broken connection or failed export

Read:

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

Start in [capabilities.md](capabilities.md), then move to [ai-prompts.md](ai-prompts.md) for examples.

### Live Session Patching

These cover the currently open ClipNode edit page:

- reading current state
- reading `patchGrammar`
- choosing `sectionPatch`, `objectPatch`, or `actionPatch`
- validating patches
- applying patches
- handling `idMap`, `baseRevision`, undo, and redo

Start in [capabilities.md](capabilities.md).
Then read [patch-examples.md](patch-examples.md) for concrete request shapes.

### Media Discovery And Sources

These cover:

- phone media lists
- asset library browsing
- upload and download
- path validation
- source probing

Start in [capabilities.md](capabilities.md), then use the workflow examples in [ai-prompts.md](ai-prompts.md).

### Catalogs And Style Systems

These cover:

- transition catalog
- sticker capability catalog
- sticker animation catalog
- built-in templates

Start in [capabilities.md](capabilities.md) and use [showcase.md](showcase.md) for visual context.

### Patch Cookbook

This is the fastest route when the AI already knows the goal and only needs a concrete patch shape:

- section patch examples
- sticker action examples
- object patch examples
- image-compose slot examples
- video-composition source and transition examples

Start in [patch-examples.md](patch-examples.md), then open [capabilities.md](capabilities.md) for the rules behind the example.

## Rule Of Thumb

If the user request is small, load the branch only.
If the user request crosses branches, load the map first, then the relevant branches.
If the user only wants a summary, do not open the deep sections unless needed.
