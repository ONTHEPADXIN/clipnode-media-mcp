# Object Edit Matrix

[中文版本](patch-examples-object-edit-matrix.zh-CN.md)

Read this page when you need to decide how a collection can be patched without guessing.

## When To Read Me

- You already know the target collection.
- You want the allowed ops, id source, required fields, and common failure points.
- You are about to write an `objectPatch`.

## Matrix

| Collection | Allowed ops | Id source | Must probe? | Must validate? | Required fields | Common failure points |
|---|---|---|---|---|---|---|
| `stickers` | `merge`, `delete`, `duplicate`, `bringToFront`, `sendToBack`, `moveForward`, `moveBackward` | `editableIndex` | No for text stickers; yes for image/GIF stickers with uncertain paths | Yes for non-trivial edits | Existing sticker id; `clientTempId` for duplicate/new | Invented ids, unsupported animation names, stale state after restore |
| `imageComposeSources` | `add`, `merge`, `replace`, `delete`, `move`, `moveTo`, `moveForward`, `moveBackward`, `crop`, `rotate`, `flip`, `fit` | `editableIndex` for existing slots; `clientTempId` for add/duplicate | Yes when source is not freshly trusted | Yes for anything beyond a trivial slot move | App-visible source path, slot index when inserting, layout-safe source fields | Using PC-only paths, replacing the whole list when one slot is enough, wrong slot ordering |
| `compositionSegments` | `add`, `merge`, `replace`, `delete`, `move`, `moveTo`, `moveForward`, `moveBackward` | `editableIndex` for existing segments; `clientTempId` for add | Yes for add/replace | Yes for add/replace and any multi-field change | App-readable path, width, height, `sourceDurationUs`, frame timeline, key frame timeline for video | Missing probe metadata, guessed timelines, mismatched mode, path not visible to App |
| `compositionTransitions` | `merge`, `delete` | `editableIndex` | No | Yes when changing asset or duration | Existing transition id; transition asset or duration fields from current mode rules | Guessing transition ids, using unsupported transition assets, editing transitions when the mode does not expose them |

## Shared Rules

- Existing ids must come from `editableIndex`.
- New objects should use `clientTempId`.
- Probe or validate source metadata first when the source is not fresh from a trusted list.
- Re-read current state after apply and trust `idMap` for canonical ids.

## Common Patterns

- Use `stickers` for on-canvas sticker movement, layering, and duplication.
- Use `imageComposeSources` for one-slot image compose edits.
- Use `compositionSegments` for adding or adjusting timeline sources in video composition.
- Use `compositionTransitions` for transition asset and duration changes.

## Next Pages

- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md)
- [capabilities-validation-results.md](capabilities-validation-results.md)
