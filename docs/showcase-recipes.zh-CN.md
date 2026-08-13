# 作品展示 Recipe

[English version](showcase-recipes.md)

这一页是基于真实跑过的脚本整理出来的脱敏样例。

## 什么时候读我

- 你想看 `video_composition` 的完整样例，素材来自素材库图片和转场目录。
- 你想看 `video_edit` 的完整样例，包含 logo 叠加和文字贴纸。
- 你想看比字段页更接近真实脚本的完整闭环。

## 可运行脚本

| 脚本 | 场景 | 说明 |
|---|---|---|
| `examples/transition-showcase-recipes.mcp-client.js` | 素材库图片 + 转场目录 | 一个完整的 `video_composition` 展示流程，包含 sources、transitions、logo 贴纸和导出。 |
| `examples/logo-overlay-showcase.mcp-client.js` | 单视频 + logo / 文本贴纸 | 一个完整的 `video_edit` 叠加流程，包含 probe、贴纸、校验和导出。 |
| `examples/asset-library-video-composition.mcp-client.js` | 素材库驱动合成 | 一个相关的合成路径，展示如何从准备好的素材里选择可复用 source 和转场。 |
| `examples/video-composition-mixed-stickers.mcp-client.js` | 混合素材合成 + 贴纸 | 一个相关的合成路径，展示如何组合手机素材、转场和贴纸叠加。 |

## Recipe 1：转场展示视频

基于 `generate-transition-showcases.js`。

它会做这些事：

- 把可复用 logo 上传到素材库
- 从素材库里搜索一组图片
- 按 group 列出转场资产
- 组一个包含 sources、transitions、stickers、canvas 和 export 的 `video_composition` 请求
- validate、create、等待、下载结果

### 脱敏后的流程

```text
configure -> beginTask -> upload logo -> search asset images -> list transitions
-> probe sources -> build request -> validate -> create -> wait -> download
```

### 脱敏后的 request 形状

```json
{
  "taskType": "video_composition",
  "sources": [
    {
      "id": "clip_0",
      "path": "/app-visible/asset-library/image/<theme>/image_001.jpg",
      "durationUs": 5000000,
      "fit": { "mode": "center_crop" },
      "audio": { "mute": true, "volume": 0 }
    }
  ],
  "transitions": [
    {
      "id": "transition_0",
      "fromClipId": "clip_0",
      "toClipId": "clip_1",
      "assetPath": "transitions/<group>/<transition>.glsl",
      "durationUs": 3000000,
      "audioCrossFade": false
    }
  ],
  "specPatch": {
    "canvas": { "preset": "custom", "width": 1280, "height": 720 },
    "audio": { "mute": true, "volume": 0 },
    "stickers": {
      "items": [
        {
          "id": "clipnode_logo_top_right",
          "type": "image",
          "image": { "path": "/app-visible/asset-library/image/<theme>/logo.png" },
          "x": 0.945,
          "y": 0.096,
          "scale": 0.5
        },
        {
          "id": "clipnode_logo_text",
          "type": "text",
          "text": { "content": "ClipNode", "textSize": 24 },
          "x": 0.945,
          "y": 0.186,
          "scale": 0.95
        }
      ]
    },
    "export": { "fps": 24, "keepAudio": false, "bitrateFactor": 0.55 }
  }
}
```

## Recipe 2：Logo 叠加视频

基于 `add-clipnode-logo-overlay.js`。

它会做这些事：

- 取一个 App 可见视频 source
- probe 时长
- 把 logo 图片上传到素材库
- 组一个包含 canvas、fit、audio 和两个贴纸的 `video_edit` 请求
- validate、create、等待、下载结果

### 脱敏后的流程

```text
configure -> beginTask -> upload logo -> probe source -> build request -> validate -> create -> wait -> download
```

### 脱敏后的 request 形状

```json
{
  "taskType": "video_edit",
  "source": { "path": "/app-visible/video/<source>.mp4" },
  "sources": [
    {
      "id": "clip_0",
      "path": "/app-visible/video/<source>.mp4",
      "trim": { "startUs": 0, "endUs": 8000000 },
      "fit": { "mode": "center_crop" },
      "audio": { "mute": true, "volume": 0 }
    }
  ],
  "specPatch": {
    "timeRange": { "startUs": 0, "endUs": 8000000 },
    "canvas": { "preset": "custom", "width": 1280, "height": 720 },
    "fit": { "mode": "center_crop" },
    "audio": { "mute": true, "volume": 0 },
    "stickers": {
      "items": [
        {
          "id": "logo_image",
          "type": "image",
          "image": { "path": "/app-visible/asset-library/image/<theme>/logo.png" },
          "x": 0.945,
          "y": 0.096,
          "scale": 0.5
        },
        {
          "id": "logo_text",
          "type": "text",
          "text": { "content": "ClipNode", "textSize": 24 },
          "textStyle": {
            "bold": true,
            "strokeEnabled": true,
            "glowEnabled": true
          },
          "x": 0.945,
          "y": 0.186,
          "scale": 0.95
        }
      ]
    },
    "export": { "fps": 24, "keepAudio": false, "bitrateFactor": 0.55 }
  }
}
```

## 说明

- 真实脚本里的本地路径和临时路径已经脱敏。
- App 里的转场展示视频就是由上面的 transition showcase 脚本生成的。
- AI 使用时直接照着流程走，不要照抄具体路径值。

## 如何扩展

后面如果再加新的强样板脚本：

1. 先放进 `examples/`。
2. 再把它加到上面的表里。
3. 如果流程足够完整，再补一小段 recipe。
4. 参数和路径保持可配置，不要把本地机器信息写死。
5. 文档里只保留可复用的模式，不保留个人环境痕迹。

## 下一页

- [showcase.md](showcase.zh-CN.md)
- [capabilities-task-workflows.md](capabilities-task-workflows.zh-CN.md)
- [capabilities-media-sources.md](capabilities-media-sources.zh-CN.md)
