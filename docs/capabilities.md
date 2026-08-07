# ClipNode Media MCP Capabilities

This document summarizes the current public capabilities exposed by the ClipNode Media MCP bridge.

ClipNode Media MCP is a bridge to the ClipNode Android app. The MCP server receives tool calls from an AI client, sends requests to the app's local HTTP service, and lets the Android device perform real media rendering and export.

## Supported Task Types

| Task type | Purpose | Notes |
|---|---|---|
| `video_edit` | Edit one video. | Trim/crop/fit/rotate/mute, canvas, stickers, export settings, external audio where supported. |
| `video_compress` | Compress one video. | Size-first or quality-first MP4 export with resolution, fps, bitrate, and audio controls. |
| `video_composition` | Compose multiple media sources into one MP4. | Supports videos, images, GIFs, 100+ transition effects, stickers, and audio options. `maxSources=30` is the recommended single-task size, not a hard code-enforced limit. |
| `gif_edit` | Edit one GIF. | Trim, reverse, frame sampling, crop/resize, fit, rotate/flip, transparency preservation, stickers. |
| `video_to_gif` | Convert a video segment to GIF. | Supports time range, fps/frame sampling, reverse order, crop/resize, and stickers on the GIF timeline. |
| `image_edit` | Edit one static image. | Canvas/fit, crop transform, rotate/flip, text/image/GIF stickers, JPG/PNG export. |
| `image_compose` | Compose 2-16 images into one static output. | Supports horizontal, vertical, grid, hero, diamond, circle, and hexagon layouts. PNG output can preserve alpha. |
| `hls_mp4_export` | Export one m3u8/HLS URL to MP4. | Use `clipnode_media_export_m3u8_to_mp4` with one `source.videoId` and one `source.url`. Poll until the job reaches a terminal state. |

`subtitle` is planned but is not currently exposed as an executable MCP task type.

## Core Strengths

- Free-to-use local media workflows.
- Android-side rendering and export through the ClipNode app.
- 100+ GL video transition effects for video composition.
- GIF transparency/alpha workflows.
- Text, image, and GIF stickers with animation support.
- Local PC-to-phone upload and phone-to-PC download.
- Validation and plan preview before export.
- AI-readable plan summaries, risk hints, and suggested fixes.

## Default AI Workflow

Use the MCP resource `clipnode://workflow-guide` or prompt `clipnode_media_task_workflow` when your client supports MCP resources/prompts.

Recommended flow:

```text
clipnode_media_configure, if URL/PIN are not configured
clipnode_task_begin, for multi-step workflows
clipnode_media_get_capabilities
-> list transitions, sticker animations, or templates only when needed
-> list phone media / asset-library items, or upload PC files into the asset library
-> clipnode_media_probe_sources
-> build the task request
-> clipnode_media_validate_task
-> apply suggestedFix and validate again, if returned
-> ask the user if needConfirmation=true
-> clipnode_media_create_task
-> clipnode_media_get_job_status until success, failed, or canceled
-> clipnode_media_download_file, if the result should be saved on the PC
```

ClipNode uses a single local media queue. Create one export job at a time and poll it to a terminal state before starting another one.

## Token-Saving Rules

AI clients should keep media workflows path-based and summary-based:

- Do not load media file contents, thumbnails, base64 data, or frame timelines into the AI context unless the user explicitly needs visual inspection.
- Call `clipnode_media_get_capabilities` once near the start of a task, then use narrower tools for details.
- Prefer filtered catalog tools over full payload scanning: use `clipnode_media_list_transitions` with `tag`/`group`/`query`, use sticker capability tools only when stickers are needed, and list template summaries before fetching one selected template.
- For phone media and asset library browsing, list themes/directories first, use `type`, `themeName`, `query`, pagination, and small `pageSize`; avoid enumerating every file unless the task needs it.
- For asset-library composition, prefer `clipnode_asset_select_sources` with `count`, `query`, and `themeName`, then use the returned `sources[]` directly instead of listing many items for the AI to filter manually.
- Probe only the final candidate sources. Leave `includeFrameTimeline=false` unless key-frame or frame timing is required.
- For `video_composition`, prefer 8-12 sources for quick drafts and up to the recommended `maxSources=30` for normal single tasks. If the user asks for more than 30, warn about higher time, memory, export failure, and wait-time risk, then consider sampling or splitting the work.
- After `clipnode_media_validate_task`, explain the result with `planSummary.readableText` and `timelineSummary` instead of restating the full request JSON.
- Poll job status with compact summaries; fetch large event logs only when debugging a failure.

