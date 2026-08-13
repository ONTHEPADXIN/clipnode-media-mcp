# 视频合成 segment

[English version](patch-examples-video-composition-segments.md)

当你要新增、替换、重排或裁剪 `compositionSegments` 时，先读这一页。

## 什么时候读我

- 当前模式暴露了 `compositionSegments`
- 你在处理视频或 GIF 的合成时间线
- 你需要改 segment 的 source、trim、fit、crop、rotate 或 flip

## 新增一个视频 segment

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

## 替换或合并一个 segment

已有 segment id 必须来自 `editableIndex`，可以用 `merge` 或 `replace`。

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

当时间线里已经有两个 slot，你又想变成五张图的故事时，先从 `editableIndex` 读出旧 segment id。

如果要保留原 slot，就对已有 id 用 `merge` 或 `replace`。只有真的新增 segment 时，才用 `clientTempId` 配合 `add`。

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

## 规则

- add / replace 前先 probe source
- 新 segment 用 `clientTempId`
- 已有 id 来自 `editableIndex`
- timeline 元数据要和 probe 结果一致

## 下一页

- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.zh-CN.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.zh-CN.md)
- [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.zh-CN.md)
- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.zh-CN.md)
