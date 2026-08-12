"use strict";

const SUPPORTED_TASK_TYPES = [
  "video_edit",
  "video_compress",
  "video_composition",
  "gif_edit",
  "video_to_gif",
  "image_edit",
  "image_compose",
  "hls_mp4_export"
];

const workflowGuide = `# ClipNode Media MCP Workflow

Use ClipNode as a local media task executor. The AI client should organize the task; ClipNode should validate and execute it.

Default flow:
1. Configure the service when baseUrl or PIN is not already set.
2. Get capabilities before choosing taskType, templates, limits, or HLS options.
3. For transitions, prefer clipnode_media_list_transitions with tag/group/status filters instead of scanning the full capability payload.
4. For sticker/text-sticker animation choices, prefer clipnode_media_get_sticker_capabilities and clipnode_media_list_sticker_animations.
5. For source files, prefer phone media paths from list_videos/list_images or asset-library paths from clipnode_asset_* tools. When the AI uploads PC media through MCP, default to saving it into the asset library with target.kind=asset_library, target.type, and target.themeName; use the returned assetPath/appPath, not fileId. Temporary upload should be used only for explicitly one-off transfers because temporary upload locations are harder to browse, reuse, manage, and delete later.
6. For phone media, list video/image dirs and files first, then use returned path in validate/probe/edit/download calls. clipnode_media_validate_app_path, clipnode_media_probe_sources, and non-HLS media tasks read path/appPath/assetPath only; they do not resolve upload fileId, mediaId, or remote URLs.
7. For prepared user materials, use clipnode_asset_list_themes, clipnode_asset_search, or clipnode_asset_select_sources before building a template, video_composition, or image_compose request. The asset library is folder-backed: themeName is the physical folder name under asset_library/{image|video|audio}/.
8. Use asset-library item path as the source path. Asset-library items currently expose file/folder metadata only; do not assume semantic descriptions, tags, assetId, or themeId are available. For video/image composition, clipnode_asset_select_sources returns sources[] that can be merged directly into the task request.
9. Probe sources before deciding crop, trim, canvas, transition duration, or audio behavior.
10. Build one task request using taskType plus source/sources, config/specPatch, transitions, and export.
11. Validate with clipnode_media_validate_task before clipnode_media_create_task. Validation returns validationId and planHash for the exact request.
12. Create must use the same request plus validationId/validationPlanHash. The bridge can attach them automatically after a successful validate in the same session.
13. If validation returns suggestedFix, apply it and validate again. If needConfirmation is true, ask the user before creating the task and pass confirmationAccepted only after the user confirms.
14. Create one task at a time. ClipNode uses a single local media queue.
15. For multi-tool flows, call clipnode_task_begin once and pass taskId to every later tool.
16. Poll clipnode_media_get_job_status and/or clipnode_task_get_status until success, failed, or canceled.
17. Download the output when the user needs the result on the PC.

Interactive session edit flow:
1. When the user is already editing in the ClipNode media session page and asks for AI help, use clipnode_edit_get_current_state instead of creating a new export task.
2. Read sessionId, revision, editableIndex, selectedContext, and patchGrammar from the current-state response. Use compact=true for ordinary targeting; request full state only when needed.
3. Also read selectedContext when the user refers to the current selection or current timeline position.
4. Build a small patch request with baseRevision equal to the returned revision.
5. Read patchGrammar.modeRules first. It scopes allowed patch types, sections, objectCollectionRules, actions, and intentCapabilities to the active MediaEditSpec.type such as video_edit, image_edit, gif_edit, video_to_gif, image_compose, video_composition, or video_compress.
6. For section edits, use sectionPatch with one of the sections reported by patchGrammar. Read patchGrammar.sectionCapabilities to understand whether the App has validator/projector/verifier coverage for that section, then choose fields/enums from patchGrammar.sectionPatchFields.
7. For object edits, use objectPatch only for collections listed in patchGrammar.modeRules.objectCollectionRules. Existing-object ids must come from editableIndex; do not invent ids. In image_compose, use collection=imageComposeSources to add, replace, delete, move, fit, crop, rotate, or flip source slots. In video_composition, use collection=compositionSegments to add/replace/delete/reorder sources or adjust segment trim, image duration, fit/crop, audio, rotate, and flip; use compositionTransitions for existing transition asset/duration/audio-cross-fade adjustments. compositionSegments add/replace requires an App-readable path plus width/height/sourceDurationUs and full frameTimeline.values from clipnode_media_probe_sources with includeFrameTimeline=true, includeKeyFrameTimeline=true for video, and frameTimelineMode=full. The imageComposeSources and compositionSegments add ops may omit id, should pass clientTempId, and can use value.index to insert.
8. For new image/GIF stickers or section paths, call clipnode_media_validate_app_path first when the path did not come directly from a fresh phone list or asset-library response. Use actionPatch with clientTempId only when the action is listed in patchGrammar.actionPatchActions. Read idMap from the apply response to learn the App-generated canonical id. For GIF stickers, probe the GIF with includeFrameTimeline=true first, then pass gif.frameTimeList.
9. Call clipnode_edit_validate_patch before clipnode_edit_apply_patch when the change is non-trivial or when ids/fields are uncertain.
10. If apply returns revision_conflict, read current state again and rebuild the patch against the latest revision.
11. To select an added or changed sticker after applying, set patch.uiHint.select=true. Do not set openPanel=true unless the user explicitly asks for a panel.
12. Sticker runtime restore can be briefly eventually consistent after apply/undo/redo because StickerView imports and layout happen asynchronously. If apply/undo/redo/current_state returns pendingSections=["stickers"] or sticker_projection_pending warnings, wait briefly and read again; do not overwrite the spec with transient StickerView default x/y/scale values or stale sticker objects.
13. Use clipnode_edit_undo or clipnode_edit_redo for AI-applied edit history only.
14. To finish the current live draft, call clipnode_edit_create_export directly. It validates readiness before starting. This is live-session export, not a headless media job; the App shows its export/progress panel, then poll clipnode_edit_get_current_state and read exportStatus for progress and output path. Use clipnode_edit_validate_export only for a read-only export preflight when the user asks whether export is possible or when you need to explain the plan without starting. Export preflight/create responses split plan.specExport, plan.runtimeExport, and plan.warnings; video live-session export consumes width/height/fps/bitrate from runtimeExport, and any remaining mode-specific runtime gaps are listed in warnings.

Task routing:
- video_edit: one video, trim/timeRange, crop/fit/rotate/mute/stickers/export settings.
- video_compress: one video, optional trim/timeRange, size-first export with bitrate/resolution/fps/audio controls.
- video_composition: 视频合成. Compose App-visible video/image/GIF sources into one MP4 with optional transition animations and audio cross-fade. Capabilities/templates currently report maxSources=30 as the recommended single-task size, not a hard code-enforced limit; larger requests may increase probe/render time, memory pressure, export failure risk, and user wait time.
- gif_edit: one GIF edit. Current headless support includes trim range, frame-order reversal, frame sampling, normalized crop, output sizing, fit/rotate/flip, transparent-frame preservation, and text/image/GIF stickers rendered on each encoded frame.
- video_to_gif: one video to GIF. Current headless support includes trim range, fps, frame sampling, frame-order reversal, normalized crop, output sizing, and text/image/GIF stickers rendered on each encoded frame. Sticker startUs/endUs use the output GIF timeline. Subtitle rendering is not part of this mode yet.
- image_edit: one static image. Current headless support includes canvas/fit, custom crop transform, rotate/flip, text/image/GIF stickers rendered at time 0, and JPG/PNG export. For visible static stickers, prefer empty animation.inName/outName; use image.path and gif.path for sticker assets.
- image_compose: 2-16 static images composed into one image with GL. Supports horizontal, vertical, auto grid, fixed grid, hero, diamond, circle, and hexagon layouts; per-source fit/rotate/flip/custom crop; spacing/padding; background color/alpha; and JPG/PNG export. Use top-level sources[] for MCP requests.
- hls_mp4_export: one m3u8 URL to one MP4 job. Use clipnode_media_export_m3u8_to_mp4 with source.videoId and source.url; do not probe HLS URLs with clipnode_media_probe_sources.

Planned task routing:
- subtitle: planned.

Safety rules:
- Do not create complex video tasks before validation.
- If create_task returns validation_required, validation_expired, or validation_request_changed, call validate_task again with the final request and retry create with the returned validationId.
- Do not invent transition or sticker animation names outside capabilities/templates.
- For automatic transitions, prefer autoSelectable catalog items when present.
- Do not submit multiple m3u8 URLs in one HLS task.
- Preserve requestId for traceability and clientJobKey for idempotent retries.`;

