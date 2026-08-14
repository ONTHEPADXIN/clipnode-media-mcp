# ClipNode Media MCP Task Workflows

[中文版本](capabilities-task-workflows.zh-CN.md)

This branch covers export task workflows that start from a request and end in validation, creation, polling, and download.

Start with `clipnode_media_get_capabilities` for a short summary, then use the list/get catalog tools only when you need exact names.

## Supported Task Types

| Task type | Purpose | Notes |
|---|---|---|
| `video_edit` | Edit one video. | Trim/crop/fit/rotate/mute, canvas, stickers, export settings, external audio where supported. |
| `video_compress` | Compress one video. | Size-first or quality-first MP4 export with resolution, fps, bitrate, and audio controls. |
| `video_composition` | Compose multiple media sources into one MP4. | Supports videos, images, GIFs, transition effects, stickers, and audio options. `maxSources=30` is the recommended single-task size. |
| `gif_edit` | Edit one GIF. | Trim, reverse, frame sampling, crop/resize, fit, rotate/flip, transparency preservation, stickers. |
| `video_to_gif` | Convert a video segment to GIF. | Supports time range, fps/frame sampling, reverse order, crop/resize, and stickers on the GIF timeline. |
| `image_edit` | Edit one static image. | Canvas/fit, crop transform, rotate/flip, text/image/GIF stickers, JPG/PNG export. |
| `image_compose` | Compose 2-16 images into one static output. | Supports several layout modes and PNG alpha output. |
| `hls_mp4_export` | Export one m3u8/HLS URL to MP4. | Use the dedicated HLS tool and poll until terminal state. |

`subtitle` is planned but is not currently exposed as an executable task type.

## Core Strengths

- Local Android rendering and export.
- Task validation before export.
- AI-readable summaries and risk hints.
- Media workflows that stay path-based instead of loading raw bytes.

## Default Workflow

```text
clipnode_media_configure, if needed
clipnode_task_begin, for multi-step workflows
clipnode_media_get_capabilities
-> list transitions/templates/stickers only when needed
-> discover phone media or asset-library sources
-> validate app-readable paths
-> probe candidate sources
-> build one request
-> clipnode_media_validate_task
-> clipnode_media_create_task
-> poll status until terminal
-> download the output if needed
```

## Task Notes

- `video_edit`: one video, crop/fit/rotate/mute/stickers/export settings.
- `video_compress`: one video, size-first or quality-first profile.
- `video_composition`: multi-source timeline with transitions and audio.
- `gif_edit`: one GIF with trim/reverse/crop/fit/stickers.
- `video_to_gif`: one video clip to GIF with timeline stickers.
- `image_edit`: one static image with stickers and export.
- `image_compose`: 2-16 images into one composed static image.
- `hls_mp4_export`: HLS URL to MP4 through the dedicated HLS flow.

## Minimal Payload Cheatsheet

| Task type | Smallest useful starting shape |
|---|---|
| `video_edit` | One source video path, one `timeRange`, one canvas/fit block, optional stickers, export settings. |
| `video_compress` | One source video path, output profile, resolution/fps/bitrate controls, optional audio controls. |
| `video_composition` | `sources[]`, `transitions[]`, canvas, audio, export, optional stickers. |
| `gif_edit` | One GIF path, time range or frame range, fit/rotate/flip, optional stickers. |
| `video_to_gif` | One video path, time range, GIF export controls, optional stickers. |
| `image_edit` | One image path, canvas/fit, optional stickers, export settings. |
| `image_compose` | 2-16 source images, layout, spacing/padding, background, export. |
| `hls_mp4_export` | One HLS URL plus output name. |

## If You Only Need One Thing

- `video_edit` -> probe one video and build one edit request.
- `video_composition` -> select sources, select transitions, then validate.
- `image_compose` -> pick 2-16 images, set layout, then validate.
- `hls_mp4_export` -> use the HLS tool directly.

## Token-Saving Rules

- Call `clipnode_media_get_capabilities` once near the start.
- Prefer filtered catalog queries over full scans.
- Probe only final candidates.
- Keep requests path-based.
- Validate before create for non-HLS tasks.
- Create one media job at a time.
