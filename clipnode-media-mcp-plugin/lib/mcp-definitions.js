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
5. Upload PC files before probing them. Use returned fileId/appPath as the source reference.
6. For phone media, list video/image dirs and files first, then use returned path in probe/edit/download calls.
7. For prepared user materials, use clipnode_asset_list_themes, clipnode_asset_search, or clipnode_asset_select_sources before building a template, video_composition, or image_compose request.
8. Use asset-library item path/assetPath as the source path. For video/image composition, clipnode_asset_select_sources returns sources[] that can be merged directly into the task request.
9. Probe sources before deciding crop, trim, canvas, transition duration, or audio behavior.
10. Build one task request using taskType plus source/sources, config/specPatch, transitions, and export.
11. Validate with clipnode_media_validate_task before clipnode_media_create_task. Validation returns validationId and planHash for the exact request.
12. Create must use the same request plus validationId/validationPlanHash. The bridge can attach them automatically after a successful validate in the same session.
13. If validation returns suggestedFix, apply it and validate again. If needConfirmation is true, ask the user before creating the task and pass confirmationAccepted only after the user confirms.
14. Create one task at a time. ClipNode uses a single local media queue.
15. For multi-tool flows, call clipnode_task_begin once and pass taskId to every later tool.
16. Poll clipnode_media_get_job_status and/or clipnode_task_get_status until success, failed, or canceled.
17. Download the output when the user needs the result on the PC.

Task routing:
- video_edit: one video, crop/fit/rotate/mute/stickers/export settings.
- video_compress: one video, size-first export with bitrate/resolution/fps/audio controls.
- video_composition: 视频合成. Compose multiple video clips into one video with optional transition animations and audio cross-fade.
- gif_edit: one GIF edit. Current headless support includes trim range, frame-order reversal, frame sampling, normalized crop, output sizing, fit/rotate/flip, transparent-frame preservation, and text/image/GIF stickers rendered on each encoded frame.
- video_to_gif: one video to GIF. Current headless support includes trim range, fps, frame sampling, frame-order reversal, normalized crop, output sizing, and text/image/GIF stickers rendered on each encoded frame. Sticker startUs/endUs use the output GIF timeline. Subtitle rendering is not part of this mode yet.
- image_edit: one static image. Current headless support includes canvas/fit, custom crop transform, rotate/flip, text/image/GIF stickers rendered at time 0, and JPG/PNG export. For visible static stickers, prefer empty animation.inName/outName; use image.path and gif.path for sticker assets.
- image_compose: 2-16 static images composed into one image with GL. Supports horizontal, vertical, auto grid, fixed grid, hero, diamond, circle, and hexagon layouts; per-source fit/rotate/flip/custom crop; spacing/padding; background color/alpha; and JPG/PNG export. Use top-level sources[] for MCP requests.
- hls_mp4_export: one m3u8 URL to one MP4 job.

Planned task routing:
- subtitle: planned.

