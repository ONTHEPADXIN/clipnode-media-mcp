# ClipNode Media MCP Live Session Patching

[中文版本](capabilities-live-session-patching.zh-CN.md)

This branch covers the current ClipNode edit page and the live patch loop.

## Reading the Current State

Use `clipnode_edit_get_current_state` first.

Read:

- `sessionId`
- `revision`
- `editableIndex`
- `patchGrammar`
- `selectedContext`
- `lastPatch`

Use `compact=true` for ordinary targeting reads.

## Patch Decision Order

1. Read current state.
2. Read `patchGrammar.modeRules`.
3. Decide whether the request is a section edit, object edit, or action patch.
4. Use only sections/actions/collections exposed by the current mode.
5. Use only ids from `editableIndex` for existing objects.
6. Use `clientTempId` for new objects.
7. Validate first when ids, paths, or field coverage are uncertain.
8. Apply the patch.
9. Re-read current state and check `revision`, `idMap`, `changedObjects`, `changedSections`, `pendingSections`, and `runtimeVerifiedSections`.

## Mode Quick Map

- `video_edit`: canvas, fit, transform, audio, export, stickers
- `video_compress`: timeRange, audio, export
- `video_composition`: compositionSegments, compositionTransitions, canvas, audio, export, stickers
- `image_edit`: canvas, fit, transform, export, stickers
- `image_compose`: imageCompose, export, imageComposeSources
- `gif_edit`: timeRange, canvas, fit, transform, gif, export, stickers
- `video_to_gif`: timeRange, fit, transform, gif, export, stickers

If the active mode does not expose a section, collection, or action, do not invent one.

## Patch Kinds

- `sectionPatch` for top-level section changes.
- `objectPatch` for existing objects from `editableIndex`.
- `actionPatch` for adding new stickers or running named add actions.

## Live Edit Loop

```text
get_current_state
-> inspect patchGrammar
-> choose patch kind
-> validate when uncertain
-> apply
-> read current state again
-> verify revision/idMap/lastPatch/state stability
```

## Export From Live Session

Use `clipnode_edit_create_export` when the user wants the live draft exported.

Use `clipnode_edit_validate_export` only for read-only preflight.

The export panel is shown by the App; this is not an export task workflow.
