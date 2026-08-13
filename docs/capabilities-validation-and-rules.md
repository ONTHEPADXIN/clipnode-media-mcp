# ClipNode Media MCP Validation And Rules

[中文版本](capabilities-validation-and-rules.zh-CN.md)

This branch covers request shape, validation rules, ids, field constraints, and safety rules.

## Validation Contract

Always call `clipnode_media_validate_task` before `clipnode_media_create_task` for non-HLS media tasks.

Important validation fields:

| Field | Meaning |
|---|---|
| `validationId` | Credential for creating the exact validated request. |
| `planHash` | Hash of the normalized request plan. |
| `planSummary.readableText` | User-facing explanation of the planned edit. |
| `timelineSummary` | Structured clips, transitions, and stickers. |
| `riskHints[]` | Non-blocking warnings such as long export time or many stickers. |
| `suggestedFix` | Patch or alternative suggestion the AI can apply before validating again. |
| `needConfirmation` | Whether the user should confirm before create. |
| `aiDecision.action` | Recommended next action. |

## Patch Request Shape

```json
{
  "sessionId": "current",
  "baseRevision": 0,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_text_sticker",
      "clientTempId": "ai_title_1",
      "value": {
        "x": 0.5,
        "y": 0.82,
        "text": {
          "content": "Title",
          "textSize": 42,
          "color": "#FFFFFFFF"
        }
      }
    }
  ]
}
```

## Supported Patch Types

| Type | Purpose | Key fields |
|---|---|---|
| `sectionPatch` | Merge a top-level edit section. | `section`, `op=merge`, `value` |
| `objectPatch` | Merge, delete, or reorder an existing object. | `collection`, `id`, `op`, `value` |
| `actionPatch` | Add a new object or run a named action. | `action`, `clientTempId`, `value` |

## Current Supported Targets

| Target | Values |
|---|---|
| Sections | `canvas`, `fit`, `transform`, `audio`, `gif`, `imageCompose`, `export` |
| Object collections | `stickers` |
| Object ops | `merge`, `delete`, `duplicate`, `bringToFront`, `sendToBack`, `moveForward`, `moveBackward` |
| Actions | `add_text_sticker`, `add_image_sticker`, `add_gif_sticker` |

## Rules

- Existing object ids must come from `editableIndex`.
- New objects should use `clientTempId`.
- `baseRevision` must match the latest state revision.
- `canvas.preset` supports `original`, `custom`, `1:1`, `4:3`, `3:4`, `3:2`, `2:3`, `9:16`, and `16:9`.
- `fit` supports `center_crop`, `center_inside`, `fit_width`, `fit_height`, `stretch`, and `custom`.
- `transform` supports 90-degree rotate and horizontal/vertical flip.
- `audio.external` requires an App-readable path plus duration metadata.
- `imageComposeSources` and `compositionSegments` use App-visible source rules.
- Sticker image and GIF paths must be App-readable local files.
- `uiHint` is optional and not editing data.

## Safety

- Do not invent unsupported sections, ids, or animation names.
- Do not use PC paths or remote URLs where App-visible paths are required.
- Do not skip validation for complex edits.
- Re-read the current state after apply and trust `lastPatch` plus the returned revision.
