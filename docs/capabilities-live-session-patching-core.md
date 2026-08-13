# ClipNode Media MCP Live Session Core

[中文版本](capabilities-live-session-patching-core.zh-CN.md)

Read this page first when the user is already on the ClipNode session page and wants AI to edit the current draft.

## When To Read Me

Use this page when you need the fastest possible entry for live session editing.

Open the deeper live-session patching page only after this one if you need:

- exact patch decision order
- mode-specific patch rules
- section/object/action examples
- undo/redo or export details

## Read State In This Order

1. `sessionId`
2. `revision`
3. `selectedContext`
4. `patchGrammar.modeRules`
5. `editableIndex`
6. `patchGrammar.sectionCapabilities`
7. `patchGrammar.sectionPatchFields`
8. `lastPatch`

## Patch Choice In One Line

- `sectionPatch` for top-level mode sections
- `objectPatch` for existing objects from `editableIndex`
- `actionPatch` only for supported add actions

## Fast Rules

- Existing ids come from `editableIndex`.
- New objects use `clientTempId`.
- Validate first when ids, paths, or fields are uncertain.
- Re-read state after apply.
- Trust `revision`, `idMap`, and `lastPatch` after apply.

## Fastest Loop

1. Read state.
2. Read `modeRules`.
3. Pick the smallest patch kind.
4. Validate if anything is uncertain.
5. Apply.
6. Re-read and trust the returned revision.

## Start Here Next

- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [patch-examples.md](patch-examples.md)
- [patch-examples-object-edit-matrix.md](patch-examples-object-edit-matrix.md)
- [capabilities-validation-results.md](capabilities-validation-results.md)