const resources = [
  {
    uri: "clipnode://workflow-guide",
    name: "ClipNode Media Workflow Guide",
    description: "Default AI workflow for using ClipNode media MCP tools.",
    mimeType: "text/markdown"
  }
];

const prompts = [
  {
    name: "clipnode_media_task_workflow",
    description: "Guide an AI client to choose ClipNode task type, validate, execute, poll, and download results.",
    arguments: [
      {
        name: "user_request",
        description: "The user's natural-language media editing request.",
        required: false
      }
    ]
  }
];

function addTaskMetaProperties(properties) {
  return Object.assign({}, properties || {}, {
    taskId: {
      type: "string",
      description: "AI task id returned by clipnode_task_begin. Pass it through every tool in a multi-step workflow."
    },
    toolRunId: {
      type: "string",
      description: "Optional caller-provided tool run id. The bridge/App can generate one when omitted."
    },
    requestId: {
      type: "string",
      description: "Optional request id for tracing one MCP tool call."
    },
    clientJobKey: {
      type: "string",
      description: "Optional idempotency key supplied by the AI client."
    }
  });
}

const tools = [
  {
    name: "clipnode_media_configure",
    description: "Configure ClipNode local service base URL and PIN for this MCP session. Use this before other ClipNode tools when CLIPNODE_PIN is empty, the service URL changed, or authentication failed.",
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: { type: "string" },
        pin: { type: "string" }
      },
      required: ["baseUrl", "pin"]
    }
  },
  {
    name: "clipnode_media_get_capabilities",
    description: "Use near the start of every media task. Returns the App-reported task types, limits, workflow capabilities, transition catalog, sticker capabilities, HLS options, and template flags so the AI does not guess unsupported edits. Built-in reference templates are listed by clipnode_media_list_templates from the MCP plugin assets.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "clipnode_media_list_transitions",
    description: "List and filter ClipNode transition assets by tag, group, query, or autoSelectable. Prefer this over scanning the full capabilities payload when choosing a video_composition transition.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        tag: {
          type: "string",
          description: "Single tag filter such as 3d, book, flip, soft, fade, smooth, wipe, glitch, grid, or mosaic."
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Multiple tag filters. By default all requested tags must match."
        },
        tagsMode: {
          type: "string",
          enum: ["all", "any"],
          description: "How to match tags[]; default is all."
        },
        group: {
          type: "string",
          description: "Transition group filter, such as Basic, Wipe, Shape, Zoom, 3D, Distort, or Color."
        },
        autoSelectable: {
          type: "boolean",
          description: "When true, return only transitions safe for automatic selection."
        },
        query: {
          type: "string",
          description: "Case-insensitive search across name, assetPath, group, and tags."
        },
        limit: {
          type: "number",
          description: "Maximum result count. Default 50, maximum 200."
        }
      })
    }
  },
  {
    name: "clipnode_media_get_transition",
    description: "Get one ClipNode transition asset by assetPath or id. Use after list_transitions when the AI needs the exact transition config for video_composition.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        assetPath: { type: "string" },
        id: { type: "string" }
      })
    }
  },
  {
    name: "clipnode_media_get_sticker_capabilities",
    description: "Get ClipNode sticker/text-sticker capability details without loading unrelated task capabilities. Use before building stickers.items for video_edit, video_composition, or image_edit.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({})
    }
  },
  {
    name: "clipnode_media_list_sticker_animations",
    description: "List and filter ClipNode sticker animation names by tag, group, status, slot, or query. Use for animation.inName, animation.loopName, and animation.outName.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        tag: {
          type: "string",
          description: "Single tag filter such as safe_auto, fade, zoom, motion, mask, wipe, grid, shape, or dissolve."
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Multiple tag filters. By default all requested tags must match."
        },
        tagsMode: {
          type: "string",
          enum: ["all", "any"],
          description: "How to match tags[]; default is all."
        },
        group: {
          type: "string",
          description: "Animation group filter, such as basic, mask, wipe, split, shape, or texture."
        },
        status: {
          type: "string",
          description: "Animation status filter, such as available."
        },
        slot: {
          type: "string",
          enum: ["inName", "loopName", "outName"],
          description: "Return animations that can be used in a specific sticker animation slot."
        },
        query: {
          type: "string",
          description: "Case-insensitive search across id, name, group, status, and tags."
        },
        limit: {
          type: "number",
          description: "Maximum result count. Default 50, maximum 200."
        }
      })
    }
  },
  {
    name: "clipnode_task_begin",
    description: "Create an AI task container before running several ClipNode tools in sequence. Pass the returned taskId to every upload/export/status/download call so App and AI see one coherent workflow.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        title: { type: "string" }
      })
    }
  },
  {
    name: "clipnode_task_get_status",
    description: "Get the latest AI task state from ClipNode, including summary, stateHint, problem, outputCandidates, tool runs, timing fields, and latest event. Prefer this for AI-facing workflow state.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        taskId: { type: "string" }
      }),
      required: ["taskId"]
    }
  },
  {
    name: "clipnode_task_get_current",
    description: "Get ClipNode's current active AI task and recent task events. Use when the user asks what the App task center is showing or the taskId is unknown.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "clipnode_task_list_events",
    description: "Get the milestone event log for one AI task. Events are append-only and compact; tool progress snapshots should be read from clipnode_task_get_status.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        taskId: { type: "string" }
      }),
      required: ["taskId"]
    }
  },
  {
    name: "clipnode_edit_get_current_state",
    description: "Read the active ClipNode media-session edit state for interactive AI editing. Use when the user is already on the edit/session page and wants AI to adjust the current draft. Returns sessionId, revision, selectedContext, editableIndex, and patchGrammar. patchGrammar.modeRules scopes available patches to the active edit mode; patchGrammar.sectionCapabilities reports validator/projector/verifier coverage per section. Full mode also returns state/stateJson. Patch object ids must come from editableIndex.",
    inputSchema: aiEditSessionSchema()
  },
  {
    name: "clipnode_edit_list_history",
    description: "List AI-applied edit history for the active media session, including current revision and redo count. Use before undo/redo explanations or when the user asks what AI changed.",
    inputSchema: aiEditSessionSchema()
  },
  {
    name: "clipnode_edit_validate_patch",
    description: "Dry-run an interactive session patch without mutating the current ClipNode draft. Use before apply when editing existing objects, changing multiple sections, or when the AI is unsure about ids/fields. baseRevision must match the latest current-state revision.",
    inputSchema: aiEditPatchRequestSchema()
  },
  {
    name: "clipnode_edit_apply_patch",
    description: "Apply an interactive AI edit patch to the active ClipNode media-session draft. Reads patch ids from editableIndex, writes the draft/UI/preview in the Android app, and returns the new revision plus idMap for clientTempId-created objects.",
    inputSchema: aiEditPatchRequestSchema()
  },
  {
    name: "clipnode_edit_undo",
    description: "Undo the latest AI-applied interactive edit in the active ClipNode media session. This targets the AI edit bridge history, not arbitrary manual App edits.",
    inputSchema: aiEditSessionSchema()
  },
  {
    name: "clipnode_edit_redo",
    description: "Redo the latest undone AI-applied interactive edit in the active ClipNode media session.",
    inputSchema: aiEditSessionSchema()
  },
  {
    name: "clipnode_edit_validate_export",
    description: "Optional read-only preflight for the active ClipNode media-session draft. Returns readiness, current exportStatus, and a live-session export plan with specExport, runtimeExport, and warnings. Do not call this before every export; clipnode_edit_create_export validates readiness internally. For video live-session export, width/height/fps/bitrate in runtimeExport are the values the App will use; treat any warning as a mode-specific runtime coverage gap.",
    inputSchema: aiEditSessionSchema()
  },
  {
    name: "clipnode_edit_create_export",
    description: "Recommended live-session export entry. Validate readiness, then show the App's live export/progress panel and start exporting the active ClipNode media-session draft using the current UI/runtime/spec settings. Returns the same plan shape as validate_export, including specExport/runtimeExport/warnings. This does not create a headless media jobId; poll clipnode_edit_get_current_state and read exportStatus. Use clipnode_media_download_file with outputPath=exportStatus.exportedPath after completion if the user needs the file on the PC.",
    inputSchema: aiEditSessionSchema()
  },
  {
    name: "clipnode_media_probe_sources",
    description: "Probe local App-visible media metadata before building crop, trim, canvas, transition, or audio parameters. Pass path or appPath from phone media, asset-library results, or an upload that returned appPath/assetPath. This probe does not resolve upload fileId/mediaId and does not probe remote URLs or HLS m3u8 URLs. If any source fails, do not create a task; choose another App-visible file or upload it into the asset library.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              appPath: { type: "string" },
              path: { type: "string" },
              includeFrameTimeline: {
                type: "boolean",
                description: "Set true only for edit-time analysis that needs video/GIF frame times. Browsing and basic validation should leave this false."
              },
              includeKeyFrameTimeline: {
                type: "boolean",
                description: "Set true only when video key-frame times are needed for precise seeking or frame extraction."
              },
              frameTimelineMode: {
                type: "string",
                enum: ["summary", "sample", "full"],
                description: "Controls returned timeline size. summary returns count/first/last, sample adds a small evenly-spaced sample, full returns the full cached timeline."
              }
            },
            anyOf: [
              { required: ["appPath"] },
              { required: ["path"] }
            ]
          }
        },
        includeFrameTimeline: {
          type: "boolean",
          description: "Default for all sources. Leave false for basic metadata; true can be expensive on large videos."
        },
        includeKeyFrameTimeline: {
          type: "boolean",
          description: "Default for all sources. Leave false unless key-frame timing is required."
        },
        frameTimelineMode: {
          type: "string",
          enum: ["summary", "sample", "full"],
          description: "Default for all sources when frame/key-frame timelines are requested."
        }
      }),
      required: ["sources"]
    }
  },
  {
    name: "clipnode_media_validate_app_path",
    description: "Quickly validate whether a local App-visible path/appPath/assetPath can be used as a specific material before probing or patching. Use this for interactive edits when adding image/GIF stickers, canvas backgrounds, external audio, media sources, or image-compose sources. It rejects PC paths, remote URLs, unresolved fileId/mediaId references, unsupported media types, and purpose/type mismatches. This is lighter than clipnode_media_probe_sources and does not return frame timelines.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        purpose: {
          type: "string",
          enum: ["any", "image_sticker", "gif_sticker", "canvas_background", "external_audio", "media_source", "image_compose_source"],
          description: "How the path will be used. Defaults to any. Purpose-specific checks prevent, for example, passing a JPG to add_gif_sticker or an MP3 as a canvas background."
        },
        path: {
          type: "string",
          description: "One App-readable local file path. You may pass path/appPath/assetPath at the top level for a single validation."
        },
        appPath: { type: "string" },
        assetPath: { type: "string" },
        paths: {
          type: "array",
          description: "Batch validation. Items may be strings or objects containing path/appPath/assetPath and optional purpose.",
          items: {
            anyOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  purpose: {
                    type: "string",
                    enum: ["any", "image_sticker", "gif_sticker", "canvas_background", "external_audio", "media_source", "image_compose_source"]
                  },
                  path: { type: "string" },
                  appPath: { type: "string" },
                  assetPath: { type: "string" }
                }
              }
            ]
          }
        }
      })
    }
  },
  {
    name: "clipnode_media_list_video_dirs",
    description: "List phone video directories visible to ClipNode. Use before list_videos when the user asks to choose a video from the phone.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({})
    }
  },
  {
    name: "clipnode_media_list_videos",
    description: "List phone videos visible to ClipNode. Pass dirPath from clipnode_media_list_video_dirs to narrow results; use returned path in probe/edit/download calls.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        dirPath: { type: "string" },
        page: { type: "number" },
        pageSize: { type: "number" }
      })
    }
  },
  {
    name: "clipnode_media_list_image_dirs",
    description: "List phone image/GIF directories visible to ClipNode. Use before list_images when the user asks to choose an image or GIF from the phone.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({})
    }
  },
  {
    name: "clipnode_media_list_images",
    description: "List phone images and GIFs visible to ClipNode. Pass dirPath from clipnode_media_list_image_dirs to narrow results; use returned path in image_edit, gif_edit, stickers, or download calls.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        dirPath: { type: "string" },
        page: { type: "number" },
        pageSize: { type: "number" }
      })
    }
  },
  {
    name: "clipnode_media_upload_file",
    description: "Upload one local PC media file to ClipNode. AI clients should default to saving uploaded media into the folder-backed asset library by passing target.kind=asset_library plus target.type and target.themeName, then use returned assetPath/appPath as the source path. Temporary upload keeps upload bookkeeping but does not currently return a task-ready App path for probe/edit and is harder to browse, reuse, manage, or delete later; use it only for explicitly one-off transfers.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        localPath: { type: "string" },
        fileName: { type: "string" },
        target: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["asset_library"] },
            type: { type: "string", enum: ["image", "video", "audio"] },
            themeName: { type: "string" }
          }
        }
      }),
      required: ["localPath"]
    }
  },
  {
    name: "clipnode_asset_list_themes",
    description: "List folder-backed ClipNode asset-library themes under asset_library/{image|video|audio}/. Each themeName is the physical folder name. Returned summaries include type, themeName, path, count, and lastModified only; no semantic description, tags, themeId, or assetId is available yet.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        type: { type: "string", enum: ["image", "video", "audio"] },
        query: { type: "string" }
      })
    }
  },
  {
    name: "clipnode_asset_list_items",
    description: "List media files inside one folder-backed asset-library theme. Pass themeName as the folder name. Use the returned path as the source path when filling template slots or building media tasks. Items currently expose file metadata only, not assetId, tags, or AI summaries.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        type: { type: "string", enum: ["image", "video", "audio"] },
        themeName: { type: "string" },
        query: { type: "string" },
        page: { type: "number" },
        pageSize: { type: "number" }
      })
    }
  },
  {
    name: "clipnode_asset_search",
    description: "Search folder-backed asset-library items with plain substring matching over themeName, fileName, and displayName. This is not semantic search and does not use tags, descriptions, embeddings, or content recognition.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        type: { type: "string", enum: ["image", "video", "audio"] },
        themeName: { type: "string" },
        query: { type: "string" },
        page: { type: "number" },
        pageSize: { type: "number" }
      })
    }
  },
  {
    name: "clipnode_asset_select_sources",
    description: "Select files from a folder-backed asset-library theme/search result and return media-task source entries. Selection is based on listed files and optional plain-text query, not semantic scoring. Use this to turn image/video files into sources[] or choose an audio file for specPatch.audio.external.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        type: { type: "string", enum: ["image", "video", "audio"] },
        themeName: { type: "string" },
        query: { type: "string" },
        count: {
          type: "number",
          description: "Maximum selected item count. Default 10, maximum 100."
        },
        pageSize: {
          type: "number",
          description: "Underlying asset query page size. Defaults to count."
        },
        fitMode: {
          type: "string",
          description: "Source fit.mode for image/video composition clips. Default center_crop."
        },
        imageDurationUs: {
          type: "number",
          description: "Still image clip duration for video_composition sources. Default 3000000."
        },
        videoTrimStartUs: {
          type: "number",
          description: "Optional trim.startUs applied to selected video sources."
        },
        videoTrimEndUs: {
          type: "number",
          description: "Optional trim.endUs applied to selected video sources."
        },
        muteOriginalAudio: {
          type: "boolean",
          description: "Whether selected video composition clips should mute original audio. Default true."
        },
        audioEndMode: {
          type: "string",
          enum: ["trim_to_video", "loop_to_video", "play_once"],
          description: "When type=audio, returned audioExternal.endMode. Default loop_to_video."
        },
        audioVolume: {
          type: "number",
          description: "When type=audio, returned audioExternal.volume. Default 1."
        }
      }),
      required: ["type"]
    }
  },
  {
    name: "clipnode_media_download_file",
    description: "Download a successful ClipNode output or local media file to the PC after job status is success. Use outputPath from job status or fileId from output listing.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        fileId: { type: "string" },
        outputPath: { type: "string" },
        mediaType: { type: "string", enum: ["video", "image"] },
        saveTo: { type: "string" }
      })
    }
  },
  {
    name: "clipnode_media_validate_task",
    description: "Validate a non-HLS media task without exporting. Use this after capabilities and source probing, and before clipnode_media_create_task. It accepts App-visible source.path/appPath values; do not pass remote URLs or unresolved upload fileIds. Follow aiDecision.action for the next tool call. Use planSummary.readableText and timelineSummary to explain the planned edit. If suggestedFix is returned, apply it and validate again; if needConfirmation is true, ask the user before creating the task.",
    inputSchema: taskRequestSchema()
  },
  {
    name: "clipnode_media_create_task",
    description: "Create one validated non-HLS ClipNode serial-queue media task. Use only after clipnode_media_validate_task returns ok for the exact same request and no unresolved confirmation is needed. For HLS/m3u8, use clipnode_media_export_m3u8_to_mp4 instead. Poll job status until a terminal state before starting another task.",
    inputSchema: taskRequestSchema()
  },
  {
    name: "clipnode_media_export_m3u8_to_mp4",
    description: "Create one complete HLS job that exports a single m3u8 URL to a final MP4 file. Use this dedicated tool for hls_mp4_export. Pass source.videoId as a positive unique number and source.url as an http(s) .m3u8 URL. Do not pass sources[] or multiple URLs. Poll the returned jobId until success, failed, or canceled.",
    inputSchema: hlsMp4ExportRequestSchema()
  },
  {
    name: "clipnode_media_get_job_status",
    description: "Get ClipNode job status. Poll after create_task or export_m3u8_to_mp4 until status is success, failed, or canceled. Surface stage/progress to the user for long jobs.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        jobId: { type: "string" }
      }),
      required: ["jobId"]
    }
  },
  {
    name: "clipnode_media_cancel_job",
    description: "Cancel a queued or running ClipNode job only when the user asks to stop it or the current plan is no longer desired.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        jobId: { type: "string" }
      }),
      required: ["jobId"]
    }
  },
  {
    name: "clipnode_media_list_outputs",
    description: "List successful ClipNode outputs when the user asks for previous results or when job status does not include enough download information.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({})
    }
  },
  {
    name: "clipnode_media_list_templates",
    description: "List MCP-plugin built-in reference templates before composing common edits such as 9:16 crop, self-blur canvas, video compression, soft video composition, album memory video, image compose, HLS export, GIF edit, or rich stickers. Templates are examples/default config, not complete executable requests and not user templates stored in the App. Merge the chosen template config with real sources, user intent, transitions, stickers, and export settings, then validate non-HLS tasks or call the HLS tool.",
    inputSchema: {
      type: "object",
      properties: {
        taskType: { type: "string" },
        tag: {
          type: "string",
          description: "Single tag filter such as 3d, soft, fade, hls, gif, text, sticker, image_compose, memory, or video_composition."
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Multiple tag filters. By default all requested tags must match."
        },
        tagsMode: {
          type: "string",
          enum: ["all", "any"],
          description: "How to match tags[]; default is all."
        },
        query: {
          type: "string",
          description: "Case-insensitive search across id, name, description, taskType, and tags."
        },
        limit: {
          type: "number",
          description: "Maximum result count. Default 50, maximum 200."
        }
      }
    }
  },
  {
    name: "clipnode_media_get_template",
    description: "Get one MCP-plugin built-in reference template by id. Use its taskType and config as a starting point only; merge with user intent, real App-visible sources, and current capabilities. For non-HLS tasks call validate_task before create_task; for hls_mp4_export call clipnode_media_export_m3u8_to_mp4 with a real source.videoId and source.url.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  }
];

