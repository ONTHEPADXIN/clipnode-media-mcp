# Showcase Recipes

[中文版本](showcase-recipes.zh-CN.md)

These are sanitized, runnable examples based on real scripts that have already produced ClipNode showcase outputs.

## When To Read Me

- You want a complete sample for `video_composition` using asset-library images and transition catalogs.
- You want a complete sample for `video_edit` with a logo overlay and text stickers.
- You want an example that is closer to a real end-to-end script than a field-level patch page.

## Runnable Scripts

| Script | Scenario | What It Proves |
|---|---|---|
| `examples/transition-showcase-recipes.mcp-client.js` | Asset-library images plus transition catalog items | A full `video_composition` showcase flow with sources, transitions, logo stickers, and export. |
| `examples/logo-overlay-showcase.mcp-client.js` | One source video plus logo and text stickers | A full `video_edit` overlay flow with probe, stickers, validation, and export. |
| `examples/asset-library-video-composition.mcp-client.js` | Asset-library driven composition | A related composition path that selects reusable sources and transitions from prepared assets. |
| `examples/video-composition-mixed-stickers.mcp-client.js` | Mixed media composition with stickers | A related composition path that combines phone media, transitions, and sticker overlays. |

## Recipe 1: Transition Showcase Video

Based on `generate-transition-showcases.js`.

What it does:

- uploads a reusable logo into the asset library
- searches an image theme from the asset library
- lists transition assets by group
- builds a `video_composition` request with sources, transitions, stickers, canvas, and export settings
- validates, creates, waits, and downloads the result

### Sanitized flow

```text
configure -> beginTask -> upload logo -> search asset images -> list transitions
-> probe sources -> build request -> validate -> create -> wait -> download
```

### Sanitized request shape

```json
{
  "taskType": "video_composition",
  "sources": [
    {
      "id": "clip_0",
      "path": "/app-visible/asset-library/image/<theme>/image_001.jpg",
      "durationUs": 5000000,
      "fit": { "mode": "center_crop" },
      "audio": { "mute": true, "volume": 0 }
    }
  ],
  "transitions": [
    {
      "id": "transition_0",
      "fromClipId": "clip_0",
      "toClipId": "clip_1",
      "assetPath": "transitions/<group>/<transition>.glsl",
      "durationUs": 3000000,
      "audioCrossFade": false
    }
  ],
  "specPatch": {
    "canvas": { "preset": "custom", "width": 1280, "height": 720 },
    "audio": { "mute": true, "volume": 0 },
    "stickers": {
      "items": [
        {
          "id": "clipnode_logo_top_right",
          "type": "image",
          "image": { "path": "/app-visible/asset-library/image/<theme>/logo.png" },
          "x": 0.945,
          "y": 0.096,
          "scale": 0.5
        },
        {
          "id": "clipnode_logo_text",
          "type": "text",
          "text": { "content": "ClipNode", "textSize": 24 },
          "x": 0.945,
          "y": 0.186,
          "scale": 0.95
        }
      ]
    },
    "export": { "fps": 24, "keepAudio": false, "bitrateFactor": 0.55 }
  }
}
```

## Recipe 2: Logo Overlay Video Edit

Based on `add-clipnode-logo-overlay.js`.

What it does:

- takes one app-visible video source
- probes its duration
- uploads a logo image into the asset library
- builds a `video_edit` request with canvas, fit, audio, and two stickers
- validates, creates, waits, and downloads the result

### Sanitized flow

```text
configure -> beginTask -> upload logo -> probe source -> build request -> validate -> create -> wait -> download
```

### Sanitized request shape

```json
{
  "taskType": "video_edit",
  "source": { "path": "/app-visible/video/<source>.mp4" },
  "sources": [
    {
      "id": "clip_0",
      "path": "/app-visible/video/<source>.mp4",
      "trim": { "startUs": 0, "endUs": 8000000 },
      "fit": { "mode": "center_crop" },
      "audio": { "mute": true, "volume": 0 }
    }
  ],
  "specPatch": {
    "timeRange": { "startUs": 0, "endUs": 8000000 },
    "canvas": { "preset": "custom", "width": 1280, "height": 720 },
    "fit": { "mode": "center_crop" },
    "audio": { "mute": true, "volume": 0 },
    "stickers": {
      "items": [
        {
          "id": "logo_image",
          "type": "image",
          "image": { "path": "/app-visible/asset-library/image/<theme>/logo.png" },
          "x": 0.945,
          "y": 0.096,
          "scale": 0.5
        },
        {
          "id": "logo_text",
          "type": "text",
          "text": { "content": "ClipNode", "textSize": 24 },
          "textStyle": {
            "bold": true,
            "strokeEnabled": true,
            "glowEnabled": true
          },
          "x": 0.945,
          "y": 0.186,
          "scale": 0.95
        }
      ]
    },
    "export": { "fps": 24, "keepAudio": false, "bitrateFactor": 0.55 }
  }
}
```

## Notes

- The real scripts use local paths and temp files, but those have been redacted here.
- The showcase transition video in the app was generated by the transition-showcase script above.
- For AI use, copy the flow, not the literal path values.

## How To Extend

When you add another strong sample script:

1. Add the runnable script under `examples/`.
2. Add one row to the table above.
3. Add one short recipe section if the flow deserves it.
4. Keep the input paths and tokens parameterized.
5. Keep the doc page focused on the reusable pattern, not the local machine path.

## Next Pages

- [showcase.md](showcase.md)
- [capabilities-task-workflows.md](capabilities-task-workflows.md)
- [capabilities-media-sources.md](capabilities-media-sources.md)
