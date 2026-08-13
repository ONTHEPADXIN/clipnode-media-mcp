# ClipNode Media MCP 任务工作流

[English version](capabilities-task-workflows.md)

这一分支覆盖 headless 媒体任务，也就是从请求出发，到校验、创建、轮询、下载结束的整条链路。

## 支持的任务类型

| 任务类型 | 作用 | 说明 |
|---|---|---|
| `video_edit` | 编辑单个视频。 | 裁剪、适配、旋转、静音、画布、贴纸、导出参数、外部音频等。 |
| `video_compress` | 压缩单个视频。 | 偏体积或偏质量的 MP4 导出，支持分辨率、fps、码率和音频控制。 |
| `video_composition` | 多素材合成一个 MP4。 | 支持视频、图片、GIF、转场、贴纸和音频。`maxSources=30` 是推荐规模。 |
| `gif_edit` | 编辑单个 GIF。 | 裁剪、倒序、抽帧、缩放、适配、旋转/翻转、透明保留、贴纸。 |
| `video_to_gif` | 把视频片段转成 GIF。 | 支持时间段、fps/抽帧、倒序、裁剪/缩放，以及 GIF 时间轴贴纸。 |
| `image_edit` | 编辑单张静态图片。 | 画布/适配、裁剪、旋转/翻转、文本/图片/GIF 贴纸、JPG/PNG 导出。 |
| `image_compose` | 2-16 张图片合成一张静态图。 | 支持多种布局和 PNG 透明输出。 |
| `hls_mp4_export` | 把 m3u8/HLS 链接导出为 MP4。 | 走专用 HLS 工具，轮询直到终态。 |

`subtitle` 目前是规划项，不是可执行任务类型。

## 核心能力

- 在 Android 端真实渲染和导出。
- 导出前先校验。
- 返回 AI 可读的摘要和风险提示。
- 以 path 为主，不把原始媒体数据塞进上下文。

## 默认流程

```text
需要时先 configure
multi-step 场景先 begin task
先 get capabilities
-> 只在需要时查转场/模板/贴纸目录
-> 发现手机素材或素材库素材
-> 校验 App 可读路径
-> probe 候选 source
-> 组装请求
-> validate task
-> create task
-> 轮询状态直到终态
-> 如需则下载结果
```

## 任务说明

- `video_edit`：单视频，裁剪/适配/旋转/静音/贴纸/导出参数。
- `video_compress`：单视频，偏体积或偏质量的配置。
- `video_composition`：多素材时间轴，带转场和音频。
- `gif_edit`：单 GIF，支持裁剪/倒序/适配/贴纸。
- `video_to_gif`：单视频片段转 GIF，支持时间轴贴纸。
- `image_edit`：单张静态图，支持贴纸和导出。
- `image_compose`：2-16 张图合成一张静态图。
- `hls_mp4_export`：HLS 链接通过专用流程导出。

## 最小 payload 速查

| 任务类型 | 最小可用起手式 |
|---|---|
| `video_edit` | 一个视频 source path、一个 `timeRange`、一个 canvas/fit 块、可选贴纸、导出参数。 |
| `video_compress` | 一个视频 source path、输出 profile、分辨率/fps/码率控制、可选音频控制。 |
| `video_composition` | `sources[]`、`transitions[]`、canvas、audio、export、可选贴纸。 |
| `gif_edit` | 一个 GIF path、时间段或帧段、fit/rotate/flip、可选贴纸。 |
| `video_to_gif` | 一个视频 path、时间段、GIF 导出控制、可选贴纸。 |
| `image_edit` | 一张图片 path、canvas/fit、可选贴纸、导出参数。 |
| `image_compose` | 2-16 张源图片、布局、间距/内边距、背景、导出。 |
| `hls_mp4_export` | 一个 HLS URL 加输出名。 |

## 只需要一个起手式时

- `video_edit` -> 先 probe 一个视频，再组一个编辑请求
- `video_composition` -> 先选 sources，再选 transitions，然后 validate
- `image_compose` -> 先挑 2-16 张图，再定 layout，然后 validate
- `hls_mp4_export` -> 直接走 HLS 工具

## 省 token 规则

- 任务开始先读一次能力摘要。
- 目录查询用过滤，不要整包扫。
- 只 probe 最终候选 source。
- 请求尽量保持 path-based。
- 非 HLS 任务先 validate 再 create。
- 一次只创建一个媒体任务。
