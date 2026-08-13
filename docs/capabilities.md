# ClipNode Media MCP Capabilities

This is the English capability index for ClipNode Media MCP.

There are two primary capability trees:

- Headless export tasks for request-driven output creation.
- Live session patching for the current edit page and reusable template shaping.

If you want the Chinese companion, read [capabilities.zh-CN.md](capabilities.zh-CN.md).

Read this page first, then open only the branch that matches the current goal.

## Branches

| Branch | What It Covers | Start Here |
|---|---|---|
| Task workflows | Headless export tasks, supported task types, default workflows, and token-saving rules. | [capabilities-task-workflows.md](capabilities-task-workflows.md) |
| Live session patching | The current edit page, patch decision order, interactive session flow, and live patch behavior. | [capabilities-live-session-patching.md](capabilities-live-session-patching.md) |
| Live session core | Fast-read entry for current-state priority, patch selection, and export handoff. | [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md) |
| Media sources | Phone media, asset library, uploads/downloads, source probing, and local-service access rules. | [capabilities-media-sources.md](capabilities-media-sources.md) |
| Catalogs and style systems | Transition catalog, sticker capability catalog, animation catalog, and built-in templates. | [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.md) |
| Validation and rules | Validation contract, export flow, patch request shape, ids, field rules, and safety rules. | [capabilities-validation-and-rules.md](capabilities-validation-and-rules.md) |
| Validation results | Suggested fix, confirmation, conflict, and pending-state output interpretation. | [capabilities-validation-results.md](capabilities-validation-results.md) |

## Reading Order

For a new task:

1. Read the two-tree overview or this index.
2. Read the branch that matches the goal.
3. If the task needs assets or sources, read the media-sources branch first.
4. If the task uses patching, read the live-session-patching branch first.
5. If the task needs export or readiness checks, read the validation branch.
6. If the task needs catalogs or templates, read the catalogs branch.
7. If the task is an active session edit, open the live-session core page before the deeper branch.

## Rule Of Thumb

- Do not load every branch at once.
- Prefer the narrowest branch that matches the current page or task.
- Re-read the current state after apply/validate.
- If a new tool family appears later, add one more sibling branch and one row here.
