# 视频合成画布与导出

[English version](patch-examples-video-composition-canvas-export.md)

当你要改视频合成的 canvas、fit、audio 或 export 时，先读这一页。

## 什么时候读我

- 你在改顶层 composition section
- 你需要 canvas preset、background、fit 或 export 调参
- 你不是在改 timeline segment 或 transition

## 画布模糊背景

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

## 导出调参

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

## 规则

- 先看 `patchGrammar.sectionPatchFields`
- 只用当前模式暴露的 section
- 不要把 timeline object 编辑混进来

## 下一页

- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md)
- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
