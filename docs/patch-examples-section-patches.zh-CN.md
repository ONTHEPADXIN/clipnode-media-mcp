# Section Patches

[English version](patch-examples-section-patches.md)

使用 `sectionPatch` 来改顶层内容，例如 canvas、fit、export、gif、imageCompose。

## 画布自背景模糊

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

## fit height

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

## 导出参数调整

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

## 提醒

- 先读 `patchGrammar.sectionPatchFields`。
- 只能用当前模式暴露的 section。
- 不要自己编不存在的字段。