function aiEditSessionSchema() {
  return {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Interactive edit session id returned by clipnode_edit_get_current_state. Omit or use current for the active session."
      },
      compact: {
        type: "boolean",
        description: "When true, current state omits full state/stateJson and returns a smaller stateSummary plus editableIndex. Recommended for most targeting reads."
      },
      format: {
        type: "string",
        enum: ["compact", "full"],
        description: "Optional alias for compact state reads. Use compact to reduce response size."
      },
      requestId: {
        type: "string",
        description: "Optional request id for tracing one MCP tool call."
      },
      toolRunId: {
        type: "string",
        description: "Optional caller-provided tool run id."
      }
    }
  };
}

function aiEditPatchRequestSchema() {
  return {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Interactive edit session id returned by clipnode_edit_get_current_state. Omit or use current for the active session."
      },
      baseRevision: {
        type: "number",
        description: "Must equal the latest revision from clipnode_edit_get_current_state. On revision_conflict, read current state again and rebuild the patch."
      },
      patches: {
        type: "array",
        description: "Small ordered patch list. Prefer the narrowest patch that expresses the user's edit.",
        items: aiEditPatchSchema()
      },
      requestId: {
        type: "string",
        description: "Optional request id for tracing one MCP tool call."
      },
      toolRunId: {
        type: "string",
        description: "Optional caller-provided tool run id."
      }
    },
    required: ["baseRevision", "patches"]
  };
}

