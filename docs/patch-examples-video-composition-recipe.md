# Video Composition Recipe

[中文版本](patch-examples-video-composition-recipe.zh-CN.md)

This page is the smallest end-to-end flow for a video-composition live edit.

## When To Read Me

- You want one complete working flow instead of separate field pages.
- You are composing a real session edit with sources and transitions.
- You want the AI to copy a proven order instead of inventing one.

## One-Pass Flow

1. Read `clipnode_edit_get_current_state`.
2. Check `patchGrammar.modeRules` and `editableIndex`.
3. Probe candidate sources before add or replace.
4. Build `compositionSegments` patches.
5. Set `compositionTransitions` only if the current mode exposes them.
6. Validate the patch.
7. Apply the patch.
8. Read current state again and verify the returned revision.

## Recipe Example

Use this shape when replacing a short timeline with multiple image or video sources.

```json
{
  "sessionId": "current",
  "baseRevision": 31,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "op": "add",
      "clientTempId": "seg_a",
      "value": {
        "index": 0,
        "path": "/storage/emulated/0/DCIM/Camera/img_001.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 3000000,
        "fitMode": "center_crop"
      }
    },
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "op": "add",
      "clientTempId": "seg_b",
      "value": {
        "index": 1,
        "path": "/storage/emulated/0/DCIM/Camera/img_002.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 3000000,
        "fitMode": "center_crop"
      }
    },
    {
      "type": "objectPatch",
      "collection": "compositionTransitions",
      "id": "transition_0",
      "op": "merge",
      "value": {
        "assetPath": "transitions/fade.glsl",
        "durationUs": 500000,
        "audioCrossFade": false
      }
    }
  ]
}
```

## Notes

- Use this recipe when you want a single working path, not just a field reference.
- If the timeline already has segment ids, read them from `editableIndex` and use `merge` or `replace` instead of adding new ones.
- Use `clientTempId` only for objects that are genuinely new.
- If the source is uncertain, probe first, then build the patch.

## Next Pages

- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md)
