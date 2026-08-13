# Sticker Object Patches

[English version](patch-examples-object-patches.md)

使用 `objectPatch` 修改 `editableIndex` 里的已有贴纸 id。

## 移动贴纸

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

## 发送到底层

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

## 复制贴纸

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

## 提醒

- 只用 `editableIndex` 里的 id。
- 复制或新建对象要用 `clientTempId`。
- apply 后读取 `idMap`。