function aiEditPatchSchema() {
  return {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["sectionPatch", "objectPatch", "actionPatch"]
      },
      op: {
        type: "string",
        enum: ["merge", "delete", "duplicate", "bringToFront", "sendToBack", "moveForward", "moveBackward", "replace", "add", "moveTo"],
        description: "sectionPatch uses merge. sticker objectPatch supports merge/delete/duplicate plus layer operations bringToFront/sendToBack/moveForward/moveBackward. imageComposeSources supports add/merge/replace/delete/moveForward/moveBackward/moveTo. compositionSegments supports add/merge/replace/delete/moveForward/moveBackward/moveTo for video_composition segments; add/replace require path/appPath/assetPath plus width/height/sourceDurationUs and frameTimeList or frameTimeline.values for video/GIF sources; video sources also require keyFrameTimeList or keyFrameTimeline.values. compositionTransitions supports merge for existing transition assetPath/name, durationUs/durationMs/durationSec, and audioCrossFadeEnabled/audioCrossFade. duplicate/add can use clientTempId and returns its canonical id in idMap when applicable."
      },
      section: {
        type: "string",
        enum: ["timeRange", "canvas", "fit", "transform", "audio", "gif", "imageCompose", "composition", "export"],
        description: "Target section for sectionPatch."
      },
      collection: {
        type: "string",
        enum: ["stickers", "imageComposeSources", "compositionSegments", "compositionTransitions"],
        description: "Target collection for objectPatch. Use stickers only when modeRules allows stickers; use imageComposeSources only in image_compose; use compositionSegments or compositionTransitions only in video_composition."
      },
      id: {
        type: "string",
        description: "Existing object id. Must be copied from editableIndex; AI clients must not invent this id."
      },
      action: {
        type: "string",
        enum: ["add_text_sticker", "add_image_sticker", "add_gif_sticker"],
        description: "Action for actionPatch. Undo/redo have dedicated MCP tools. For add_gif_sticker, pass an App-readable .gif path and gif.frameTimeList from clipnode_media_probe_sources includeFrameTimeline=true, unless App metadata is already cached."
      },
      clientTempId: {
        type: "string",
        description: "Caller temporary id for a newly added object. The App returns clientTempId -> canonical id in idMap after apply."
      },
      value: {
        type: "object",
        description: "Partial value merged by the App-side patch rule. For sectionPatch, read patchGrammar.sectionCapabilities first, then choose fields/enums from patchGrammar.sectionPatchFields; invalid enum/range/path values fail validation and projection mismatches fail apply. For audio.external, enabled=true requires external.path/appPath/assetPath plus durationUs from phone media, asset-library selection, or media probe; sourceEndUs must be <= durationUs and omitted sourceEndUs defaults to durationUs for a newly enabled track. In image_compose, sectionPatch.imageCompose is for layout/output fields or whole source-list replacement; prefer objectPatch collection=imageComposeSources for one source add/replace/delete/reorder/crop edits. In video_composition, prefer objectPatch collection=compositionSegments for segment add/replace/delete/reorder, existing segment sourceStartUs/sourceEndUs, imageDurationUs, fitMode or fit.mode, cropTransform/fit.custom, audio.mute/volume, rotateDegrees, flipHorizontal/flipVertical, and moveTo.index; add/replace must include path/appPath/assetPath, width, height, sourceDurationUs for video/GIF sources, frameTimeList or frameTimeline.values for video/GIF sources, and keyFrameTimeList or keyFrameTimeline.values for video sources. Use clipnode_media_probe_sources with includeFrameTimeline=true, includeKeyFrameTimeline=true, frameTimelineMode=full before adding/replacing composition videos. Use collection=compositionTransitions for existing transition assetPath/name, durationUs/durationMs/durationSec, and audioCrossFadeEnabled/audioCrossFade. Sticker transforms accept x/y or position.x/position.y in 0-1, plus scale/rotation or transform.scale/transform.rotation where scale is 0.01-10. Stickers also accept startUs/endUs with endUs > startUs, animation.inName/loopName/outName, grid.enabled/rows/columns/spacing where rows/columns are 1-20 and spacing is 0-3, and timeBinding.moveWithTime. Prefer animation names from patchGrammar.animationNames; unsupported names fail validation. Image stickers accept image.path/image.appPath/image.assetPath or top-level path/appPath/assetPath. GIF stickers accept gif.path/gif.appPath/gif.assetPath plus gif.frameTimeList/frameTimeline, width/height, durationUs, frameCount, and frameDelayUs. Paths must be App-readable local files.",
        additionalProperties: true
      },
      uiHint: {
        type: "object",
        description: "Optional UI feedback hint. It is not editing data. select=true asks the App to select the changed/new sticker after patch apply. highlight and openPanel are reserved; keep openPanel false unless the user explicitly asks.",
        properties: {
          select: { type: "boolean" },
          highlight: { type: "boolean" },
          openPanel: { type: "boolean" }
        },
        additionalProperties: true
      }
    },
    additionalProperties: true
  };
}