For non-HLS media tasks, source references must be App-visible local files. Use `path` from phone media lists, `path` from asset-library items, or `assetPath`/`appPath` returned by an asset-library upload. Current probe/edit paths do not resolve temporary upload `fileId`, `mediaId`, or remote URLs. HLS/m3u8 URLs use the dedicated HLS tool and should not be sent to `clipnode_media_probe_sources`.

When an AI client uploads PC media through MCP, the recommended default is to save it into the asset library with `target.kind=asset_library`, `target.type`, and `target.themeName`. Asset-library uploads are easier for the App and AI to browse, reuse, manage, and delete later. Temporary upload should be reserved for explicitly one-off transfers that do not need later discovery or cleanup.

For `video_composition`, `clipnode_media_get_capabilities` reports `minSources=2` and `maxSources=30`, and the built-in templates follow the same recommended size. This is AI guidance rather than a hard code-enforced limit. The current headless validation path summarizes large source counts as a cost/risk signal instead of returning a dedicated `source_count_too_large` error. Requests above 30 may still be accepted by parsing/validation, but they can increase probe/render time, memory pressure, export failure risk, and user wait time.

## Tool Groups

### Configuration

| Tool | Purpose |
|---|---|
| `clipnode_media_configure` | Set or refresh the app local-service URL and PIN for this MCP session. |

### Capabilities And Catalogs

| Tool | Purpose |
|---|---|
| `clipnode_media_get_capabilities` | Read App-reported task types, limits, workflow capabilities, transition catalog, sticker capabilities, HLS options, and template flags. |
| `clipnode_media_list_transitions` | Filter transition assets by tag, tags, group, query, or `autoSelectable`. |
| `clipnode_media_get_transition` | Fetch one transition by `assetPath` or `id`. |
| `clipnode_media_get_sticker_capabilities` | Read sticker and text-sticker layout, timing, effect, and animation capabilities. |
| `clipnode_media_list_sticker_animations` | Filter sticker animation names for `inName`, `loopName`, and `outName`. |
| `clipnode_media_list_templates` | List compact MCP-plugin built-in reference template summaries. |
| `clipnode_media_get_template` | Fetch one MCP-plugin reference template config by `id`. |

### Task State

| Tool | Purpose |
|---|---|
| `clipnode_task_begin` | Create an AI task container before a multi-step workflow. |
| `clipnode_task_get_status` | Read task state, progress, problem summary, output candidates, and tool runs. |
| `clipnode_task_get_current` | Read the app's current active AI task and recent task events. |
| `clipnode_task_list_events` | Read the compact event log for one AI task. |

### Phone Media

| Tool | Purpose |
|---|---|
| `clipnode_media_list_video_dirs` | List phone video directories visible to ClipNode. |
| `clipnode_media_list_videos` | List videos in a selected phone directory. |
| `clipnode_media_list_image_dirs` | List phone image and GIF directories visible to ClipNode. |
| `clipnode_media_list_images` | List images and GIFs in a selected phone directory. |

### Asset Library

The app asset library is currently a folder-backed file library. It stores prepared user materials as normal directories and files under:

```text
asset_library/{video|image|audio}/{themeName}/
```

`themeName` is the physical folder name. Asset-library responses currently expose folder/file metadata such as `path`, `count`, `size`, and `lastModified`. They do not expose semantic descriptions, tags, embeddings, `themeId`, or `assetId` yet. Search is plain substring matching over folder and file names, not semantic search or content recognition.

| Tool | Purpose |
|---|---|
| `clipnode_asset_list_themes` | List folder-backed video, image, or audio themes. Each `themeName` is a folder name. |
| `clipnode_asset_list_items` | List media files inside one theme folder. Use returned `path` in tasks. |
| `clipnode_asset_search` | Search media files by plain text over `themeName`, `fileName`, and `displayName`. |
| `clipnode_asset_select_sources` | Convert selected file paths into task-ready `sources[]` or external audio config. |

### Files

| Tool | Purpose |
|---|---|
| `clipnode_media_upload_file` | Upload a PC file. Default to an asset-library folder for AI-managed media and use returned `assetPath`/`appPath`; temporary upload `fileId` is not a probe/edit source and is harder to manage/delete later. |
| `clipnode_media_download_file` | Download an app output or local media file to the PC. |
| `clipnode_media_list_outputs` | List previous successful app outputs. |

### Execution

