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
- Interactive AI editing for the currently open ClipNode media-session draft through structured patches.

## Default AI Workflow

Use the MCP resource `clipnode://workflow-guide` or prompt `clipnode_media_task_workflow` when your client supports MCP resources/prompts.

Recommended flow:

```text
clipnode_media_configure, if URL/PIN are not configured
clipnode_task_begin, for multi-step workflows
clipnode_media_get_capabilities
-> list transitions, sticker animations, or templates only when needed
-> list phone media / asset-library items, or upload PC files into the asset library
-> clipnode_media_validate_app_path, when a candidate path will be used as a sticker/background/audio/source
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

When the user is already on the ClipNode media-session edit page and wants AI to intervene in the current draft, use the interactive edit flow instead:

```text
clipnode_edit_get_current_state
-> read sessionId, revision, editableIndex, patchGrammar, selectedContext, and current state
-> read patchGrammar.modeRules to know which sections/actions are valid for the current edit mode
-> clipnode_media_validate_app_path, when adding image/GIF stickers or section media paths
-> build a small patch using only ids from editableIndex
-> clipnode_edit_validate_patch, for non-trivial or uncertain edits
-> clipnode_edit_apply_patch
-> read revision, idMap, changedObjects, changedSections, and summary from the response
-> clipnode_edit_create_export, when the user wants the current draft exported
-> App surfaces the live export/progress panel and starts the export
-> poll clipnode_edit_get_current_state and read exportStatus until completedOnce/exportedPath
-> clipnode_media_download_file, if the result should be saved on the PC
```

`clipnode_edit_create_export` already validates readiness before starting. Use `clipnode_edit_validate_export` only when the user asks whether the draft can be exported, or when the AI wants to show a read-only export plan without starting.

If `clipnode_edit_apply_patch` returns `revision_conflict`, call `clipnode_edit_get_current_state` again and rebuild the patch against the latest revision.

## AI Patch Decision Order

When the user asks AI to edit the current ClipNode draft, follow this order:

1. Read `clipnode_edit_get_current_state`.
2. Read `patchGrammar.modeRules`, `patchGrammar.sectionCapabilities`, and `editableIndex`.
3. Decide whether the request is a section edit, object edit, or action patch.
4. Use only sections/actions/collections exposed by the current mode rules.
5. Use only ids from `editableIndex` for existing objects.
6. Use `clientTempId` for new objects and read `idMap` after apply.
7. Validate first when ids, paths, or field coverage are uncertain.
8. Apply the patch.
9. Read `current_state` again and check `lastPatch`, `pendingSections`, and `runtimeVerifiedSections`.
10. If the result is unstable or conflicting, rebuild from the latest state instead of guessing.

Mode intent shortcuts:

- `video_edit`: change one video draft, canvas, fit, transform, audio, export, or stickers.
- `video_compress`: treat as a size/export profile on a single video draft.
- `video_composition`: use segment/transition patches for multi-source timelines.
- `image_edit`: use canvas, fit, transform, export, or stickers.
- `image_compose`: use layout/output patches and `imageComposeSources` object patches.
- `gif_edit`: use trim/reverse/crop/fit/export/stickers on one GIF.
- `video_to_gif`: use video trim/export into GIF, then add stickers if needed.

If the requested edit does not clearly fit the active mode, do not invent a patch. Read the current state again or choose another tool path.

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
- For interactive session edits, do not paste the full `stateJson` back to the user. Use `editableIndex`, `patchGrammar`, and only the fields needed for the requested patch.

For non-HLS media tasks, source references must be App-visible local files. Use `path` from phone media lists, `path` from asset-library items, or `assetPath`/`appPath` returned by an asset-library upload. Current validate/probe/edit paths do not resolve temporary upload `fileId`, `mediaId`, or remote URLs. HLS/m3u8 URLs use the dedicated HLS tool and should not be sent to `clipnode_media_validate_app_path` or `clipnode_media_probe_sources`.

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

### Interactive Session Editing

Use these tools when the user is already editing a draft in the ClipNode media-session page and asks AI to adjust that open draft. These tools update the live App state and preview; they are not export jobs.

| Tool | Purpose |
|---|---|
| `clipnode_edit_get_current_state` | Read the active edit session, current revision, selectedContext, editableIndex, patchGrammar, and `lastPatch`. `patchGrammar.modeRules` scopes allowed patches to the active edit mode. Pass `compact=true` for a smaller stateSummary; omit it when full state/stateJson is needed. |
| `clipnode_edit_list_history` | List AI-applied patch history and redo count for the active edit session. |
| `clipnode_edit_validate_patch` | Dry-run a patch without mutating the draft. Returns the same structured patch result shape as apply, including `runtimeVerifiedSections` and `pendingSections` when relevant. |
| `clipnode_edit_apply_patch` | Apply a patch to the active draft, update UI/preview/draft, and return the new revision plus `idMap`, `changedObjects`, `changedSections`, `runtimeVerifiedSections`, and `pendingSections`. |
| `clipnode_edit_undo` | Undo the latest AI-applied patch in the bridge history. |
| `clipnode_edit_redo` | Redo the latest undone AI-applied patch. |
| `clipnode_edit_validate_export` | Optional read-only preflight. Validate whether the active live draft can be exported now and return readiness, a live-session export plan, and `exportStatus` without starting export. |
| `clipnode_edit_create_export` | Recommended export entry. Validate readiness, then show the App's live export/progress panel and start exporting the active draft using current UI/runtime/spec settings. Poll `clipnode_edit_get_current_state.exportStatus`; this does not return a headless jobId. |

Live-session export status:

- `clipnode_edit_get_current_state` returns `exportStatus`.
- While exporting, `exportStatus.working=true` and progress fields update.
- On success, `exportStatus.completedOnce=true` and `exportStatus.exportedPath` points to the App output file.
- Use `clipnode_media_download_file` with `outputPath=exportStatus.exportedPath` and `mediaType=image/video` when the user needs the result on the PC.

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
| `clipnode_media_validate_app_path` | Lightweight path gate for App-visible `path`/`appPath`/`assetPath` before stickers, canvas background, external audio, media source, or image-compose source patches. Rejects PC paths, remote URLs, unresolved ids, unsupported types, and purpose/type mismatches. |
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

## Interactive Patch Contract

Interactive edit patches are intentionally small and rule-based. The MCP plugin exposes the tools; the Android app owns validation, normalization, id generation, preview updates, draft saving, and undo/redo history.

Mode matrix:

| Mode | Primary patch focus | Avoid guessing |
|---|---|---|
| `video_edit` | `timeRange`, `canvas`, `fit`, `transform`, `audio`, `export`, `stickers` | multi-source segment/transition edits |
| `video_compress` | `timeRange`, `audio`, `export` | complex layout or extra object collections |
| `video_composition` | `compositionSegments`, `compositionTransitions`, `canvas`, `audio`, `export`, `stickers` | sticker-only edits when a segment/transition change is requested |
| `image_edit` | `canvas`, `fit`, `transform`, `export`, `stickers` | video composition collections |
| `image_compose` | `imageCompose`, `export`, `imageComposeSources` | sticker patches |
| `gif_edit` | `timeRange`, `canvas`, `fit`, `transform`, `gif`, `export`, `stickers` | video composition collections |
| `video_to_gif` | `timeRange`, `fit`, `transform`, `gif`, `export`, `stickers` | video composition collections |

Mode rules:

- Always read `patchGrammar.modeRules` from `clipnode_edit_get_current_state`.
- Mode rules are a conservative live-session patch surface, not the final product boundary. Expand them only after App runtime restore, validation, UI refresh, and draft save are verified for that mode.
- `patchGrammar.modeRules.intentCapabilities` is the AI-facing capability list for the current page. Prefer it over guessing from task type names.
- `video_edit` currently exposes timeRange, canvas, fit, transform, audio, export, and stickers.
- `video_compress` currently exposes timeRange, audio, and export. In the task-flow API it remains a separate taskType for compression-oriented routing/templates, but in live-session patching it should be treated as a video_edit compression/export profile rather than a fully separate editor.
- `video_composition` currently exposes canvas, audio, export, stickers, `compositionSegments`, and `compositionTransitions`.
- `image_edit` currently exposes canvas, fit, transform, export, and stickers.
- `image_compose` currently exposes imageCompose, export, and imageComposeSources object patches. It does not expose sticker patches yet.
- `gif_edit` currently exposes timeRange, canvas, fit, transform, gif, export, and stickers.
- `video_to_gif` currently exposes timeRange, fit, transform, gif, export, and stickers.
- If a section/action is absent from `patchGrammar`, do not send it; the App rejects unsupported patches before apply.
- Prefer headless task flow for one-shot template generation, batch work, and compression. Prefer live-session patching when the user is looking at the current draft or wants AI to continue a partially manual edit.
- `sectionPatch/timeRange` accepts `startUs/endUs` in microseconds and aliases `startMs/endMs`, `startSec/endSec`.
- For image composition, `objectPatch` with `collection=imageComposeSources` can add, replace, delete, move, rotate, flip, fit, or crop sources. Existing source ids come from `editableIndex`; `add` may omit `id`. Use `patchGrammar.modeRules.objectCollectionRules.imageComposeSources.ops` for the exact op list.
- For video composition, `objectPatch` with `collection=compositionSegments` can add, replace, delete, move, trim, fit, crop, mute, adjust volume, rotate, or flip segments. Existing ids come from `editableIndex`; `add` may omit `id` and can use `value.index`.
- Before adding or replacing a video composition video/GIF source, call `clipnode_media_probe_sources` with `includeFrameTimeline=true` and `frameTimelineMode=full`; for videos also pass `includeKeyFrameTimeline=true`. Copy `frameTimeline.values` into `value.frameTimeline.values` or `value.frameTimeList`, and copy `keyFrameTimeline.values` into `value.keyFrameTimeline.values` or `value.keyFrameTimeList`.

Authentication:

- The MCP server reuses the App-issued auth cookie in memory.
- It also keeps a local short-lived auth cache keyed by base URL and PIN hash so reconnects do not need to call `/auth/pin` every time.
- If the App returns 401, the MCP server clears the cached cookie, authenticates once with the PIN, and retries the request.
- Set `CLIPNODE_AUTH_CACHE=0` to disable the local auth cache. Set `CLIPNODE_AUTH_CACHE_FILE=/path/to/auth-cache.json` to choose a custom cache file.

Patch request shape:

```json
{
  "sessionId": "current",
  "baseRevision": 0,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_text_sticker",
      "clientTempId": "ai_title_1",
      "value": {
        "x": 0.5,
        "y": 0.82,
        "text": {
          "content": "Title",
          "textSize": 42,
          "color": "#FFFFFFFF"
        }
      }
    }
  ]
}
```

Supported patch types:

| Type | Purpose | Key fields |
|---|---|---|
| `sectionPatch` | Merge a top-level edit section. | `section`, `op=merge`, `value` |
| `objectPatch` | Merge, delete, or reorder an existing object. | `collection=stickers`, `id`, `op`, `value` |
| `actionPatch` | Add a new object or run a named action. | `action`, `clientTempId`, `value` |

Current supported targets:

| Target | Values |
|---|---|
| Sections | `canvas`, `fit`, `transform`, `audio`, `gif`, `imageCompose`, `export` |
| Object collections | `stickers` |
| Object ops | `merge`, `delete`, `duplicate`, `bringToFront`, `sendToBack`, `moveForward`, `moveBackward` |
| Actions | `add_text_sticker`, `add_image_sticker`, `add_gif_sticker` |

Section patch field rules:

- Read `patchGrammar.sectionPatchFields` from `clipnode_edit_get_current_state` before writing section patches.
- `canvas` supports preset/size/background fields. Live-session `canvas.preset` supports `original`, `custom`, `1:1`, `4:3`, `3:4`, `3:2`, `2:3`, `9:16`, and `16:9`; `background.mode` supports `none/color/self_blur/image/video`.
- `fit` supports `mode=center_crop/center_inside/fit_width/fit_height/stretch/custom` plus `custom.scale/offsetX/offsetY`.
- `transform` supports `rotateDegrees` as multiples of 90 and horizontal/vertical flip.
- `audio` supports mute/volume and App-readable external audio with `endMode=trim_to_video/loop_to_video/play_once`. When enabling `audio.external`, pass `path/appPath/assetPath` plus `durationUs` from phone media, asset-library selection, or media probe; `sourceEndUs` must be within `durationUs` and defaults to the full audio duration for newly enabled tracks.
- `gif` supports fps/frameSpace/backward/transparency/output size/crop.
- `export` supports preset, size, fps, bitrate, bitrateFactor, and imageQuality. Audio retention is normalized from audio settings.
- Invalid enum values, out-of-range values, and missing App-readable source paths fail validation before apply.

Id rules:

- Existing object ids must be copied from `editableIndex` returned by `clipnode_edit_get_current_state`.
- AI clients must not invent existing-object ids.
- New objects should use a caller-generated `clientTempId`.
- After apply, read `idMap` to map `clientTempId` to the App-generated canonical id.
- `baseRevision` must match the latest state revision. On conflict, refresh state and rebuild the patch.

Image compose source rules:

- In `image_compose`, editable source slots use `collection=imageComposeSources`.
- Source ids look like `imageComposeSource:{index}` and must be copied from `editableIndex`.
- Supported ops are `add`, `merge`, `replace`, `delete`, `moveForward`, `moveBackward`, and `moveTo`.
- `add` may omit `id`; pass `clientTempId` and read the canonical new id from `idMap`. `value.index` is optional and defaults to append.
- `add`, `replace`, and `merge` accept `path`, `appPath`, or `assetPath`; the path must validate as `purpose=image_compose_source`.
- `add` is capped at 16 sources and currently rejects duplicate paths because the live editor model cannot represent two independent crop instances of the same path safely yet.
- `moveTo` requires `value.index`.
- `delete` keeps at least two image sources.

Sticker transform field rules:

- Position accepts either top-level `x`/`y` or nested `position.x`/`position.y`.
- Scale/rotation accept either top-level `scale`/`rotation` or nested `transform.scale`/`transform.rotation`.
- Coordinates are normalized center positions in the active StickerView: `x=0.5`, `y=0.5` means center.
- Sticker timing accepts `startUs` and `endUs`.
- Sticker animation accepts `animation.inName`, `animation.loopName`, and `animation.outName`.
- For live session patches, prefer names from `patchGrammar.animationNames`. `loopName` supports App catalog names such as `ScaleHandler`, `FadeHandler`, `HeartbeatHandler`, `BlinkHandler`, `SwingHandler`, and `ShakeHandler`; unsupported names fail validation instead of silently becoming no-op.
- Sticker grid accepts `grid.enabled`, `grid.rows`, `grid.columns`, `grid.horizontalSpacing`, `grid.verticalSpacing`, or `grid.spacing`.
- Time-follow motion accepts `timeBinding.moveWithTime`.
- Sticker duplication uses objectPatch `op=duplicate`; pass `clientTempId` and read the canonical id from `idMap`.
- Sticker layer order uses objectPatch ops: `bringToFront`, `sendToBack`, `moveForward`, and `moveBackward`.

UI hint rules:

- `uiHint` is optional and is not editing data.
- Use `uiHint.select=true` when the changed or newly added sticker should become selected after apply.
- `highlight` and `openPanel` are reserved for UI feedback; keep `openPanel=false` unless the user explicitly asks to open an editing panel.
- App responses include `changedObjects`, `changedSections`, and `summary` so AI clients can explain what changed without diffing the full state.

Image sticker path rules:

- `add_image_sticker` accepts `image.path`, `image.appPath`, `image.assetPath`, or top-level `path`, `appPath`, `assetPath`.
- The final path must be a local file readable by the Android app process.
- Do not pass a PC path, remote URL, temporary upload `fileId`, or unresolved media id as an image sticker path.
- For MCP-originated images, upload/select them into an App-visible asset-library or phone-local path first, then pass the returned App path.
- When uncertain, call `clipnode_media_validate_app_path` with `purpose=image_sticker` before `clipnode_edit_validate_patch`.

GIF sticker path rules:

- `add_gif_sticker` accepts `gif.path`, `gif.appPath`, `gif.assetPath`, or top-level `path`, `appPath`, `assetPath`.
- The final path must be a local `.gif` file readable by the Android app process.
- Probe the GIF first with `clipnode_media_probe_sources` and `includeFrameTimeline=true`, then pass `gif.frameTimeList` or `gif.frameTimeline` plus width/height. If App metadata is already cached, the bridge can use the cache; otherwise it returns `gif_info_not_ready`.
- Do not pass a PC path, remote URL, temporary upload `fileId`, or unresolved media id as a GIF sticker path.
- When uncertain, call `clipnode_media_validate_app_path` with `purpose=gif_sticker` before probing and applying.

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
