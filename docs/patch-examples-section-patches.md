# Section Patches

[中文版本](patch-examples-section-patches.zh-CN.md)

Use `sectionPatch` for top-level changes such as canvas, fit, export, gif, or imageCompose.

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

## Reminders

- Read `patchGrammar.sectionPatchFields` first.
- Use only sections exposed by the active mode.
- Do not invent fields that are not listed.