function exportRequestSchema() {
  const schema = {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: SUPPORTED_TASK_TYPES
      },
      source: {
        type: "object",
        description: "For non-HLS media tasks, use an App-visible local file path. Accepted fields are path or appPath. Upload fileId is not resolved as a media source by the current App headless path.",
        properties: {
          appPath: { type: "string" },
          path: { type: "string" }
        }
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          description: "One App-visible local source for video_composition or image_compose. Use path/appPath from phone media, asset library, or asset-library upload results.",
          properties: {
            id: { type: "string" },
            appPath: { type: "string" },
            path: { type: "string" },
            width: { type: "number" },
            height: { type: "number" },
            fitMode: { type: "string" },
            rotateDegrees: { type: "number" },
            flipHorizontal: { type: "boolean" },
            flipVertical: { type: "boolean" },
            cropTransform: cropTransformSchema(),
            trim: {
              type: "object",
              properties: {
                startUs: { type: "number" },
                endUs: { type: "number" }
              }
            },
            fit: {
              type: "object",
              properties: {
                mode: { type: "string" },
                custom: {
                  type: "object",
                  properties: {
                    scale: { type: "number" },
                    offsetX: { type: "number" },
                    offsetY: { type: "number" }
                  }
                }
              }
            },
            transform: {
              type: "object",
              properties: {
                rotateDegrees: { type: "number" },
                flipHorizontal: { type: "boolean" },
                flipVertical: { type: "boolean" }
              }
            },
            audio: {
              type: "object",
              properties: {
                mute: { type: "boolean" },
                volume: { type: "number" }
              }
            }
          }
        }
      },
      imageCompose: imageComposeSchema(),
      transitions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            fromClipId: { type: "string" },
            toClipId: { type: "string" },
            assetPath: { type: "string" },
            durationUs: { type: "number" },
            audioCrossFade: { type: "boolean" }
          }
        }
      },
      timeRange: {
        type: "object",
        properties: {
          startUs: { type: "number" },
          endUs: { type: "number" }
        }
      },
      gif: {
        type: "object",
        properties: {
          fps: { type: "number" },
          frameSpace: { type: "number" },
          backward: { type: "boolean" },
          transparencyEnabled: { type: "boolean" },
          transparentAlphaThreshold: { type: "number" },
          outputWidth: { type: "number" },
          outputHeight: { type: "number" },
          crop: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" }
            }
          }
        }
      },
      specPatch: {
        type: "object",
        properties: {
          canvas: canvasPatchSchema(),
          fit: fitPatchSchema(),
          transform: transformPatchSchema(),
          audio: audioPatchSchema(),
          stickers: stickerGroupPatchSchema(),
          imageCompose: imageComposeSchema(),
          export: exportPatchSchema()
        },
        additionalProperties: true
      },
      export: {
        type: "object",
        properties: {
          outputName: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          maxSize: { type: "number" },
          targetHeight: { type: "number" },
          targetMaxSize: { type: "number" },
          imageQuality: { type: "number" },
          quality: { type: "string" },
          preset: { type: "string" },
          fps: { type: "number" },
          keepAudio: { type: "boolean" },
          bitrateFactor: { type: "number" }
        }
      },
      validationId: {
        type: "string",
        description: "Required by create_task for non-HLS media tasks. Use the value returned by clipnode_media_validate_task for the exact same request."
      },
      validationPlanHash: {
        type: "string",
        description: "Plan hash returned by validate_task. The App rejects create_task if the request changed after validation."
      },
      confirmationAccepted: {
        type: "boolean",
        description: "Set true only after the user explicitly confirms all validate_task confirmationItems when needConfirmation is true."
      }
    }
  };
  schema.properties = addTaskMetaProperties(schema.properties);
  return schema;
}

