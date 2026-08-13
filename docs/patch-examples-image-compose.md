# Image Compose

[中文版本](patch-examples-image-compose.zh-CN.md)

Use `collection=imageComposeSources` when one image slot needs to change.

## Add One Image Source

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

## Replace and Move a Slot

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

## Reminders

- Source ids come from `editableIndex`.
- Path must be App-readable.
- Keep the source list within mode limits.
