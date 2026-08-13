# ClipNode Media MCP

[English](README.md)

ClipNode Media MCP 是 ClipNode Android App 本地媒体服务的 MCP 桥接项目，可以让支持 MCP 的 AI 客户端调用手机上的视频、GIF、图片和 HLS 媒体处理能力。

这个插件有两条并列的能力树：

- Headless 导出任务：面向请求驱动的成品生成、可批量复用的配方和脚本化输出。
- 会话 Patch：面向当前打开的编辑页，AI 既可以承接人的实时编辑意图，也可以沉淀后续能被 headless 复用的设置和模板。

这两条树都重要。Headless 导出任务是主要的生产链路，会话 patch 是交互式设计/编辑链路，而且还能反向喂给后续的模板和任务系统。

ClipNode 当前需要配合 Android App 使用。可从 Google Play 安装：
[ClipNode](https://play.google.com/store/apps/details?id=cn.com.onthepad.tailor)

## 先看这里

如果你想让 AI 很快看懂完整能力面，直接用下面的表格选第一跳。

重要：不要在沙箱命令里访问 ClipNode 本地服务。需要真实检查本地服务时，请使用沙箱外请求或者 MCP 工具。

最短决策表：

| 场景 | 先读 |
|---|---|
| 先看两条能力树 | [docs/capability-trees.zh-CN.md](docs/capability-trees.zh-CN.md) |
| 第一次做任务 | [docs/capabilities-task-workflows.md](docs/capabilities-task-workflows.zh-CN.md) |
| 当前会话编辑 | [docs/capabilities-live-session-patching-core.md](docs/capabilities-live-session-patching-core.zh-CN.md) |
| 找素材或 probe source | [docs/capabilities-media-sources.md](docs/capabilities-media-sources.zh-CN.md) |

如果还需要更长的路径，先看 [docs/entry-choice.md](docs/entry-choice.zh-CN.md) 或 [docs/ai-execution.md](docs/ai-execution.zh-CN.md)，再进入目标分支。

如果是会话页里的 AI patch：

1. 先读 [docs/capabilities-live-session-patching-core.md](docs/capabilities-live-session-patching-core.zh-CN.md)。
2. 再读 [docs/capabilities.md](docs/capabilities.zh-CN.md) 和 [docs/patch-examples.md](docs/patch-examples.zh-CN.md)。
3. 如果只是想先找方向，就先读 [docs/knowledge-map.md](docs/knowledge-map.md)。

如果你是在做成品输出，先读 headless 树。如果你已经在编辑页，再走会话 patch 树。

后续如果新增了新的工具家族，优先扩展知识地图并新增同级分支，不要把不相关的页面越写越满。

## 目录

- [App 作品展示](docs/showcase.zh-CN.md)
- [核心亮点](#核心亮点)
- [工作方式](#工作方式)
- [快速开始](#快速开始)
- [客户端接入](#客户端接入)
- [发布压缩包](#发布压缩包)
- [可以这样对 AI 说](#可以这样对-ai-说)
- [文档](#文档)
- [示例脚本](#示例脚本)
- [安全说明](#安全说明)

## 核心亮点

- 完全免费使用。
- 由 ClipNode Android App 在手机本地完成真实渲染和导出。
- 提供 stdio MCP server，支持 Codex、Cursor、Claude Desktop、Claude Code 以及其他 MCP 兼容客户端。
- 支持视频编辑、视频压缩、视频合成、GIF 编辑、视频转 GIF、图片编辑、图片合成和 m3u8/HLS 转 MP4。
- 支持电脑和 Android 设备之间的本地文件上传下载。
- 创建导出前支持 dry-run 校验，返回可读计划摘要、风险提示和 suggested fix。
- 内置上百种 GL 视频转场动画，覆盖淡入淡出、擦除、缩放、3D 翻页/翻书、立方体、马赛克、故障、光效、形状遮罩等风格。
- GIF 编辑支持透明度/alpha 工作流。
- 支持文字、图片、GIF 贴纸；文字贴纸可设置颜色、字号、粗斜体、描边、发光、背景、内边距、时间范围、网格和入场/循环/出场动画。
- 支持当前会话草稿的 AI patch 编辑：读取当前状态、校验 patch、应用 patch、AI undo/redo。

## 工作方式

```text
AI 客户端
-> MCP stdio server: scripts/clipnode-media-mcp-server.js
-> ClipNode Android App 本地 HTTP 服务
-> Android 本地媒体渲染/导出
-> 可选：下载结果回电脑
```

MCP server 只是桥接层，不替代 Android App，也不在电脑端渲染媒体。

## 快速开始

1. 安装并打开 ClipNode Android App。
2. 在 ClipNode 中启动本地服务，或打开 AI 任务中心。
3. 确认手机和电脑在同一个可信局域网内。
4. 复制 App 显示的本地服务 URL 和 PIN。
5. 如果你的 AI 客户端可以直接和 MCP server 对话，可以先把本地服务 URL 和 PIN 直接发给 AI，让它自己先配置；否则再在 MCP 客户端中手动配置服务：

```json
{
  "mcpServers": {
    "clipnode-media": {
      "command": "node",
      "args": [
        "/absolute/path/to/clipnode-media-mcp/scripts/clipnode-media-mcp-server.js"
      ],
      "env": {
        "CLIPNODE_BASE_URL": "http://192.168.1.23:8081",
        "CLIPNODE_PIN": "123456"
      }
    }
  }
}
```

6. 让 AI 客户端先调用：

```text
clipnode_media_get_capabilities
```

如果能返回能力列表，说明链路已经打通：

```text
AI 客户端 -> MCP server -> ClipNode App 本地服务
```

如果要让 AI 介入当前会话编辑页，先在 Android App 打开一个媒体编辑会话，再让 AI 客户端调用：

```text
clipnode_edit_get_current_state
```

AI 应使用返回的 `editableIndex` 获取已有对象 id，每次 patch 携带 `baseRevision`，新增对象后读取返回的 `idMap`。当前状态里还会返回 `lastPatch`，用于直接查看最近一次 patch 的 `runtimeVerifiedSections`、`pendingSections` 和变更摘要。
普通定位读取建议传 `compact=true`。当前 action patch 可新增文本、图片或 GIF 贴纸。图片/GIF 贴纸、画布背景、外部音频和素材源路径不确定时，先用 `clipnode_media_validate_app_path` 校验。GIF 贴纸再用 `includeFrameTimeline=true` 探测，并携带 App 可读 `.gif` 路径和 `gif.frameTimeList` 应用。

## 客户端接入

不同客户端的专属文件放在 `integrations/` 下。共用 MCP 实现仍然放在 `scripts/`、`lib/` 和 `assets/`，发布压缩包时再把这些共用文件复制进每个客户端包。

| 客户端 | 文件 | 说明 |
|---|---|---|
| Codex | [integrations/codex](integrations/codex) | Codex 插件元数据和 MCP 配置模板。 |
| 通用 stdio MCP 客户端 | 使用快速开始里的 JSON | 适用于支持 command、args、env 配置的 MCP 客户端。 |

后续可以继续新增其他客户端目录，不需要重复维护 MCP server 源码。

## 发布压缩包

构建 Codex 插件 zip：

```bash
npm run package:codex
```

命令会生成：

```text
dist/codex/clipnode-media-mcp/
dist/clipnode-media-mcp-codex.zip
```

这个 zip 是一个可独立安装/拷贝使用的插件包，包含 Codex 元数据和运行所需的共用 MCP server 文件。GitHub 作品展示页不会打进运行包。

## 可以这样对 AI 说

- “把手机 DCIM 里最近 12 张照片和 GIF 做成一个 9:16 回忆视频，随机使用 3D 或翻页转场，加标题，导出 MP4 并下载到电脑。”
- “把这几个视频和图片混剪成一个 1080p 横屏 MP4，使用 100+ 免费转场里的科技感、故障或马赛克风格。”
- “把这个手机视频压缩成更小的 720p MP4，尽量保持清晰。”
- “把视频第 3 秒到第 8 秒转成宽度约 480 的 GIF，加文字贴纸，尽量保留 GIF 透明度。”
- “把这个 GIF 倒放、裁成正方形、降低帧率，并加底部文字水印。”
- “把 9 张截图拼成 3x3 图片，透明背景，间距 12 像素。”
- “把这个 m3u8 链接转成 MP4，完成后下载到电脑。”
- “我现在就在 ClipNode 编辑页。给当前草稿底部加一个加粗发光标题，预览一下，并保持可继续编辑。”

更多示例见 [docs/ai-prompts.md](docs/ai-prompts.zh-CN.md)。

## 文档

| 文件 | 作用 |
|---|---|
| [docs/capabilities.md](docs/capabilities.zh-CN.md) | AI 最优先阅读的能力总览，包含工作流、任务类型、patch grammar、模式规则和 id 处理。 |
| [docs/ai-prompts.md](docs/ai-prompts.zh-CN.md) | 可直接复制给 AI 客户端的示例提示词。 |
| [docs/showcase.zh-CN.md](docs/showcase.zh-CN.md) | App 能力展示页，目前从转场演示开始，后续可扩展更多作品能力。 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 连接失败、PIN、局域网、权限、上传下载和导出失败排查。 |
| [docs/privacy-and-local-service.md](docs/privacy-and-local-service.md) | 本地服务、PIN、媒体访问、隐私和安全说明。 |
| [integrations/codex/README.md](integrations/codex/README.md) | Codex 插件打包和使用说明。 |

## 项目结构

```text
assets/templates.json
lib/*.js
scripts/clipnode-media-mcp-server.js
scripts/package-codex-plugin.js
examples/*.mcp-client.js
examples/lib/*.js
docs/*.md
integrations/codex/.codex-plugin/plugin.json
integrations/codex/.mcp.json
dist/*.zip
```

## 示例脚本

示例脚本是独立 MCP 客户端，适合调试和三方集成参考。普通 AI 客户端使用插件时不需要运行这些脚本。

```bash
CLIPNODE_BASE_URL=http://192.168.1.23:8081 \
CLIPNODE_PIN=123456 \
node examples/list-phone-media.mcp-client.js
```

常用示例：

- `examples/list-phone-media.mcp-client.js`
- `examples/hls-export.mcp-client.js`
- `examples/video-compress.mcp-client.js`
- `examples/video-edit-from-phone-list.mcp-client.js`
- `examples/transition-showcase-recipes.mcp-client.js`
- `examples/logo-overlay-showcase.mcp-client.js`
- `examples/video-to-gif.mcp-client.js`
- `examples/gif-stickers.mcp-client.js`
- `examples/image-edit-title.mcp-client.js`
- `examples/image-compose-grid.mcp-client.js`
- `examples/image-memory-video.mcp-client.js`
- `examples/asset-library-video-composition.mcp-client.js`
- `examples/video-composition-mixed-stickers.mcp-client.js`
- `examples/complex-validation-suite.mcp-client.js`

## 安全说明

ClipNode 本地服务用于同一可信局域网内的设备连接。请不要把服务暴露到公网，并妥善保管连接 PIN。

详情见 [docs/privacy-and-local-service.md](docs/privacy-and-local-service.md)。