function taskRequestSchema() {
  const schema = exportRequestSchema();
  schema.properties.taskType = {
    type: "string",
    enum: SUPPORTED_TASK_TYPES
  };
  schema.properties.config = {
    type: "object",
    properties: {
      canvas: canvasPatchSchema(),
      fit: fitPatchSchema(),
      transform: transformPatchSchema(),
      audio: audioPatchSchema(),
      stickers: stickerGroupPatchSchema(),
      imageCompose: imageComposeSchema(),
      export: exportPatchSchema()
    },
    additionalProperties: true
  };
  return schema;
}

function imageComposeSchema() {
  return {
    type: "object",
    description: "Image composition settings for taskType=image_compose. Top-level sources[] is the recommended MCP entry; imageCompose.sources is also accepted for native spec patches. In live AI sectionPatch, sources/imagePaths mean whole-list replacement; use objectPatch imageComposeSources for single-source edits.",
    properties: {
      imagePaths: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 16,
        description: "Legacy/native App-visible path list. MCP clients should prefer sources[]. If both imagePaths and sources are present, they must describe the same ordered path list."
      },
      sources: {
        type: "array",
        items: imageComposeSourceSchema(),
        minItems: 2,
        maxItems: 16,
        description: "Image sources in placement order. Use path/appPath/assetPath. The first item maps to cell 1, second to cell 2, and so on. Duplicate paths are rejected by live session patching."
      },
      layoutMode: {
        type: "string",
        enum: [
          "auto_grid",
          "horizontal",
          "vertical",
          "grid_2x2",
          "grid_3x3",
          "grid_4x4",
          "hero_top_2_bottom",
          "hero_bottom_2_top",
          "hero_left_2_right",
          "hero_right_2_left",
          "diagonal_hero",
          "center_focus",
          "diamond_5",
          "hexagon_7",
          "hero_left_3_right",
          "hero_top_3_bottom",
          "center_focus_9",
          "circle_wall",
          "hexagon_10"
        ],
        description: "Composition layout. horizontal/vertical derive one dimension from image aspect ratios when outputRatio is auto."
      },
      outputRatio: {
        type: "string",
        enum: ["auto", "1:1", "4:3", "3:4", "3:2", "2:3", "16:9", "9:16"]
      },
      outputWidth: {
        type: "number",
        description: "Canvas target width. For vertical auto composition this is the controlling dimension."
      },
      outputHeight: {
        type: "number",
        description: "Canvas target height. For horizontal auto composition this is the controlling dimension."
      },
      spacingPx: {
        type: "number",
        minimum: 0,
        maximum: 48,
        description: "Pixel gap between cells for headless/MCP requests."
      },
      spacingDp: {
        type: "number",
        minimum: 0,
        maximum: 48,
        description: "Native session spacing. In headless requests it is treated as pixels when spacingPx is absent."
      },
      paddingPx: {
        type: "number",
        minimum: 0,
        maximum: 96,
        description: "Outer canvas padding in pixels for headless/MCP requests."
      },
      paddingDp: {
        type: "number",
        minimum: 0,
        maximum: 96,
        description: "Native session padding. In headless requests it is treated as pixels when paddingPx is absent."
      },
      backgroundColor: {
        type: "number",
        description: "ARGB int background color, for example 4294967295 for white."
      },
      transparentBackground: {
        type: "boolean",
        description: "When true, export PNG and preserve alpha."
      },
      fitMode: {
        type: "string",
        enum: ["center_crop", "center_inside", "fit_width", "fit_height", "stretch", "custom"],
        description: "Default source fit mode."
      },
      forceOutputSize: {
        type: "boolean",
        description: "When true and outputWidth/outputHeight are both set, force the exact canvas size."
      }
    },
    additionalProperties: true
  };
}

