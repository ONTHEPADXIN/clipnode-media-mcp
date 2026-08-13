# AI Execution Guide

[中文版本](ai-execution.zh-CN.md)

This is the execution layer for AI clients. Use it after the entry-choice page.

## Hard Routing

| Situation | First action | Then read |
|---|---|---|
| Current session edit | Call `clipnode_edit_get_current_state` | `capabilities-live-session-patching-core.md` |
| New export task | Call `clipnode_media_get_capabilities` | `capabilities-task-workflows.md` |
| Need source media | Call the phone/media-library selector tool | `capabilities-media-sources.md` |

## Current Session Edit

If the user is already on the ClipNode session page:

1. Read current state.
2. Read `modeRules`.
3. Pick the smallest patch kind.
4. Use `editableIndex` for existing ids.
5. Validate when uncertain.
6. Apply.
7. Re-read and trust `revision`, `idMap`, and `lastPatch`.

## New Export Task

If the user wants a fresh output:

1. Read capabilities.
2. Choose the task type.
3. Select or probe sources.
4. Build one request.
5. Validate before create.
6. Create.
7. Poll until terminal.
8. Download when needed.

## Source Choice

- Phone media path for device media
- Asset library path for reusable prepared media
- Upload return `appPath` or `assetPath` for newly uploaded reusable media

Do not use temporary upload `fileId` as a normal source.

## Failure Recovery

- `revision_conflict` -> re-read state and rebuild
- `pendingSections` -> wait briefly and re-read
- `suggestedFix` -> apply the fix and validate again
- `needConfirmation` -> ask the user before create/export

## Next Pages

- [entry-choice.md](entry-choice.md)
- [knowledge-map.md](knowledge-map.md)
- [capabilities.md](capabilities.md)
- [patch-examples.md](patch-examples.md)
