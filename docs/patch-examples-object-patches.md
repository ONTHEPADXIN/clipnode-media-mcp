# Sticker Object Patches

[中文版本](patch-examples-object-patches.zh-CN.md)

Use `objectPatch` for existing sticker ids from `editableIndex`.

## Move a Sticker

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "stickers",
      "id": "sticker_3",
      "op": "merge",
      "value": {
        "x": 0.5,
        "y": 0.82,
        "scale": 0.7
      }
    }
  ]
}
```

## Send It to Back

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "stickers",
      "id": "sticker_3",
      "op": "sendToBack"
    }
  ]
}
```

## Duplicate a Sticker

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "stickers",
      "id": "sticker_3",
      "op": "duplicate",
      "clientTempId": "sticker_copy_1"
    }
  ]
}
```

## Reminders

- Only use ids from `editableIndex`.
- Use `clientTempId` for duplicates or new objects.
- Read `idMap` after apply.