function imageComposeSourceSchema() {
  return {
    type: "object",
    properties: {
      id: { type: "string" },
      appPath: { type: "string" },
      path: { type: "string" },
      assetPath: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      fitMode: { type: "string", enum: ["center_crop", "center_inside", "fit_width", "fit_height", "stretch", "custom"] },
      fit: fitPatchSchema(),
      rotateDegrees: { type: "number" },
      flipHorizontal: { type: "boolean" },
      flipVertical: { type: "boolean" },
      transform: transformPatchSchema(),
      crop: cropTransformSchema(),
      cropTransform: cropTransformSchema()
    },
    anyOf: [
      { required: ["appPath"] },
      { required: ["path"] },
      { required: ["assetPath"] }
    ],
    additionalProperties: true
  };
}

function fitPatchSchema() {
  return {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["center_crop", "center_inside", "fit_width", "fit_height", "stretch", "custom"] },
      custom: cropTransformSchema()
    },
    additionalProperties: true
  };
}

function transformPatchSchema() {
  return {
    type: "object",
    properties: {
      rotateDegrees: { type: "number" },
      flipHorizontal: { type: "boolean" },
      flipVertical: { type: "boolean" }
    },
    additionalProperties: true
  };
}

function cropTransformSchema() {
  return {
    type: "object",
    properties: {
      scale: { type: "number" },
      offsetX: { type: "number" },
      offsetY: { type: "number" },
      translateX: { type: "number" },
      translateY: { type: "number" }
    },
    additionalProperties: true
  };
}

