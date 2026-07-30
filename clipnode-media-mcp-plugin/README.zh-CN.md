# ClipNode Media MCP

[English](README.md)

ClipNode Android App 本地媒体服务的 MCP 桥接插件。

ClipNode 当前需要配合 Android App 使用。可从 Google Play 安装：
[ClipNode](https://play.google.com/store/apps/details?id=cn.com.onthepad.tailor)。

## 它能做什么

ClipNode Media MCP 可以把一句自然语言媒体需求，变成手机端 ClipNode App 上真实执行的本地导出任务。AI 负责找素材、选模板和效果、组织参数、先让 App dry-run 校验；ClipNode 负责渲染、导出、进度记录和文件传输。

最值得突出的能力是视频合成。ClipNode 内置上百种（100+）GL 转场动画，可免费使用，覆盖淡入淡出、擦除、缩放、3D 翻页/翻书、立方体、马赛克、故障、光效、形状遮罩等风格。AI 可以按用户描述自动筛选转场，比如“自然一点”“3D 翻书”“科技感故障”“随机酷炫转场”，然后把手机照片、GIF、视频、贴纸、标题和音乐合成为 MP4。

常见工作流：

- 相册成片：从手机相册或素材库选择图片/GIF，自动加标题、结尾文字、贴纸、背景音乐和转场，导出回忆视频。
- 视频混剪：将视频、照片、GIF 拼成一个视频，并从上百种免费转场动画里自动选择合适风格。
- 视频处理：单视频裁剪、画布适配、旋转、静音/音频设置、贴纸、压缩和导出。
- 贴纸动效：支持图片贴纸、文字贴纸和 GIF 贴纸；文字贴纸可设置颜色、字号、粗斜体、描边、发光、背景、圆角和内边距，并支持多种入场、循环和出场动画。
- GIF 处理：GIF 截取、倒放、抽帧、裁剪、缩放、加贴纸，或把视频片段转成 GIF。
- 图片处理：编辑静态图片，或将 2 到 16 张图片合成为一张 JPG/PNG；图片合成支持多种合成布局/模板，并且持续更新中。
- HLS 转存：将一个 HLS/m3u8 链接导出为 MP4。
- 文件闭环：上传电脑文件到 ClipNode，也可以把 App 输出下载回电脑，并通过任务状态和事件日志追踪整个过程。
- 导出前校验：复杂任务先 dry-run，返回计划摘要、风险提示和 suggestedFix，让 AI 创建任务前先把“准备做什么、输出什么、有什么风险”讲清楚。
- 节省 token：视频、图片、GIF 和音频文件不需要进入 AI 上下文；MCP 只传文件路径、任务参数、素材元数据、校验摘要和进度状态，通常比把媒体内容交给 AI 节省 95% 到 99%+ 的 token。
- 持续更新：媒体处理能力、转场动画、贴纸效果、图片合成布局/模板和 AI 工作流会持续更新；如果有想法或建议，欢迎发邮件到 `onthepadxin@gmail.com`。

## 你可以这么说

用户不需要知道 MCP 工具名、任务类型或参数结构，只要用自然语言描述“用哪些素材、想做成什么、喜欢什么风格、输出到哪里”。AI 会根据当前能力去找素材、选模板/转场/贴纸动画、先校验任务，再创建导出。

- “把手机 DCIM 里最近 12 张照片和 GIF 做成一个 9:16 回忆视频，每张停留 3 秒，随机用 3D 或翻页转场，加标题‘夏天记录’，最后导出 MP4 并下载到电脑。”
- “用素材库里‘我的孩子’这个主题的图片做一段温柔一点的相册视频，转场不要太夸张，保留背景音乐，片头写‘成长瞬间’，片尾写‘未完待续’。”
- “把这几个视频和照片混剪成一个 1080p 横屏 MP4，视频之间用上百种免费转场里比较酷的效果，优先选科技感、故障、马赛克风格，导出前先告诉我预计时长和风险。”
- “给手机里的这个视频加一个右上角 Logo 图片贴纸，再加一行大标题文字。标题要白字、黑色描边、轻微发光、半透明圆角背景，入场淡入，出场淡出。”
- “把这个视频压缩一下，尽量保持清晰，但文件小一点，输出 720p MP4。如果会明显损失画质，先告诉我建议参数。”
- “把我电脑 `/Users/me/Videos/input/旅行原片.mp4` 这个视频上传到 ClipNode 压缩一下，目标是文件小一点但尽量清晰，处理完成后下载到 `/Users/me/Videos/output/旅行压缩版.mp4`。”
- “把电脑 `~/Desktop/materials/` 文件夹里的 5 个视频按文件名顺序合成一个 MP4，使用柔和转场，导出后保存到 `~/Downloads/clipnode_final.mp4`。”
- “我电脑上有一张 Logo 图 `/Users/me/Pictures/logo.png`，请上传后作为右上角图片贴纸，加到手机里的这个视频上，导出 MP4 后下载到我指定的输出目录。”
- “把视频第 3 秒到第 8 秒转成 GIF，宽度控制在 480 左右，文字贴纸写‘来了’，文字要有描边和弹出入场动画，导出后下载到电脑。”
- “把手机里的这个 GIF 倒放，再裁成正方形，降低帧率让文件小一点，加一个底部文字水印。”
- “把 6 张产品图合成一张长图，使用图片合成布局/模板，白色背景、图片之间留一点间距，导出 PNG。如果有多种布局，帮我选一个适合电商展示的。”
- “把 9 张截图拼成一张 3x3 图片，背景透明，间距 12 像素，导出 PNG。”
- “把电脑 `~/Pictures/product/` 里的产品图上传后合成一张长图，使用图片合成布局/模板，导出 PNG 到 `~/Desktop/product-compose.png`。”
- “把这个 m3u8 链接转成 MP4，任务完成后下载到电脑；如果网络或链接有问题，告诉我失败原因。”

## 配置

在 `.mcp.json` 中设置 MCP 服务环境变量：

```json
{
  "CLIPNODE_BASE_URL": "http://127.0.0.1:18080",
  "CLIPNODE_PIN": "123456"
}
```

将 ClipNode App 显示的本地服务地址填入 `CLIPNODE_BASE_URL`。

## 项目结构

```text
.mcp.json
.codex-plugin/plugin.json
assets/templates.json
lib/catalog.js
lib/clipnode-http-client.js
lib/mcp-definitions.js
lib/templates.js
scripts/clipnode-media-mcp-server.js
scripts/smoke-test-clipnode-task-flow.js
examples/*.mcp-client.js
examples/lib/*.js
```

- `scripts/clipnode-media-mcp-server.js` 是 MCP 入口。它负责 JSON-RPC 路由，并将具体实现委托给 `lib/`。
- `lib/mcp-definitions.js` 管理工具、资源、提示词声明以及输入 schema。
- `lib/clipnode-http-client.js` 管理 ClipNode 本地服务鉴权、HTTP 请求、上传、下载、元数据头以及 curl 兜底。
- `lib/catalog.js` 管理转场、贴纸、模板共用的标签和查询过滤。
- `lib/templates.js` 管理 `assets/templates.json` 的加载、校验、列表和获取逻辑。
- `examples/` 包含独立 MCP 客户端脚本，可用于开发和第三方参考。AI 客户端通过 MCP 使用插件时不需要这些脚本。
- `examples/lib/` 只包含这些示例脚本使用的小型复用辅助：MCP 进程启动、JSON-RPC 调用、任务轮询、手机媒体列表解析。

## 工具

### 配置

将 MCP 桥接服务连接到 ClipNode App 本地服务。

| 工具 | 用途 |
|---|---|
| `clipnode_media_configure` | 为当前 MCP 会话设置或刷新 App 本地服务 URL 和 PIN。 |

### 能力和目录

构建任务前读取支持的编辑能力和可复用目录。

| 工具 | 用途 |
|---|---|
| `clipnode_media_get_capabilities` | 获取支持的任务类型、限制、转场、贴纸、HLS 选项和模板。 |
| `clipnode_media_list_transitions` | 按标签、分组、状态、查询或自动选择安全性过滤转场素材。 |
| `clipnode_media_get_transition` | 按 `assetPath` 或 `id` 获取一个转场。 |
| `clipnode_media_get_sticker_capabilities` | 获取贴纸和文字贴纸的布局、时间、动画能力。 |
| `clipnode_media_list_sticker_animations` | 为入场、循环、出场槽位过滤贴纸动画名称。 |
| `clipnode_media_list_templates` | 列出内置模板的精简摘要。 |
| `clipnode_media_get_template` | 按 `id` 获取一个完整模板配置。 |

### 任务状态

将多次工具调用组织为一个面向 AI 的任务，并读取任务进度。

| 工具 | 用途 |
|---|---|
| `clipnode_task_begin` | 在多步骤工作流开始前创建 AI 任务容器。 |
| `clipnode_task_get_status` | 读取一个任务的当前状态、进度、输出和工具运行记录。 |
| `clipnode_task_get_current` | 读取 App 当前活跃任务和最近事件。 |
| `clipnode_task_list_events` | 读取一个任务的精简事件日志。 |

### 素材库

按类型和主题使用已准备好的用户素材。ClipNode 将素材库以普通目录和文件的形式存放在 `asset_library/{video|image|audio}/{themeName}/` 下，不需要维护素材索引 JSON。

| 工具 | 用途 |
|---|---|
| `clipnode_asset_list_themes` | 列出素材库中的视频、图片或音频主题。 |
| `clipnode_asset_list_items` | 列出某个主题内的素材，可附加查询过滤。 |
| `clipnode_asset_search` | 按类型、主题或文本查询搜索已准备的素材。 |
| `clipnode_asset_select_sources` | 将选中的素材转换为合成用的 `sources[]` 或外部音频配置。 |

### 手机媒体

浏览尚未整理进素材库的手机媒体。

| 工具 | 用途 |
|---|---|
| `clipnode_media_list_video_dirs` | 列出 ClipNode 可见的手机视频目录。 |
| `clipnode_media_list_videos` | 列出选定手机目录中的视频。 |
| `clipnode_media_list_image_dirs` | 列出 ClipNode 可见的手机图片和 GIF 目录。 |
| `clipnode_media_list_images` | 列出选定手机目录中的图片和 GIF。 |

### 文件

在电脑和 App 本地服务之间移动文件。

| 工具 | 用途 |
|---|---|
| `clipnode_media_upload_file` | 上传电脑文件，用于临时处理或保存到素材库。 |
| `clipnode_media_download_file` | 将 App 输出或本地媒体文件下载到电脑。 |
| `clipnode_media_list_outputs` | 列出之前成功生成的 App 输出。 |

### 媒体任务执行

探测、校验、创建、监控和取消实际媒体处理任务。

| 工具 | 用途 |
|---|---|
| `clipnode_media_probe_sources` | 读取素材元数据，例如时长、尺寸、类型、音频和可用性。 |
| `clipnode_media_validate_task` | 在导出前对媒体任务做 dry-run 和归一化。 |
| `clipnode_media_create_task` | 创建已校验的编辑、合成或导出任务。 |
| `clipnode_media_export_m3u8_to_mp4` | 将一个 HLS m3u8 URL 导出为 MP4。 |
| `clipnode_media_get_job_status` | 轮询媒体任务，直到成功、失败或取消。 |
| `clipnode_media_cancel_job` | 取消排队中或运行中的媒体任务。 |

## 内置目录

- 内置参考模板位于 `assets/templates.json`。
- 模板变更应先改 JSON；调用 `clipnode_media_list_templates` 或 `clipnode_media_get_template` 时，MCP 桥接服务会读取此文件。
- `clipnode_media_list_templates` 支持 `taskType`、`tag`、`tags`、`tagsMode`、`query` 和 `limit`。它返回精简模板摘要，方便 AI 客户端无需加载所有完整配置就能做选择。
- `clipnode_media_get_template` 返回指定 `id` 的完整模板配置。
- 模板是参考配置，不是可直接执行的完整请求。AI 客户端应将 `template.config` 与用户意图、已选择素材、探测到的元数据、转场素材、贴纸素材和导出设置合并后再校验。

当前精选模板：

- `video_soft_9_16`：9:16 竖屏视频裁剪，质量优先导出。
- `video_full_self_blur_canvas`：完整保留前景视频，用同视频模糊背景填满画布。
- `video_compress_480p_size_first`：文件体积优先的 MP4 压缩。
- `video_composition_soft_fade`：多素材柔和转场视频合成。
- `hls_to_mp4_quality`：HLS/m3u8 转 MP4。
- `gif_crop_resize_reverse`：GIF 裁剪、缩放、抽帧和倒放。
- `video_to_gif_clip_crop`：视频片段转优化 GIF。
- `image_edit_square_title`：方图裁剪并添加标题贴纸。
- `image_compose_3x3_screenshot_grid`：3x3 截图/图片宫格合成。
- `image_compose_product_long`：电商展示风格产品长图。
- `video_edit_rich_text_gif_badge`：富文本贴纸、动态角标和 GIF 贴纸。
- `image_memory_video`：手机图片/GIF 生成带转场和标题的回忆视频。

## 示例

示例脚本是参考 MCP 客户端。它们会直接启动本地 MCP 服务，按 AI 客户端会采用的顺序调用工具，并打印工具结果。可用于调试桥接服务或学习工作流。

示例共享 `examples/lib/` 下的辅助模块，以保持连接处理和轮询逻辑一致。媒体任务 payload 保留在各个示例文件内部，因为这些 payload 对 AI 客户端和第三方集成方最有参考价值。

```bash
CLIPNODE_BASE_URL=http://192.168.x.x:8081 \
CLIPNODE_PIN=123456 \
node examples/hls-export.mcp-client.js
```

精选示例：

- `examples/hls-export.mcp-client.js`
- `examples/list-phone-media.mcp-client.js`
- `examples/video-edit-from-phone-list.mcp-client.js`
- `examples/asset-library-video-composition.mcp-client.js`
- `examples/video-composition-mixed-stickers.mcp-client.js`
- `examples/image-memory-video.mcp-client.js`
- `examples/video-compress.mcp-client.js`
- `examples/gif-stickers.mcp-client.js`
- `examples/video-to-gif.mcp-client.js`
- `examples/image-edit-title.mcp-client.js`
- `examples/image-compose-grid.mcp-client.js`
- `examples/complex-validation-suite.mcp-client.js`

外部客户端接入说明见主仓库中的 `docs/ClipNode_MCP对外接入说明.md`。

## AI 工作流契约

ClipNode MCP 是通往 Android App 本地媒体服务的桥接层。AI 客户端负责组织工作流，ClipNode 负责校验并执行媒体任务。

当客户端支持 MCP resources/prompts 时，使用 MCP resource `clipnode://workflow-guide` 或 prompt `clipnode_media_task_workflow`。

### 默认流程

```text
clipnode_media_configure, 如果 URL 或 PIN 尚未配置
clipnode_media_get_capabilities
-> clipnode_media_list_transitions, 如果任务需要选择转场
-> clipnode_media_get_sticker_capabilities/list_sticker_animations, 如果任务需要贴纸
-> clipnode_media_upload_file, 如果源文件在电脑上
-> clipnode_media_list_video_dirs/list_videos 或 list_image_dirs/list_images, 如果源文件在手机上
-> clipnode_asset_list_themes/asset_search/asset_select_sources, 如果用户提到已准备的素材库素材
-> clipnode_media_probe_sources
-> clipnode_media_validate_task
-> clipnode_media_create_task
-> clipnode_media_get_job_status
-> clipnode_media_download_file, 如果需要将结果保存到电脑
```

ClipNode 媒体任务按单一本地队列处理。AI 侧一次只创建一个任务，然后轮询返回的 `jobId`，直到状态变为 `success`、`failed` 或 `canceled`。

`clipnode_media_validate_task` 同时返回机器动作字段和面向用户的计划字段。AI 客户端应按 `aiDecision.action` 决定下一次工具调用，并在向用户解释计划时使用 `planSummary.readableText` 以及 `timelineSummary.clips/transitions/stickers`。

当前 dry-run 摘要刻意设计为 AI 可读：

- `planSummary.readableText`：默认面向用户的说明。
- `planSummary.outputName/outputFormat/exportPreset/fps/imageQuality/bitrateFactor`：导出细节。
- `planSummary.keepAudio/audioText`：音频行为，例如保留或静音原音频。
- `planSummary.templateId/templateName/templateText`：使用模板时的模板上下文。
- `planSummary.riskHints[]`：非阻塞风险提示，例如导出时间较长或贴纸较多。
- `planSummary.estimatedCostLevel/estimatedCostText`：粗略处理复杂度。
- `planSummary.needsPreview`：预览建议，不是硬性阻塞。
- `planSummary.userConfirmText`：可直接展示给 AI 或 App UI 的确认文本。
- `timelineSummary.stickers[]`：贴纸时间范围、动画名称、网格配置和时间绑定。

将期望输出文件名放在 `export.outputName`。当输出应静音或移除原音频时，使用 `export.keepAudio=false`。如果要给 `video_edit` 或 `video_composition` 添加背景音乐，设置 `specPatch.audio.external.enabled=true`，并传入 App/手机可见的音频 `path`；`audio.mute=true` 会替换原音频，`audio.mute=false` 会将原音频与背景音乐混合。支持的 `audio.external.endMode` 值包括 `trim_to_video`、`loop_to_video` 和 `play_once`；使用 `loop_to_video` 时请提供 `durationUs` 或 `sourceEndUs`，让 App 知道循环范围。

警告也可能包含可执行的 `suggestedFix` patch。例如 GIF 帧数过高时可能建议降低 `gif.fps`、增大 `gif.frameSpace` 或缩短 `timeRange`；输出过大时可能建议使用 1080p `export`、`config.canvas` 以及 `gif.outputWidth/outputHeight`。如果用户没有明确要求保留原始重负载设置，应应用 patch 后再次校验。

`examples/image-memory-video.mcp-client.js` 等参考示例包含这个警告修复循环：先校验，应用 `suggestedFix.patch`，再次校验，最终请求稳定后再创建任务。

模板驱动示例应遵循以下形态：

```text
clipnode_media_list_templates
-> clipnode_media_get_template
-> select phone/PC sources
-> select transitions/sticker animations from capabilities
-> merge template defaults with user overrides
-> clipnode_media_validate_task
-> clipnode_media_create_task
```

`examples/image-memory-video.mcp-client.js` 使用 `image_memory_video` 模板演示了该模式。

### 复杂校验套件

当需要在一次串行运行中校验多个真实 AI 工作流时，使用 `examples/complex-validation-suite.mcp-client.js`。

```bash
CLIPNODE_BASE_URL=http://192.168.x.x:8081 \
CLIPNODE_PIN=123456 \
node examples/complex-validation-suite.mcp-client.js --profile quick
```

Profile：

- `quick`：模板回忆视频、复杂图片编辑、带贴纸的视频转 GIF。
- `full`：quick 场景加上 GIF 贴纸时间/网格校验，以及视频/图片/GIF 混合合成。

该套件一次只运行一个场景，因为 ClipNode 媒体任务使用单一本地队列。它会为每个流程打印 `SCENARIO_RESULT`，并在最后打印 `SUITE_RESULT` 汇总。

### 流程规则

- 在选择任务类型、贴纸动画、模板、HLS 选项或限制前，调用 `clipnode_media_get_capabilities`。
- 选择转场素材前，使用带有 `tag`、`tags`、`group`、`status`、`autoSelectable` 或 `query` 的 `clipnode_media_list_transitions`。
- 当 AI 需要按 `assetPath` 或 `id` 获取某个精确转场的细节时，使用 `clipnode_media_get_transition`。
- 选择文字/图片/GIF 贴纸字段或动画名称前，使用 `clipnode_media_get_sticker_capabilities` 和 `clipnode_media_list_sticker_animations`。
- 探测电脑文件前先上传。后续调用中使用返回的 `fileId` 或 `appPath`。
- 对手机文件，先列出目录/文件，再在探测、编辑、下载调用中使用返回的 `path`。
- 对已准备的素材库素材，先列主题或按类型/主题/查询搜索。构建 `video_composition.sources` 或 `image_compose.sources` 时使用 `clipnode_asset_select_sources`；它会返回归一化 source 条目，包含 `path`、`fit`、可选图片时长、视频裁剪和音频静音默认值。
- 在决定裁剪、片段截取、画布、转场时长和音频行为前探测素材。
- 创建复杂媒体任务前先校验。
- 如果校验返回 `suggestedFix`，应用后再次校验。
- 如果校验返回 `needConfirmation=true`，创建任务前先询问用户。
- 创建另一个任务前，轮询当前任务直到终态。
- 仅在任务成功后下载，或在列出历史输出时下载。

### 任务路由

- `video_edit`：单个视频，裁剪/适配/旋转/静音/贴纸/导出设置。
- `video_compress`：单个视频，导出尺寸或质量调整。
- `video_composition`：多个视频/图片，可选转场和音频交叉淡化。
- `video_to_gif`：单个视频转 GIF，包括裁剪时间段、fps/抽帧、可选倒放、裁剪/缩放，以及渲染到输出 GIF 时间线上的文字/图片/GIF 贴纸。
- `gif_edit`：单个 GIF 编辑，包括裁剪时间段、倒放、抽帧、裁剪/缩放、画布适配、旋转/翻转、透明帧保留，以及文字/图片/GIF 贴纸。
- `image_edit`：单张静态图片编辑，包括画布/适配、旋转/翻转、JPG/PNG 导出，以及文字/图片/GIF 贴纸。静态图片贴纸在 `timeUs=0` 渲染；贴纸需要立即可见时，保持 `animation.inName/outName` 为空。
- `image_compose`：2 到 16 张图片合成为一张静态图片，预览和导出走 App 的 GL 渲染。使用顶层 `sources[]`，设置 `imageCompose.layoutMode`、间距/外边距、背景和 `export.imageQuality`；质量为 `100` 时导出 PNG，可保留透明度。
- `hls_mp4_export`：一个 m3u8 URL 对应一个 MP4 任务。
- `subtitle`：已规划，但当前阶段未作为可执行 `taskType` 暴露。

### 画布背景

`video_edit`、`video_composition`、`image_edit` 和 `gif_edit` 可通过 `specPatch.canvas.background` 或 `config.canvas.background` 接受画布背景：

```json
{
  "canvas": {
    "preset": "custom",
    "width": 1080,
    "height": 1920,
    "background": {
      "mode": "self_blur",
      "fitMode": "center_crop",
      "blurEnabled": true,
      "blurRadius": 24,
      "opacity": 1.0,
      "color": "#000000"
    }
  },
  "fit": {
    "mode": "center_inside"
  }
}
```

当前支持的 `background.mode` 值包括 `color`、`self_blur` 和 `image`。对于 `image`，将 `sourcePath` 设为手机可见的图片路径，并使用 `sourceType: "image"`。`video` 是预留值，在独立背景视频渲染落地前，校验会返回可恢复错误。

## 能力说明

- 会话模式能力以任务类型暴露：`video_edit`、`video_compress`、`video_composition`、`video_to_gif`、`gif_edit`、`image_edit` 和 `image_compose`。`subtitle` 已规划，但当前阶段未作为可执行任务暴露。
- HLS 以 `hls_mp4_export` 和 `clipnode_media_export_m3u8_to_mp4` 暴露。每个任务提交一个 m3u8 URL。使用 `export.mode="fast"` 可走 MediaMuxer sample-copy 输出，使用 `export.mode="stable"` 可走现有无头合成流水线。
- 转场素材通过 `transitionCatalog` 和 `clipnode_media_list_transitions` 提供。每项包含 `id`、`assetPath`、`status`、`autoSelectable`、`durationRangeUs` 和多个 `tags`。
- 对书页翻转、柔和、渐变、擦除、故障、马赛克或形状遮罩这类用户请求，先将请求映射到转场标签，再从目录中选择素材。
- 贴纸和文字贴纸能力位于 `assetCapabilities.stickerCapabilities` 下，包括布局、网格支持、时间绑定、文字效果和贴纸动画目录。使用 `clipnode_media_list_sticker_animations` 可按标签/分组/槽位/查询过滤动画名称。
- GIF 编辑按帧处理，可能比较吃 CPU。对于较大画布尺寸、全帧输出、旋转、翻转或大量贴纸，应使用更长的轮询窗口，并向用户展示进度。
- 内置模板只是参考。AI 客户端应使用较窄过滤条件列出模板，按 `id` 获取选中的模板，将模板 `config` 与用户请求合并，校验最终任务，然后创建任务。
- 素材库条目是已准备好的用户素材。当提示词提到主题、可复用素材或批量合成输入时，使用 `clipnode_asset_list_themes`、`clipnode_asset_search` 和 `clipnode_asset_select_sources`；返回的图片 sources 可以直接用于 `image_compose.sources`。
- 模板作者后续可以声明素材库槽位，例如 `type`、`themeName` 和 `count`。AI 客户端应通过 `clipnode_asset_select_sources` 解析这些槽位，再将返回的 `sources`、`audioExternal` 或素材路径合并进模板请求，然后探测和校验。

## 示例客户端

- `examples/list-phone-media.mcp-client.js`：列出手机视频、图片和 GIF 目录/文件，适合作为第一步只读连通性和权限检查。
- `examples/hls-export.mcp-client.js`：提交一个 m3u8 链接，轮询 HLS 导出任务，并下载 MP4。
- `examples/video-compress.mcp-client.js`：选择一个手机视频，创建 size-first 压缩任务，轮询状态并下载压缩后的 MP4。
- `examples/video-edit-from-phone-list.mcp-client.js`：从手机素材列表选择视频，添加样式化文字和可选 GIF 贴纸，校验、导出并下载。
- `examples/video-to-gif.mcp-client.js`：选择一个手机视频，截取短时间段，应用 fps/抽帧、可选倒放、裁剪/缩放、可选文字/图片/GIF 贴纸（使用 `--stickers true`），轮询任务并下载 GIF。
- `examples/gif-stickers.mcp-client.js`：选择一个手机 GIF、一张图片和另一个 GIF，然后校验 GIF 导出中的图片贴纸、GIF 贴纸和文字贴纸渲染。传入 `--animated true` 可校验 GIF 帧时间线中的贴纸入场/循环/出场动画。使用 `--timeStartUs`、`--timeEndUs`、`--timingMode half`、`--grid true` 和 `--cancelAfterMs` 可做裁剪、贴纸时间、网格和取消 smoke test。
- `examples/image-edit-title.mcp-client.js`：编辑一张手机图片，覆盖画布/适配、旋转/翻转、文字/图片/GIF 贴纸、PNG/JPG 导出、轮询和下载。
- `examples/image-compose-grid.mcp-client.js`：使用 `image_compose` 将多张手机图片合成为一张静态图，覆盖宫格布局、间距/外边距、透明背景和下载。
- `examples/image-memory-video.mcp-client.js`：从 DCIM 等手机目录选择图片和 GIF，按风格标签随机选择转场并回退到推荐/能力目录，添加标题和结尾文字贴纸，执行带 suggested-fix patch 的校验，导出 MP4，轮询状态，并下载到 `~/Downloads`。这是当前“把这个相册做成回忆视频”类提示的参考流程。
- `examples/asset-library-video-composition.mcp-client.js`：查询已保存的素材库主题，将选中的素材转换为 `video_composition.sources`，选择推荐转场，校验、导出、轮询并下载。默认目标是 `video/灾难`；可传入 `--theme`、`--count` 或 `--validateOnly true` 调整。
- `examples/video-composition-mixed-stickers.mcp-client.js`：合成手机视频、图片和 GIF，在最终时间线上添加文字贴纸，校验、导出 MP4、轮询并下载。
- `examples/complex-validation-suite.mcp-client.js`：串行运行多个真实 MCP 示例流程，并汇总通过/失败结果。开发期间使用 `--profile quick`，发布前检查使用 `--profile full`。
