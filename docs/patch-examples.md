# Patch Examples

This page is a compact patch cookbook for AI clients. Read the current state first, then use the smallest patch that fits the current mode.

## Quick Index

| Goal | Example |
|---|---|
| Read the edit state and choose a branch | [Common patch flow](#common-patch-flow) |
| Change canvas, fit, or export settings | [Section patches](#section-patches) |
| Move, duplicate, or reorder stickers | [Sticker object patches](#sticker-object-patches) |
| Add text, image, or GIF stickers | [Action patches](#action-patches) |
| Edit image-compose slots | [Image compose source patches](#image-compose-source-patches) |
| Edit video composition sources and transitions | [Video composition patches](#video-composition-patches) |

## Common Patch Flow

```text
clipnode_edit_get_current_state
-> read revision, editableIndex, patchGrammar.modeRules, sectionCapabilities, and sectionPatchFields
-> choose sectionPatch / objectPatch / actionPatch
-> build the smallest patch that fits the active mode
-> clipnode_edit_validate_patch
-> clipnode_edit_apply_patch
-> read current_state again and verify revision, idMap, changedObjects, changedSections, lastPatch
```

## Section Patches

Use `sectionPatch` for top-level mode sections.

### Canvas blur background in video_edit

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "sectionPatch",
      "section": "canvas",
      "op": "merge",
      "value": {
        "preset": "9:16",
        "background": {
          "mode": "self_blur"
        }
      }
    }
  ]
}
```

### Fit height plus export tune

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "sectionPatch",
      "section": "fit",
      "op": "merge",
      "value": {
        "mode": "fit_height"
      }
    },
    {
      "type": "sectionPatch",
      "section": "export",
      "op": "merge",
      "value": {
        "fps": 24,
        "bitrateFactor": 0.6
      }
    }
  ]
}
```

## Sticker Object Patches

Use `objectPatch` for existing sticker ids from `editableIndex`.

### Move a text sticker and send it backward

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "stickers",
      "id": "sticker_3",
      "op": "merge",
      "value": {
        "x": 0.5,
        "y": 0.82,
        "scale": 0.7
      }
    },
    {
      "type": "objectPatch",
      "collection": "stickers",
      "id": "sticker_3",
      "op": "sendToBack"
    }
  ]
}
```

### Duplicate a sticker

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "stickers",
      "id": "sticker_3",
      "op": "duplicate",
      "clientTempId": "sticker_copy_1"
    }
  ]
}
```

## Action Patches

Use `actionPatch` to create new stickers. Read `patchGrammar.animationNames` and `clipnode_media_validate_app_path` first when path or animation values are uncertain.

### Add a bold title sticker

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_text_sticker",
      "clientTempId": "title_1",
      "value": {
        "x": 0.5,
        "y": 0.1,
        "startUs": 0,
        "endUs": 5000000,
        "text": {
          "content": "Summer Notes",
          "textSize": 42,
          "color": "#FFFFFFFF"
        },
        "textStyle": {
          "bold": true,
          "strokeEnabled": true,
          "strokeWidth": 2,
          "strokeColor": "#FF000000",
          "backgroundColor": "#88000000",
          "backgroundCornerRadius": 12
        },
        "animation": {
          "inName": "FadeHandler",
          "loopName": "",
          "outName": "FadeHandler"
        }
      }
    }
  ]
}
```

### Add an image sticker from an App-visible path

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_image_sticker",
      "clientTempId": "logo_1",
      "value": {
        "x": 0.88,
        "y": 0.12,
        "scale": 0.35,
        "image": {
          "appPath": "/storage/emulated/0/Pictures/logo.png"
        }
      }
    }
  ]
}
```

### Add a GIF sticker with frame timing

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_gif_sticker",
      "clientTempId": "gif_1",
      "value": {
        "x": 0.5,
        "y": 0.5,
        "scale": 0.45,
        "gif": {
          "appPath": "/storage/emulated/0/Pictures/fun.gif",
          "frameTimeList": [0, 120, 240, 360]
        }
      }
    }
  ]
}
```

## Image Compose Source Patches

Use `collection=imageComposeSources` when only one slot needs to change.

### Add one image source

```json
{
  "sessionId": "current",
  "baseRevision": 8,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "imageComposeSources",
      "op": "add",
      "clientTempId": "src_3",
      "value": {
        "index": 2,
        "path": "/storage/emulated/0/Pictures/photo_3.jpg",
        "fitMode": "center_crop"
      }
    }
  ]
}
```

### Replace and move a source slot

```json
{
  "sessionId": "current",
  "baseRevision": 8,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "imageComposeSources",
      "id": "imageComposeSource:1",
      "op": "replace",
      "value": {
        "path": "/storage/emulated/0/Pictures/photo_new.jpg",
        "fitMode": "center_inside"
      }
    },
    {
      "type": "objectPatch",
      "collection": "imageComposeSources",
      "id": "imageComposeSource:1",
      "op": "moveTo",
      "value": {
        "index": 0
      }
    }
  ]
}
```

## Video Composition Patches

Use `collection=compositionSegments` and `collection=compositionTransitions` only when the current mode exposes them.

### Add a probed video segment

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

### Update a transition

```json
{
  "sessionId": "current",
  "baseRevision": 18,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "compositionTransitions",
      "id": "transition_0",
      "op": "merge",
      "value": {
        "assetPath": "transitions/fade.glsl",
        "durationUs": 700000,
        "audioCrossFade": false
      }
    }
  ]
}
```

## Rule Reminders

- Use only ids from `editableIndex` for existing objects.
- Use `clientTempId` for new objects.
- Read `idMap` after apply.
- Re-read state after apply and trust `lastPatch`, `pendingSections`, and `runtimeVerifiedSections`.
- If a field is not listed in `patchGrammar`, do not invent it.