function stickerGroupPatchSchema() {
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { type: "object", additionalProperties: true }
      }
    },
    additionalProperties: true
  };
}

function exportPatchSchema() {
  return {
    type: "object",
    properties: {
      outputName: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
      imageQuality: { type: "number", minimum: 1, maximum: 100 },
      keepAudio: { type: "boolean" },
      fps: { type: "number" },
      preset: { type: "string" },
      quality: { type: "string" },
      bitrateFactor: { type: "number" }
    },
    additionalProperties: true
  };
}

function audioPatchSchema() {
  return {
    type: "object",
    description: "Audio settings for video_edit and video_composition. mute/volume affect original clip audio; external adds one background music/audio track. audio.external enabled=true requires an App-visible local audio path/appPath/assetPath plus durationUs from phone media, asset-library selection, or media probe.",
    properties: {
      mute: { type: "boolean" },
      volume: { type: "number", minimum: 0 },
      external: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          path: {
            type: "string",
            description: "Phone/App-visible audio path. For PC uploads, use the asset-library upload result assetPath/appPath."
          },
          appPath: { type: "string" },
          assetPath: { type: "string" },
          displayName: { type: "string" },
          durationUs: {
            type: "number",
            minimum: 1,
            description: "Required when enabled=true. Use metadata from phone media, asset-library selection, or clipnode_media_probe_sources."
          },
          sourceStartUs: { type: "number", minimum: 0 },
          sourceEndUs: { type: "number", minimum: 0 },
          timelineStartUs: { type: "number", minimum: 0 },
          volume: { type: "number", minimum: 0 },
          endMode: {
            type: "string",
            enum: ["trim_to_video", "loop_to_video", "play_once"],
            description: "trim_to_video clips the source to the output, loop_to_video repeats the selected audio source range, play_once leaves the remaining timeline with original audio or silence."
          }
        },
        additionalProperties: true
      }
    },
    additionalProperties: true
  };
}

function canvasPatchSchema() {
  return {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["original", "custom", "1:1", "4:3", "3:4", "3:2", "2:3", "9:16", "16:9"]
      },
      width: { type: "number" },
      height: { type: "number" },
      background: canvasBackgroundSchema()
    },
    additionalProperties: true
  };
}

function canvasBackgroundSchema() {
  return {
    type: "object",
    description: "Canvas background layer. Supported now: color, self_blur, image. video is reserved and validation rejects it until renderer support lands.",
    properties: {
      mode: {
        type: "string",
        enum: ["color", "self_blur", "image", "video"],
        description: "color uses color only; self_blur uses the foreground frame as a blurred background; image uses sourcePath."
      },
      sourcePath: {
        type: "string",
        description: "Required when mode=image. Use a phone-visible image path from list_images, an asset-library item path, or assetPath/appPath from an asset-library upload."
      },
      sourceType: {
        type: "string",
        enum: ["auto", "image", "video", "gif"]
      },
      fitMode: {
        type: "string",
        enum: ["center_crop", "center_inside", "fit_width", "fit_height"],
        description: "How the background media fills the canvas. Defaults to center_crop."
      },
      blurEnabled: { type: "boolean" },
      blurRadius: {
        type: "number",
        minimum: 0,
        maximum: 50
      },
      opacity: {
        type: "number",
        minimum: 0,
        maximum: 1
      },
      color: {
        type: "string",
        description: "Background base color, for example #000000."
      },
      loop: { type: "boolean" },
      startUs: {
        type: "number",
        minimum: 0
      }
    },
    additionalProperties: true
  };
}

function hlsMp4ExportRequestSchema() {
  return {
    type: "object",
    properties: addTaskMetaProperties({
      requestId: { type: "string" },
      clientJobKey: { type: "string" },
      source: {
        type: "object",
        description: "HLS source. source.videoId must be a positive unique number and source.url must be an http(s) .m3u8 URL.",
        properties: {
          videoId: {
            type: "number",
            description: "Required positive unique id for this HLS URL/job; Date.now() is acceptable."
          },
          url: {
            type: "string",
            description: "Required http(s) m3u8 URL. Only one URL is accepted per job."
          }
        },
        required: ["videoId", "url"]
      },
      export: {
        type: "object",
        properties: {
          outputName: { type: "string" },
          overwrite: { type: "boolean" },
          allowNetworkFallback: { type: "boolean" },
          cleanupSegments: { type: "boolean" },
          targetHeight: { type: "number", enum: [240, 360, 480] },
          keepAudio: { type: "boolean" }
        }
      }
    }),
    required: ["source"]
  };
}

module.exports = {
  SUPPORTED_TASK_TYPES,
  workflowGuide,
  resources,
  prompts,
  tools
};
