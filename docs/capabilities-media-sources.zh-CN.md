# ClipNode Media MCP 素材来源

[English version](capabilities-media-sources.md)

这一分支说明素材从哪里来，以及 AI 应该如何使用这些素材。

## 配置

| 工具 | 作用 |
|---|---|
| `clipnode_media_configure` | 设置或刷新 ClipNode 本地服务 URL 和 PIN。 |

## 手机素材

| 工具 | 作用 |
|---|---|
| `clipnode_media_list_video_dirs` | 列出 ClipNode 可见的视频目录。 |
| `clipnode_media_list_videos` | 列出某个视频目录中的视频。 |
| `clipnode_media_list_image_dirs` | 列出 ClipNode 可见的图片/GIF 目录。 |
| `clipnode_media_list_images` | 列出某个图片目录中的图片和 GIF。 |

## 素材库

素材库是目录式结构：

```text
asset_library/{video|image|audio}/{themeName}/
```

| 工具 | 作用 |
|---|---|
| `clipnode_asset_list_themes` | 列出视频、图片、音频主题目录。 |
| `clipnode_asset_list_items` | 列出某个主题目录里的文件。 |
| `clipnode_asset_search` | 通过文本搜索素材。 |
| `clipnode_asset_select_sources` | 把选中的路径转成 task 可用的 `sources[]` 或外部音频配置。 |

## 文件

| 工具 | 作用 |
|---|---|
| `clipnode_media_upload_file` | 上传电脑文件。优先存入素材库，方便复用。 |
| `clipnode_media_download_file` | 把 App 输出或本地文件下载到电脑。 |
| `clipnode_media_list_outputs` | 列出历史成功输出。 |

## 执行

| 工具 | 作用 |
|---|---|
| `clipnode_media_probe_sources` | 读取 App 可见本地 source 的元数据。 |
| `clipnode_media_validate_app_path` | 在贴纸、背景、音频、media source、图片合成 source 前做路径校验。 |
| `clipnode_media_validate_task` | 校验并归一化非 HLS 任务。 |
| `clipnode_media_create_task` | 创建一个已校验的非 HLS 任务。 |
| `clipnode_media_export_m3u8_to_mp4` | 把 HLS/m3u8 导出为 MP4。 |
| `clipnode_media_get_job_status` | 轮询任务直到成功、失败或取消。 |
| `clipnode_media_cancel_job` | 取消排队中或运行中的媒体任务。 |

## 来源规则

- 优先使用 App 可见的本地文件。
- source 只用这几种形式：

| source 形式 | 用途 | 说明 |
|---|---|---|
| 手机素材路径 | 相机胶卷、下载目录和其他 App 可见设备素材 | 最适合直接用手机素材 |
| 素材库路径 | `asset_library/...` 里的可复用准备素材 | 最适合重复任务 |
| 上传返回的 `appPath` / `assetPath` | App 已经可见的新增上传文件 | 用返回路径，不用上传 id |

- 不要把临时上传的 `fileId` 当成普通 source。
- HLS URL 不要走普通 source probe。
- 保持 source 选择是 path-based 且尽量窄。

## Source 选择矩阵

| source 类型 | 最适合用来做什么 | 直接可用形式 |
|---|---|---|
| 手机素材 | 用户相册或下载到设备上的素材 | 手机素材路径 |
| 素材库 | 可复用、已整理好的素材 | `asset_library/...` 路径 |
| 上传结果 | 新上传后可复用的文件 | 返回的 `appPath` 或 `assetPath` |
| 临时上传 id | 不作为正常 source 使用 | 不是普通 source |
