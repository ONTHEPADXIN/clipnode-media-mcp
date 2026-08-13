# ClipNode Media MCP Media Sources

[中文版本](capabilities-media-sources.zh-CN.md)

This branch covers where source media comes from and how the AI should handle those sources.

## Configuration

| Tool | Purpose |
|---|---|
| `clipnode_media_configure` | Set or refresh the ClipNode local service base URL and PIN. |

## Phone Media

| Tool | Purpose |
|---|---|
| `clipnode_media_list_video_dirs` | List phone video directories visible to ClipNode. |
| `clipnode_media_list_videos` | List videos in a selected phone directory. |
| `clipnode_media_list_image_dirs` | List phone image and GIF directories visible to ClipNode. |
| `clipnode_media_list_images` | List images and GIFs in a selected phone directory. |

## Asset Library

The asset library is folder-backed:

```text
asset_library/{video|image|audio}/{themeName}/
```

| Tool | Purpose |
|---|---|
| `clipnode_asset_list_themes` | List folder-backed video, image, or audio themes. |
| `clipnode_asset_list_items` | List media files inside one theme folder. |
| `clipnode_asset_search` | Search media files by plain text. |
| `clipnode_asset_select_sources` | Convert selected file paths into task-ready `sources[]` or external audio config. |

## Files

| Tool | Purpose |
|---|---|
| `clipnode_media_upload_file` | Upload a PC file. Prefer saving into the asset library for reusable media. |
| `clipnode_media_download_file` | Download an app output or local media file to the PC. |
| `clipnode_media_list_outputs` | List previous successful app outputs. |

## Execution

| Tool | Purpose |
|---|---|
| `clipnode_media_probe_sources` | Read metadata for App-visible local sources. |
| `clipnode_media_validate_app_path` | Lightweight path gate before stickers, backgrounds, audio, media sources, or image-compose sources. |
| `clipnode_media_validate_task` | Validate and normalize a non-HLS media task. |
| `clipnode_media_create_task` | Create one validated non-HLS media task. |
| `clipnode_media_export_m3u8_to_mp4` | Export one HLS/m3u8 URL to MP4. |
| `clipnode_media_get_job_status` | Poll a media job until success, failed, or canceled. |
| `clipnode_media_cancel_job` | Cancel a queued or running media job. |

## Source Rules

- Prefer App-visible local files.
- Use one of these source forms only:

| Source form | Use it for | Notes |
|---|---|---|
| Phone media path | Camera roll, downloads, and other App-visible device media | Best for direct device media |
| Asset library path | Reusable prepared media from `asset_library/...` | Best for repeatable tasks |
| Upload return `appPath` / `assetPath` | Newly uploaded files that the App can already see | Use the returned path, not the upload id |

- Do not treat temporary upload `fileId` as a normal source.
- Do not probe HLS URLs with the normal source probe tool.
- Keep source selection path-based and narrow.

## Source Selection Matrix

| Source type | Best use | Directly usable form |
|---|---|---|
| Phone media | User's camera roll or downloaded device media | Phone media path |
| Asset library | Repeatable, curated, reusable assets | `asset_library/...` path |
| Upload result | Freshly uploaded reusable files | Returned `appPath` or `assetPath` |
| Temporary upload id | None as a normal source | Not a normal source |
