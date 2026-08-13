# 视频合成转场

[English version](patch-examples-video-composition-transitions.md)

当你要修改 `compositionTransitions` 时，先读这一页。

## 什么时候读我

- 当前模式暴露了 `compositionTransitions`
- 你要调整转场资产、时长或音频 cross-fade
- 你已经从 `editableIndex` 拿到了转场 id

## 关键规则

转场是绑在相邻 segment 边界上的，不是独立创作对象。

## 更新一个转场

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

## 规则

- 转场已有 id 来自 `editableIndex`
- 不要猜转场 id
- 只有当前模式暴露该 collection 时才使用这一页

## 下一页

- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md)
- [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.md)