Safety rules:
- Do not create complex video tasks before validation.
- If create_task returns validation_required, validation_expired, or validation_request_changed, call validate_task again with the final request and retry create with the returned validationId.
- Do not invent transition or sticker animation names outside capabilities/templates.
- For automatic transitions, prefer verified or autoSelectable catalog items.
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
    description: "Use near the start of every media task. Returns supported task types, limits, workflow capabilities, transition catalog, sticker capabilities, HLS options, and templates so the AI does not guess unsupported edits.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "clipnode_media_list_transitions",
    description: "List and filter ClipNode transition assets by tag, group, status, query, or autoSelectable. Prefer this over scanning the full capabilities payload when choosing a video_composition transition.",
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
        status: {
          type: "string",
          enum: ["verified", "needs_tune", "needs_texture"]
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
    name: "clipnode_media_probe_sources",
    description: "Probe source metadata after upload or source selection and before building crop, trim, canvas, transition, or audio parameters. If any source fails, do not create a task; explain the failed source and ask for a replacement or permission fix.",
    inputSchema: {
      type: "object",
      properties: addTaskMetaProperties({
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              mediaId: { type: "string" },
              fileId: { type: "string" },
              appPath: { type: "string" },
              path: { type: "string" },
              url: { type: "string" },
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
              { required: ["mediaId"] },
              { required: ["fileId"] },
              { required: ["appPath"] },
              { required: ["path"] },
              { required: ["url"] }
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
    description: "Upload one local PC media file to ClipNode before probing or editing it. For a temporary upload, pass only localPath/fileName. To save it into the asset library, pass target.kind=asset_library plus target.type and target.themeName.",
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
    description: "List ClipNode asset-library themes under image/video/audio. Use this before choosing reusable prepared user materials for a template or batch composition.",
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
    description: "List prepared asset-library items in a theme. Use returned path/assetPath when filling template slots or building media tasks.",
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
    description: "Search prepared asset-library items by type, theme, or query. Use this when the user refers to saved materials by theme or text.",
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
    description: "Select prepared asset-library items and return media-task source entries. Use this to turn a saved video/image theme into video_composition.sources or image_compose.sources, or to choose an audio asset for specPatch.audio.external.",
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
    description: "Validate a media task without exporting. Use this after capabilities and source probing, and before clipnode_media_create_task. Follow aiDecision.action for the next tool call. Use planSummary.readableText and timelineSummary to explain the planned edit. If suggestedFix is returned, apply it and validate again; if needConfirmation is true, ask the user before creating the task.",
    inputSchema: taskRequestSchema()
  },
  {
    name: "clipnode_media_create_task",
    description: "Create one validated ClipNode serial-queue media task. Use only after clipnode_media_validate_task returns ok and no unresolved confirmation is needed. Poll job status until a terminal state before starting another task.",
    inputSchema: taskRequestSchema()
  },
  {
    name: "clipnode_media_export_m3u8_to_mp4",
    description: "Create one complete HLS job that exports a single m3u8 URL to a final MP4 file. Use for hls_mp4_export only; do not pass sources[] or multiple URLs. Poll the returned jobId until success, failed, or canceled.",
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
    description: "List built-in reference templates before composing common edits such as 9:16 crop, self-blur canvas, video compression, soft video composition, album memory video, image compose, HLS export, GIF edit, or rich stickers. Merge the chosen template config with the user's request, then validate.",
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
    description: "Get one built-in reference template by id. Use its taskType and config as a starting point only; merge with user intent and capabilities, then call validate_task before creating a task.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }
      },
      required: ["id"]
    }
  }
];

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
        properties: {
          fileId: { type: "string" },
          appPath: { type: "string" },
          path: { type: "string" }
        }
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            fileId: { type: "string" },
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
    description: "Image composition settings for taskType=image_compose. Top-level sources[] is the recommended MCP entry; imageCompose.sources is also accepted for native spec patches.",
    properties: {
      imagePaths: {
        type: "array",
        items: { type: "string" },
        description: "Legacy/native path list. MCP clients should prefer sources[]."
      },
      sources: {
        type: "array",
        items: imageComposeSourceSchema(),
        description: "Image sources in placement order. The first item maps to cell 1, second to cell 2, and so on."
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
        enum: ["auto", "1:1", "4:3", "3:4", "16:9", "9:16"]
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
        maximum: 56,
        description: "Pixel gap between cells for headless/MCP requests."
      },
      spacingDp: {
        type: "number",
        minimum: 0,
        maximum: 56,
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
      fileId: { type: "string" },
      appPath: { type: "string" },
      path: { type: "string" },
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
      { required: ["fileId"] },
      { required: ["appPath"] },
      { required: ["path"] }
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
    description: "Audio settings for video_edit and video_composition. mute/volume affect original clip audio; external adds one background music/audio track.",
    properties: {
      mute: { type: "boolean" },
      volume: { type: "number", minimum: 0 },
      external: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          path: {
            type: "string",
            description: "Phone/app-visible audio path, content Uri, or uploaded appPath."
          },
          displayName: { type: "string" },
          durationUs: { type: "number", minimum: 0 },
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
      preset: { type: "string" },
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
        description: "Required when mode=image. Use a phone-visible image path from list_images or an appPath/file path resolved by upload/probe."
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
        properties: {
          videoId: { type: "number" },
          url: { type: "string" }
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
