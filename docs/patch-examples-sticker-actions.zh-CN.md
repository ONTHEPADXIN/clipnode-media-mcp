# Sticker Actions

[English version](patch-examples-sticker-actions.md)

使用 `actionPatch` 新增贴纸。

## 新增粗体标题贴纸

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_text_sticker",
      "clientTempId": "title_1",
      "value": {
        "x": 0.5,
        "y": 0.1,
        "startUs": 0,
        "endUs": 5000000,
        "text": {
          "content": "Summer Notes",
          "textSize": 42,
          "color": "#FFFFFFFF"
        },
        "textStyle": {
          "bold": true,
          "strokeEnabled": true,
          "strokeWidth": 2,
          "strokeColor": "#FF000000",
          "backgroundColor": "#88000000",
          "backgroundCornerRadius": 12
        },
        "animation": {
          "inName": "FadeHandler",
          "loopName": "",
          "outName": "FadeHandler"
        }
      }
    }
  ]
}
```

## 新增图片贴纸

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_image_sticker",
      "clientTempId": "logo_1",
      "value": {
        "x": 0.88,
        "y": 0.12,
        "scale": 0.35,
        "image": {
          "appPath": "/storage/emulated/0/Pictures/logo.png"
        }
      }
    }
  ]
}
```

## 新增 GIF 贴纸

```json
{
  "sessionId": "current",
  "baseRevision": 12,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_gif_sticker",
      "clientTempId": "gif_1",
      "value": {
        "x": 0.5,
        "y": 0.5,
        "scale": 0.45,
        "gif": {
          "appPath": "/storage/emulated/0/Pictures/fun.gif",
          "frameTimeList": [0, 120, 240, 360]
        }
      }
    }
  ]
}
```

## 提醒

- 动画名不确定时先看 `patchGrammar.animationNames`。
- 路径不确定时先做 App 可读路径校验。
- GIF 要先 probe 再用帧时间。
