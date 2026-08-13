# 视频合成 Recipe

[English version](patch-examples-video-composition-recipe.md)

这一页给一个最小闭环的完整流程，适合直接照着做。

## 什么时候读我

- 你想看一个完整可工作的流程，而不是零散字段页。
- 你正在做真实的 video composition 会话编辑。
- 你希望 AI 按固定顺序执行，而不是自己拼步骤。

## 一次跑通的流程

1. 读 `clipnode_edit_get_current_state`
2. 看 `patchGrammar.modeRules` 和 `editableIndex`
3. 先 probe 候选素材
4. 组 `compositionSegments`
5. 只有当前模式暴露转场时才设置 `compositionTransitions`
6. validate
7. apply
8. 再读当前状态并确认返回的 revision

## Recipe 示例

当你要用多张图或视频替换一段短时间线时，可以用这个形状。

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

## 说明

- 这一页是给你一条单独可照抄的工作流，不是字段说明页。
- 如果时间线里已经有 segment id，就从 `editableIndex` 读出来，改用 `merge` 或 `replace`，不要重复 add。
- 只有真的新对象才用 `clientTempId`。
- source 不稳时先 probe，再组 patch。

## 下一页

- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.zh-CN.md)
- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.zh-CN.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.zh-CN.md)
