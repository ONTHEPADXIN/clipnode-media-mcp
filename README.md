# ClipNode Media MCP

[中文说明](README.zh-CN.md)

MCP bridge for the ClipNode Android app local media service.

ClipNode currently requires the Android app. Install it from Google Play:
[ClipNode](https://play.google.com/store/apps/details?id=cn.com.onthepad.tailor).

## What It Does

ClipNode Media MCP lets an AI client turn a plain-language media request into a real local export on
the ClipNode Android app. The AI can find phone media, choose templates and effects, validate the
plan with the app, start the export, poll progress, and download the finished file back to the
computer.

The headline feature is video composition with 100+ built-in GL transition animations that are free
to use. An AI client can pick transitions by intent, such as soft fade, wipe, zoom, 3D page/book
flip, cube, mosaic, glitch, light/color effects, or shape masks, then compose phone photos, GIFs,
videos, stickers, titles, and audio into an MP4.

Common workflows:

- Turn a phone album or prepared asset-library theme into a memory video with transitions, title/end
  text, stickers, optional background audio, and MP4 export.
- Mix videos, photos, and GIFs into one video, using the free 100+ transition library for automatic
  or style-driven transitions.
- Edit or compress one video with canvas fit/crop, rotation, mute/audio settings, stickers, and
  export options.
- Add image, text, and GIF stickers with multiple enter, loop, and exit animations. Text stickers
  support color, size, bold/italic/underline, stroke, glow, background, corner radius, and padding.
- Trim, reverse, sample, crop, resize, and decorate GIFs, or convert a video segment to GIF.
- Edit static images or compose 2-16 images into one JPG/PNG output, with multiple image-composition
  layouts/templates that will continue to expand.
- Export one HLS/m3u8 URL to MP4.
- Upload computer files to ClipNode, download app outputs back to the computer, and track each job
  through task status and event logs.
- Dry-run complex media tasks before export, with readable plan summaries, risk hints, and
  suggested fixes that the AI client can explain to the user.
- Save tokens by keeping video, image, GIF, and audio data out of the AI context. MCP passes file
  paths, task parameters, source metadata, validation summaries, and progress states instead, which
  commonly saves 95% to 99%+ of tokens compared with sending media content to the AI.
- Keep growing with new media capabilities, transition animations, sticker effects,
  image-composition layouts/templates, and AI workflows. Ideas and suggestions are welcome at
  `onthepadxin@gmail.com`.

## You Can Say

Users do not need to know MCP tool names, task types, or request schemas. Describe the source media,
the desired result, the style, and where the output should go; the AI client should discover assets,
choose templates/transitions/sticker animations, validate the task, then create the export.

- "Turn the latest 12 photos and GIFs from my phone DCIM folder into a 9:16 memory video. Use each
  image for 3 seconds, add random 3D or page-flip transitions, title it 'Summer Notes', export MP4,
  and download it to my computer."
- "Use the images in my asset-library theme 'my child' to make a gentle album video. Keep the
  transitions subtle, add background music, add the opening title 'Growing Moments', and end with
  'To be continued'."
- "Mix these videos and photos into one 1080p landscape MP4. Use the free 100+ transition library
  and prefer tech, glitch, or mosaic styles. Before exporting, tell me the estimated duration and
  any risks."
- "Add a logo image sticker to the top-right corner of this phone video, then add a large title.
  Make the title white with black stroke, slight glow, a translucent rounded background, fade-in
  entrance, and fade-out exit."
- "Compress this video so it stays reasonably clear but gets smaller. Export 720p MP4, and tell me
  the suggested settings first if the quality loss may be obvious."
- "Upload `/Users/me/Videos/input/trip-original.mp4` from my computer to ClipNode, compress it so
  the file is smaller but still clear, then download the result to
  `/Users/me/Videos/output/trip-compressed.mp4`."
- "Combine the 5 videos in `~/Desktop/materials/` in filename order, use soft transitions, export
  MP4, and save the final file to `~/Downloads/clipnode_final.mp4`."
- "I have a logo image at `/Users/me/Pictures/logo.png`. Upload it and use it as a top-right image
  sticker on this phone video, then export MP4 and download it to my chosen output folder."
- "Convert seconds 3 to 8 of this video into a GIF around 480px wide. Add a text sticker saying
  'Here it comes' with stroke and a pop-in entrance animation, then download the result."
- "Reverse this phone GIF, crop it to a square, lower the frame rate to reduce size, and add a
  bottom text watermark."
- "Compose 6 product images into one long image using an image-composition layout/template. Use a white
  background, add spacing between images, export PNG, and pick a layout suitable for ecommerce."
- "Make a 3x3 image from 9 screenshots, transparent background, 12px spacing, export PNG."
- "Upload the product images from `~/Pictures/product/`, compose them into one long image with an
  image-composition layout/template, and export PNG to `~/Desktop/product-compose.png`."
- "Convert this m3u8 link to MP4 and download it to my computer. If the link or network fails, tell
  me the reason."

## Configure

Set the MCP server environment in `.mcp.json`:

```json
{
  "CLIPNODE_BASE_URL": "http://127.0.0.1:18080",
  "CLIPNODE_PIN": "123456"
}
```

Use the local service URL shown by the ClipNode App as `CLIPNODE_BASE_URL`.

## Project Structure

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

- `scripts/clipnode-media-mcp-server.js` is the MCP entrypoint. It handles JSON-RPC routing and
  delegates implementation details to `lib/`.
- `lib/mcp-definitions.js` owns tool/resource/prompt declarations and input schemas.
- `lib/clipnode-http-client.js` owns ClipNode local service auth, HTTP requests, upload, download,
  metadata headers, and curl fallback.
- `lib/catalog.js` owns tag/query filtering shared by transitions, stickers, and templates.
- `lib/templates.js` owns `assets/templates.json` loading, validation, list, and get behavior.
- `examples/` contains standalone MCP client scripts for development and third-party reference.
  They are not required when an AI client uses the plugin through MCP.
- `examples/lib/` contains small reusable helpers for those example scripts only:
  MCP process startup, JSON-RPC calls, task polling, and phone media list parsing.

## Tools

### Configuration

Connect the MCP bridge to the ClipNode App local service.

| Tool | Purpose |
|---|---|
| `clipnode_media_configure` | Set or refresh the App local-service URL and PIN for this MCP session. |

### Capabilities And Catalogs

Read supported editing capabilities and reusable catalogs before building a task.

| Tool | Purpose |
|---|---|
| `clipnode_media_get_capabilities` | Get supported task types, limits, transitions, stickers, HLS options, and templates. |
| `clipnode_media_list_transitions` | Filter transition assets by tag, group, status, query, or auto-select safety. |
| `clipnode_media_get_transition` | Fetch one transition by `assetPath` or `id`. |
| `clipnode_media_get_sticker_capabilities` | Get sticker and text-sticker layout, timing, and animation capabilities. |
| `clipnode_media_list_sticker_animations` | Filter sticker animation names for enter, loop, and exit slots. |
| `clipnode_media_list_templates` | List compact built-in template summaries. |
| `clipnode_media_get_template` | Fetch one full template config by `id`. |

### Task State

Group multiple tool calls into one AI-facing task and read task progress.

| Tool | Purpose |
|---|---|
| `clipnode_task_begin` | Create an AI task container before a multi-step workflow. |
| `clipnode_task_get_status` | Read one task's current state, progress, outputs, and tool runs. |
| `clipnode_task_get_current` | Read the App's current active task and recent events. |
| `clipnode_task_list_events` | Read the compact event log for one task. |

### Asset Library

Use prepared user materials by type and theme. ClipNode stores the library as plain directories and
files under `asset_library/{video|image|audio}/{themeName}/`; there is no asset index JSON to
maintain.

| Tool | Purpose |
|---|---|
| `clipnode_asset_list_themes` | List video, image, or audio themes in the asset library. |
| `clipnode_asset_list_items` | List assets inside one theme, with optional query filters. |
| `clipnode_asset_search` | Search prepared assets by type, theme, or text query. |
| `clipnode_asset_select_sources` | Convert selected assets into composition `sources[]` or external audio config. |

### Phone Media

Browse phone media that has not necessarily been organized into the asset library.

| Tool | Purpose |
|---|---|
| `clipnode_media_list_video_dirs` | List phone video directories visible to ClipNode. |
| `clipnode_media_list_videos` | List videos in a selected phone directory. |
| `clipnode_media_list_image_dirs` | List phone image and GIF directories visible to ClipNode. |
| `clipnode_media_list_images` | List images and GIFs in a selected phone directory. |

### Files

Move files between the PC and the App local service.

| Tool | Purpose |
|---|---|
| `clipnode_media_upload_file` | Upload a PC file for temporary use or save it into the asset library. |
| `clipnode_media_download_file` | Download an App output or local media file to the PC. |
| `clipnode_media_list_outputs` | List previous successful App outputs. |

### Media Task Execution

Probe, validate, create, monitor, and cancel actual media-processing jobs.

| Tool | Purpose |
|---|---|
| `clipnode_media_probe_sources` | Read source metadata such as duration, size, type, audio, and availability. |
| `clipnode_media_validate_task` | Dry-run and normalize a media task before export. |
| `clipnode_media_create_task` | Create a validated edit/composition/export task. |
| `clipnode_media_export_m3u8_to_mp4` | Export one HLS m3u8 URL to MP4. |
| `clipnode_media_get_job_status` | Poll a media job until success, failed, or canceled. |
| `clipnode_media_cancel_job` | Cancel a queued or running media job. |

## Built-In Catalogs

- Built-in reference templates live in `assets/templates.json`.
- Template changes should be made in JSON first; the MCP bridge reads this file when
  `clipnode_media_list_templates` or `clipnode_media_get_template` is called.
- `clipnode_media_list_templates` supports `taskType`, `tag`, `tags`, `tagsMode`, `query`, and
  `limit`. It returns compact template summaries so AI clients can choose without loading every
  full config.
- `clipnode_media_get_template` returns the full template config for one `id`.
- Templates are reference configs, not complete executable requests. AI clients should merge
  `template.config` with user intent, selected sources, probed metadata, transition assets, sticker
  assets, and export settings before validation.

Current curated templates:

- `video_soft_9_16`: portrait video crop with quality-first export.
- `video_full_self_blur_canvas`: full-frame video on a blurred self-background canvas.
- `video_compress_480p_size_first`: size-first MP4 compression.
- `video_composition_soft_fade`: multi-clip video composition with soft transitions.
- `hls_to_mp4_quality`: HLS/m3u8 to MP4 export.
- `gif_crop_resize_reverse`: GIF crop, resize, frame sampling, and reverse.
- `video_to_gif_clip_crop`: trimmed video clip to optimized GIF.
- `image_edit_square_title`: square image edit with title sticker.
- `image_compose_3x3_screenshot_grid`: 3x3 screenshot/image grid.
- `image_compose_product_long`: ecommerce-style product long image.
- `video_edit_rich_text_gif_badge`: rich text sticker, animated badge, and GIF sticker.
- `image_memory_video`: phone photos/GIFs to a memory video with transitions and titles.

## Examples

Example scripts are reference MCP clients. They start the local MCP server directly, call tools in
the same order an AI client would, and print tool results. Use them for debugging the bridge or for
learning the workflow.

The examples share helper modules under `examples/lib/` so connection handling and polling stay
consistent. The media task payloads remain inside each example file because those payloads are the
most useful part for AI clients and third-party integrators to read.

```bash
CLIPNODE_BASE_URL=http://192.168.x.x:8081 \
CLIPNODE_PIN=123456 \
node examples/hls-export.mcp-client.js
```

Curated examples:

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

For external client setup, see `docs/ClipNode_MCP对外接入说明.md` in the main repository.

## AI Workflow Contract

ClipNode MCP is a bridge to the Android app local media service. The AI client should organize the
workflow, but ClipNode should validate and execute the media task.

Use the MCP resource `clipnode://workflow-guide` or prompt `clipnode_media_task_workflow` when the
client supports MCP resources/prompts.

### Default Flow

```text
clipnode_media_configure, if the URL or PIN is not already configured
clipnode_media_get_capabilities
-> clipnode_media_list_transitions, if the task needs transition selection
-> clipnode_media_get_sticker_capabilities/list_sticker_animations, if the task needs stickers
-> clipnode_media_upload_file, if the source file is on the PC
-> clipnode_media_list_video_dirs/list_videos or list_image_dirs/list_images, if the source file is on the phone
-> clipnode_asset_list_themes/asset_search/asset_select_sources, if the user refers to prepared asset-library materials
-> clipnode_media_probe_sources
-> clipnode_media_validate_task
-> clipnode_media_create_task
-> clipnode_media_get_job_status
-> clipnode_media_download_file, if the result is needed on the PC
```

ClipNode media jobs are handled as a single local queue. Create one task at a time from the AI side,
then poll the returned `jobId` until it is `success`, `failed`, or `canceled`.

`clipnode_media_validate_task` returns both machine action fields and user-facing plan fields. AI
clients should follow `aiDecision.action` for the next tool call, and use `planSummary.readableText`
plus `timelineSummary.clips/transitions/stickers` when explaining the planned edit to the user.

The current dry-run summary is intentionally AI-readable:

- `planSummary.readableText`: default user-facing explanation.
- `planSummary.outputName/outputFormat/exportPreset/fps/imageQuality/bitrateFactor`: export details.
- `planSummary.keepAudio/audioText`: audio behavior such as keeping or muting original audio.
- `planSummary.templateId/templateName/templateText`: template context when a template is used.
- `planSummary.riskHints[]`: non-blocking risk hints, for example long export time or many stickers.
- `planSummary.estimatedCostLevel/estimatedCostText`: rough processing complexity.
- `planSummary.needsPreview`: preview suggestion, not a hard block.
- `planSummary.userConfirmText`: ready-to-show confirmation text for AI or App UI.
- `timelineSummary.stickers[]`: sticker time range, animation names, grid config, and time binding.

Put the desired output filename in `export.outputName`. Use `export.keepAudio=false` when the output
should mute or drop original audio. To add background music for `video_edit` or `video_composition`,
set `specPatch.audio.external.enabled=true` and pass an app/phone-visible audio `path`; `audio.mute=true`
replaces original audio, while `audio.mute=false` mixes original audio with the background track. Supported
`audio.external.endMode` values are `trim_to_video`, `loop_to_video`, and `play_once`; provide
`durationUs` or `sourceEndUs` when using `loop_to_video` so the app knows the loop range.

Warnings can also include executable `suggestedFix` patches. For example, high GIF frame counts may
suggest lower `gif.fps`, larger `gif.frameSpace`, or a shorter `timeRange`; oversized outputs may
suggest 1080p `export`, `config.canvas`, and `gif.outputWidth/outputHeight` values. Apply the patch
and validate again when the user did not explicitly request the original heavy settings.

Reference examples such as `examples/image-memory-video.mcp-client.js` include this warning-fix loop:
validate, apply `suggestedFix.patch`, validate again, then create only after the final validated
request is stable.

Template-driven examples should follow this shape:

```text
clipnode_media_list_templates
-> clipnode_media_get_template
-> select phone/PC sources
-> select transitions/sticker animations from capabilities
-> merge template defaults with user overrides
-> clipnode_media_validate_task
-> clipnode_media_create_task
```

`examples/image-memory-video.mcp-client.js` demonstrates this pattern with the
`image_memory_video` template.

### Complex Validation Suite

Use `examples/complex-validation-suite.mcp-client.js` when you want to validate several realistic
AI workflows in one serial run.

```bash
CLIPNODE_BASE_URL=http://192.168.x.x:8081 \
CLIPNODE_PIN=123456 \
node examples/complex-validation-suite.mcp-client.js --profile quick
```

Profiles:

- `quick`: template memory video, complex image edit, and video-to-GIF with stickers.
- `full`: quick scenarios plus GIF sticker timing/grid validation and mixed video/image/GIF
  composition.

The suite runs one scenario at a time because ClipNode media jobs use a single local queue. It prints
`SCENARIO_RESULT` for each flow and a final `SUITE_RESULT` summary.

### Flow Rules

- Call `clipnode_media_get_capabilities` before choosing task type, sticker animations, templates,
  HLS options, or limits.
- Use `clipnode_media_list_transitions` with `tag`, `tags`, `group`, `status`, `autoSelectable`, or
  `query` before choosing transition assets.
- Use `clipnode_media_get_transition` when the AI needs one exact transition's details by `assetPath`
  or `id`.
- Use `clipnode_media_get_sticker_capabilities` and `clipnode_media_list_sticker_animations` before
  choosing text/image/GIF sticker fields or animation names.
- Upload PC files before probing them. Use the returned `fileId` or `appPath` in later calls.
- For phone files, list dirs/files first and use the returned `path` in probe/edit/download calls.
- For prepared asset-library materials, list themes first or search by type/theme/query. Use
  `clipnode_asset_select_sources` when building `video_composition.sources`; it returns normalized
  clip entries with `path`, `fit`, optional image duration, video trim, and audio mute defaults.
- Probe sources before deciding crop, trim, canvas, transition duration, and audio behavior.
- Validate complex media tasks before creating them.
- If validation returns `suggestedFix`, apply it and validate again.
- If validation returns `needConfirmation=true`, ask the user before creating the task.
- Poll job status until a terminal state before creating another task.
- Download only after the job succeeds or when listing previous outputs.

### Task Routing

- `video_edit`: one video, crop/fit/rotate/mute/stickers/export settings.
- `video_compress`: one video, export size or quality changes.
- `video_composition`: multiple videos/images, optional transitions and audio cross-fade.
- `video_to_gif`: one video to GIF, including trim range, fps/frame sampling, optional reverse
  order, crop/resize, and text/image/GIF stickers rendered on the output GIF timeline.
- `gif_edit`: one GIF edit, including trim range, reverse order, frame sampling, crop/resize, canvas fit,
  rotate/flip, transparent-frame preservation, and text/image/GIF stickers.
- `image_edit`: one static image edit, including canvas/fit, rotate/flip, JPG/PNG export,
  and text/image/GIF stickers. Static image stickers are rendered at `timeUs=0`; keep
  `animation.inName/outName` empty when the sticker should be immediately visible.
- `image_compose`: 2-16 images composed into one static image with the App GL renderer.
  Use top-level `sources[]`, set `imageCompose.layoutMode`, spacing/padding, background,
  and `export.imageQuality`. Quality `100` exports PNG and can preserve alpha.
- `hls_mp4_export`: one m3u8 URL to one MP4 job.
- `subtitle`: planned, not exposed as an executable taskType in the current phase.

### Canvas Background

`video_edit`, `video_composition`, `image_edit`, and `gif_edit` accept a canvas background through
`specPatch.canvas.background` or `config.canvas.background`:

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

Supported `background.mode` values now are `color`, `self_blur`, and `image`. For `image`, set
`sourcePath` to a phone-visible image path and use `sourceType: "image"`. `video` is reserved and
validation returns a recoverable error until independent background-video rendering lands.

## Capability Notes

- Session-mode functions are exposed as task types: `video_edit`, `video_compress`, `video_composition`,
  `video_to_gif`, `gif_edit`, `image_edit`, and `image_compose`. `subtitle` is planned but not exposed
  as executable in the current phase.
- HLS is exposed as `hls_mp4_export` and `clipnode_media_export_m3u8_to_mp4`. Submit one m3u8 URL
  per job. Use `export.mode="fast"` for MediaMuxer sample-copy output, or `export.mode="stable"`
  for the existing headless composition pipeline.
- Transition assets are available through `transitionCatalog` and `clipnode_media_list_transitions`.
  Each item has `id`, `assetPath`, `status`, `autoSelectable`, `durationRangeUs`, and multiple
  `tags`.
- For user requests like book flip, soft, gradient, wipe, glitch, mosaic, or shape mask, map the
  request to transition tags first, then choose an item from the catalog.
- Sticker and text-sticker capabilities are returned under `assetCapabilities.stickerCapabilities`,
  including layout, grid support, time binding, text effects, and sticker animation catalog. Use
  `clipnode_media_list_sticker_animations` to filter animation names by tag/group/slot/query.
- GIF edit is frame-based and can be CPU-heavy. For larger canvas sizes, all-frame output, rotation,
  flip, or many stickers, use longer polling windows and surface progress to the user.
- Built-in templates are only references. AI clients should list templates with narrow filters,
  fetch the selected template by `id`, merge template `config` with the user request, validate the
  final task, then create the task.
- Asset-library items are prepared user materials. Use `clipnode_asset_list_themes`,
  `clipnode_asset_search`, and `clipnode_asset_select_sources` when a prompt refers to themes,
  reusable materials, or batch composition input. Returned image sources can be used directly in
  `image_compose.sources`.
- Template authors can later declare asset-library slots such as `type`, `themeName`, and
  `count`. AI clients should resolve those slots with `clipnode_asset_select_sources`, then merge
  the returned `sources`, `audioExternal`, or asset paths into the template request before probing
  and validation.

## Example Clients

- `examples/list-phone-media.mcp-client.js`: list phone video/image/GIF directories and files, useful
  as the first read-only connectivity and permission check.
- `examples/hls-export.mcp-client.js`: submit one m3u8 URL, poll the HLS export job, and download MP4.
- `examples/video-compress.mcp-client.js`: pick a phone video, create a size-first compression task,
  poll status, and download the compressed MP4.
- `examples/video-edit-from-phone-list.mcp-client.js`: select a phone video, add styled text plus
  optional GIF sticker data, validate, export, and download.
- `examples/video-to-gif.mcp-client.js`: pick a phone video, trim a short range, apply fps/frame
  sampling, optional reverse order, crop/resize, optional text/image/GIF stickers with
  `--stickers true`, poll the job, and download the GIF.
- `examples/gif-stickers.mcp-client.js`: pick a phone GIF, an image, and another GIF, then validate
  image sticker, GIF sticker, and text sticker rendering inside a GIF export. Pass `--animated true`
  to validate sticker enter/loop/exit animations in the GIF frame timeline. Use `--timeStartUs`,
  `--timeEndUs`, `--timingMode half`, `--grid true`, and `--cancelAfterMs` for trim, sticker timing,
  grid, and cancellation smoke tests.
- `examples/image-edit-title.mcp-client.js`: edit one phone image with canvas/fit, rotate/flip,
  text/image/GIF stickers, PNG/JPG export, polling, and download.
- `examples/image-compose-grid.mcp-client.js`: compose multiple phone images into one static output
  with `image_compose`, grid layout, spacing/padding, transparent background, and download.
- `examples/image-memory-video.mcp-client.js`: pick images and GIFs from a phone directory such as
  DCIM, select random transitions by style tag with fallback to recommended/capabilities catalog,
  add title and ending text stickers, run validate with suggested-fix patches, export MP4, poll
  status, and download to `~/Downloads`. This is the current reference flow for "make a memory
  video from this album" prompts.
- `examples/asset-library-video-composition.mcp-client.js`: query a saved asset-library theme,
  convert selected assets into `video_composition.sources`, pick
  recommended transitions, validate, export, poll, and download. Defaults target `video/灾难`;
  pass `--theme`, `--count`, or `--validateOnly true` to adjust.
- `examples/video-composition-mixed-stickers.mcp-client.js`: compose phone video plus images/GIFs,
  add text stickers on the final timeline, validate, export MP4, poll, and download.
- `examples/complex-validation-suite.mcp-client.js`: serially run multiple real MCP example flows
  and summarize pass/fail results. Use `--profile quick` during development and `--profile full`
  before release checks.
