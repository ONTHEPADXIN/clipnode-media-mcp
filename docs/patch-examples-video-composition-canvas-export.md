# Video Composition Canvas And Export

[中文版本](patch-examples-video-composition-canvas-export.zh-CN.md)

Read this page when the request is about canvas, fit, audio, or export for video composition.

## When To Read Me

- You are changing top-level composition sections.
- You need canvas preset, background, fit, or export tuning.
- You are not editing timeline segments or transitions.

## Canvas Blur Background

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

## Fit Height

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
    }
  ]
}
```

## Export Tuning

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
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

## Rules

- Read `patchGrammar.sectionPatchFields` first.
- Use only sections exposed by the active mode.
- Do not mix timeline object edits into this page.

## Next Pages

- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md)
- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
