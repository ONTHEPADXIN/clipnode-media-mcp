# Sticker Actions

[中文版本](patch-examples-sticker-actions.zh-CN.md)

Use `actionPatch` to add new stickers.

## Add a Bold Title Sticker

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

## Add an Image Sticker

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

## Add a GIF Sticker

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

## Reminders

- Read `patchGrammar.animationNames` first when animation names are uncertain.
- Validate app-readable paths first when the path is uncertain.
- Probe GIFs before using frame timing.
