# Video Composition Segments

[中文版本](patch-examples-video-composition-segments.zh-CN.md)

Read this page when you need to add, replace, reorder, or trim `compositionSegments`.

## When To Read Me

- The current mode exposes `compositionSegments`.
- You are working with video or GIF sources in a composition timeline.
- You need segment source, trim, fit, crop, rotate, or flip edits.

## Add A Video Segment

```json
{
  "sessionId": "current",
  "baseRevision": 18,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "op": "add",
      "clientTempId": "seg_1",
      "value": {
        "index": 0,
        "path": "/storage/emulated/0/Movies/clip_a.mp4",
        "sourceType": "video",
        "width": 1920,
        "height": 1080,
        "sourceDurationUs": 8000000,
        "sourceStartUs": 0,
        "sourceEndUs": 3000000,
        "frameTimeline": {
          "values": [0, 33333, 66666]
        },
        "keyFrameTimeline": {
          "values": [0, 1000000, 2000000]
        },
        "fitMode": "center_inside"
      }
    }
  ]
}
```

## Replace Or Merge A Segment

Use `merge` or `replace` for an existing segment id from `editableIndex`.

```json
{
  "sessionId": "current",
  "baseRevision": 18,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "id": "seg_1",
      "op": "merge",
      "value": {
        "sourceStartUs": 1000000,
        "sourceEndUs": 5000000,
        "fitMode": "center_crop"
      }
    }
  ]
}
```

## Hard Case: Replace Two Existing Segments With Five Images

When the mode already contains two timeline slots and you want to turn them into a five-image story, first read the old segment ids from `editableIndex`.

Use `merge` or `replace` on the existing ids if you are keeping the same slots. Use `add` with `clientTempId` only for genuinely new segments.

```json
{
  "sessionId": "current",
  "baseRevision": 22,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "id": "seg_old_1",
      "op": "replace",
      "value": {
        "path": "/storage/emulated/0/DCIM/Camera/img_01.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 2500000,
        "fitMode": "center_crop"
      }
    },
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "id": "seg_old_2",
      "op": "replace",
      "value": {
        "path": "/storage/emulated/0/DCIM/Camera/img_02.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 2500000,
        "fitMode": "center_crop"
      }
    },
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "op": "add",
      "clientTempId": "seg_new_3",
      "value": {
        "index": 2,
        "path": "/storage/emulated/0/DCIM/Camera/img_03.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 2500000,
        "fitMode": "center_crop"
      }
    },
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "op": "add",
      "clientTempId": "seg_new_4",
      "value": {
        "index": 3,
        "path": "/storage/emulated/0/DCIM/Camera/img_04.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 2500000,
        "fitMode": "center_crop"
      }
    },
    {
      "type": "objectPatch",
      "collection": "compositionSegments",
      "op": "add",
      "clientTempId": "seg_new_5",
      "value": {
        "index": 4,
        "path": "/storage/emulated/0/DCIM/Camera/img_05.jpg",
        "sourceType": "image",
        "width": 1920,
        "height": 1080,
        "imageDurationUs": 2500000,
        "fitMode": "center_crop"
      }
    }
  ]
}
```

## Common Rules

- Probe sources before add or replace.
- Use `clientTempId` for new segments.
- Existing ids come from `editableIndex`.
- Keep timeline metadata aligned with the probed source.

## Next Pages

- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md)
- [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.md)
- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
