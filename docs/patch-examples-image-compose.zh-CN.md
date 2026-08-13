# Image Compose

[English version](patch-examples-image-compose.md)

当只需要改一个图片合成 slot 时，使用 `collection=imageComposeSources`。

## 新增一个图片 source

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

## 替换并移动 slot

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

## 提醒

- source id 来自 `editableIndex`。
- 路径必须是 App 可读的。
- source 列表要符合当前模式限制。