| Tool | Purpose |
|---|---|
| `clipnode_media_probe_sources` | Read metadata for App-visible local `path`/`appPath` sources. Does not probe HLS URLs or unresolved upload `fileId`. |
| `clipnode_media_validate_task` | Validate and normalize a non-HLS media task before export. |
| `clipnode_media_create_task` | Create one validated non-HLS media task in the app queue. |
| `clipnode_media_export_m3u8_to_mp4` | Export one HLS/m3u8 URL to MP4. Requires positive `source.videoId` and one `.m3u8` `source.url`. |
| `clipnode_media_get_job_status` | Poll a media job until success, failed, or canceled. |
| `clipnode_media_cancel_job` | Cancel a queued or running media job. |

## Transition Catalog

ClipNode includes 100+ GL transition effects. Use `clipnode_media_list_transitions` instead of asking the AI to invent transition names.

Useful filters:

- `autoSelectable=true` for safe automatic selection.
- `tag` or `tags` for styles such as `3d`, `book`, `flip`, `soft`, `fade`, `wipe`, `glitch`, `grid`, `mosaic`, or `shape`.
- `group` for broad groups such as `Basic`, `Wipe`, `Shape`, `Zoom`, `3D`, `Distort`, or `Color`.

If a user asks for "soft", "3D book flip", "tech glitch", "mosaic", or "shape mask", map the request to tags, list candidates, then use a returned `assetPath`.

## Sticker Capabilities

Sticker support includes:

- Text stickers.
- Image stickers.
- GIF stickers.
- Normalized position, scale, rotation, time range, grid layout, and move-with-time behavior.
- Text style controls: color, size, bold, italic, underline, letter spacing, line spacing, stroke, glow, background, corner radius, and padding.
- Enter, loop, and exit animations selected from the sticker animation catalog.

Use `clipnode_media_get_sticker_capabilities` and `clipnode_media_list_sticker_animations` before building sticker requests.

## Built-In Templates

Built-in reference templates live in the MCP plugin's `assets/templates.json`. They are starting points, not complete executable requests and not App-stored user templates. AI clients should merge template defaults with user intent, selected App-visible sources, probed metadata, transitions, stickers, and export settings. Validate the final request for non-HLS tasks; for HLS templates, call `clipnode_media_export_m3u8_to_mp4` with a real `source.videoId` and `.m3u8` URL.

Current templates:

| Template id | Task type | Use case |
|---|---|---|
| `video_soft_9_16` | `video_edit` | Portrait video crop with quality-first export. |
| `video_full_self_blur_canvas` | `video_edit` | Full-frame video on a blurred self-background canvas. |
| `video_compress_480p_size_first` | `video_compress` | Size-first MP4 compression. |
| `video_composition_soft_fade` | `video_composition` | Multi-clip composition with soft transitions. |
| `hls_to_mp4_quality` | `hls_mp4_export` | HLS/m3u8 to MP4 export. |
| `gif_crop_resize_reverse` | `gif_edit` | GIF crop, resize, frame sampling, and reverse. |
| `video_to_gif_clip_crop` | `video_to_gif` | Trimmed video clip to optimized GIF. |
| `image_edit_square_title` | `image_edit` | Square image edit with title sticker. |
| `image_compose_3x3_screenshot_grid` | `image_compose` | 3x3 screenshot/image grid. |
| `image_compose_product_long` | `image_compose` | Ecommerce-style product long image. |
| `video_edit_rich_text_gif_badge` | `video_edit` | Rich text sticker, animated badge, and GIF sticker. |
| `image_memory_video` | `video_composition` | Phone photos/GIFs to a memory video with transitions and titles. |

## Validation Contract

Always call `clipnode_media_validate_task` before `clipnode_media_create_task` for non-HLS media tasks. Do not use `create_task` for HLS/m3u8; use `clipnode_media_export_m3u8_to_mp4`.

Important validation fields:

| Field | Meaning |
|---|---|
| `validationId` | Credential for creating the exact validated request. |
| `planHash` | Hash of the normalized request plan. |
| `planSummary.readableText` | User-facing explanation of the planned edit. |
| `timelineSummary` | Structured clips, transitions, and stickers. |
| `riskHints[]` | Non-blocking warnings such as long export time or many stickers. |
| `suggestedFix` | Patch or alternative suggestion the AI can apply before validating again. |
| `needConfirmation` | Whether the user should confirm before create. |
| `aiDecision.action` | Recommended next action: create, patch and validate again, ask user, choose source again, or blocked. |

If validation returns `suggestedFix`, apply it and validate again unless the user explicitly wants the original heavy or risky settings.
