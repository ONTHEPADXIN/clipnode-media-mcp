const os = require("os");
const path = require("path");
const { createMcpClient, log } = require("./lib/mcp-client");
const {
  beginTask,
  configure,
  createTask,
  downloadOutput,
  logTaskStatus,
  validateTaskWithSuggestedFixes,
  waitForJob,
} = require("./lib/job-flow");
const {
  itemName,
  itemPath,
  listRecommendedTransitions,
  unwrapList,
} = require("./lib/media-select");

function argsFromArgv(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const current = argv[i];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function numberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanArg(value, fallback) {
  if (typeof value === "undefined") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function optionValue(argv, key, envKey) {
  if (Object.prototype.hasOwnProperty.call(argv, key)) {
    return argv[key];
  }
  if (envKey && Object.prototype.hasOwnProperty.call(process.env, envKey)) {
    return process.env[envKey];
  }
  return undefined;
}

function numberOption(argv, key, envKey, fallback) {
  const value = optionValue(argv, key, envKey);
  return typeof value === "undefined" ? fallback : numberArg(value, fallback);
}

function stringOption(argv, key, envKey, fallback) {
  const value = optionValue(argv, key, envKey);
  return typeof value === "undefined" ? fallback : String(value);
}

function booleanOption(argv, key, envKey, fallback) {
  const value = optionValue(argv, key, envKey);
  return typeof value === "undefined" ? fallback : booleanArg(value, fallback);
}

function pickDir(dirs, keyword) {
  const needle = String(keyword || "").toLowerCase();
  if (!needle) {
    return dirs[0];
  }
  return dirs.find((item) => {
    const name = String(itemName(item) || "").toLowerCase();
    const dirPath = String(item.dirPath || item.path || "").toLowerCase();
    return name.includes(needle) || dirPath.includes(needle);
  }) || dirs[0];
}

function isImageOrGif(item) {
  const filePath = itemPath(item).toLowerCase();
  return filePath.endsWith(".jpg")
    || filePath.endsWith(".jpeg")
    || filePath.endsWith(".png")
    || filePath.endsWith(".webp")
    || filePath.endsWith(".bmp")
    || filePath.endsWith(".gif");
}

function seededShuffle(items, seed) {
  const shuffled = items.slice();
  let state = seed >>> 0;
  function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  }
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function firstArrayValue(value, fallback) {
  return Array.isArray(value) && value.length > 0 ? value[0] : fallback;
}

function templateDefaults(template) {
  const config = template?.config || {};
  const sourceDefaults = config.sourceDefaults || {};
  const transitionDefaults = config.transitionDefaults || {};
  const canvas = config.canvas || {};
  const exportConfig = config.export || {};
  return {
    width: canvas.width || 1920,
    height: canvas.height || 1080,
    imageDurationUs: sourceDefaults.durationUs || sourceDefaults.trim?.endUs || 3_000_000,
    transitionDurationUs: transitionDefaults.durationUs || 800_000,
    fps: exportConfig.fps || 24,
    bitrateFactor: exportConfig.bitrateFactor || 0.5,
    fitMode: sourceDefaults.fit?.mode || "fit_center",
    transitionTag: firstArrayValue(transitionDefaults.tags, ""),
    quality: exportConfig.quality || exportConfig.preset || "balanced",
    keepAudio: exportConfig.keepAudio === true,
    templateName: template?.name || "Image Memory Video",
  };
}

function buildSources(images, options) {
  return images.map((item, index) => ({
    id: `memory_clip_${index}`,
    path: itemPath(item),
    durationUs: options.imageDurationUs,
    trim: { startUs: 0, endUs: options.imageDurationUs },
    fit: { mode: options.fitMode },
    audio: { mute: !options.keepAudio, volume: options.keepAudio ? 1 : 0 },
  }));
}

function buildTransitions(sources, transitionPool, options) {
  return sources.slice(0, -1).map((source, index) => {
    const transition = transitionPool[index % transitionPool.length];
    return {
      id: `memory_transition_${index}`,
      fromClipId: source.id,
      toClipId: sources[index + 1].id,
      assetPath: transition.assetPath,
      durationUs: options.transitionDurationUs,
      audioCrossFade: options.keepAudio && options.audioCrossFade,
    };
  });
}

function buildTextSticker(id, text, startUs, endUs, y, options = {}) {
  return {
    id,
    type: "text",
    startUs,
    endUs,
    x: 0.5,
    y,
    scale: options.scale || 2.2,
    rotation: 0,
    text: {
      content: text,
      color: options.color || "#FFFFFFFF",
      textSize: options.textSize || 42,
    },
    textStyle: {
      bold: true,
      strokeEnabled: true,
      strokeWidth: 2,
      strokeColor: "#DD000000",
      backgroundColor: options.backgroundColor || "#66000000",
      backgroundCornerRadius: 10,
      horizontalPadding: 18,
      verticalPadding: 10,
    },
    grid: { enabled: false, rows: 1, columns: 1 },
    timeBinding: { moveWithTime: false },
    animation: {
      inName: options.inName || "FadeHandler",
      loopName: options.loopName || "",
      outName: options.outName || "FadeHandler",
    },
  };
}

function buildRequest(taskId, timestamp, options, images, transitionPool) {
  const sources = buildSources(images, options);
  const transitions = buildTransitions(sources, transitionPool, options);
  const timelineDurationUs = sources.length * options.imageDurationUs
    - transitions.length * options.transitionDurationUs;
  const stickers = [];
  if (options.titleText) {
    stickers.push(buildTextSticker(
      "memory_title",
      options.titleText,
      0,
      Math.min(timelineDurationUs, options.imageDurationUs * 2),
      0.12,
      { scale: 2.4, loopName: "ScaleHandler" }
    ));
  }
  if (options.endingText) {
    stickers.push(buildTextSticker(
      "memory_ending",
      options.endingText,
      Math.max(0, timelineDurationUs - options.imageDurationUs * 2),
      timelineDurationUs,
      0.82,
      { scale: 2.1, backgroundColor: "#77000000" }
    ));
  }
  return {
    taskId,
    toolRunId: `image_memory_video_export_${timestamp}`,
    requestId: `clipnode_image_memory_video_export_${timestamp}`,
    taskType: "video_composition",
    type: "video_composition",
    templateId: options.templateId,
    templateName: options.templateName,
    collectionName: options.collectionName || options.dirKeyword,
    sources,
    transitions,
    specPatch: {
      canvas: { preset: "custom", width: options.width, height: options.height },
      audio: { mute: !options.keepAudio, volume: options.keepAudio ? 1 : 0 },
      stickers: { items: stickers },
      export: {
        fps: options.fps,
        keepAudio: options.keepAudio,
        bitrateFactor: options.bitrateFactor,
      },
    },
    export: {
      outputName: options.outputName,
      quality: options.quality,
      fps: options.fps,
      keepAudio: options.keepAudio,
      bitrateFactor: options.bitrateFactor,
      width: options.width,
      height: options.height,
    },
  };
}

async function main() {
  const argv = argsFromArgv(process.argv);
  const timestamp = Date.now();
  const baseUrl = argv.baseUrl || process.env.CLIPNODE_BASE_URL || "";
  const pin = argv.pin || process.env.CLIPNODE_PIN || "";
  const templateId = stringOption(argv, "templateId", "CLIPNODE_TEMPLATE_ID", "image_memory_video");
  const outputName = argv.outputName || `clipnode_image_memory_video_${timestamp}.mp4`;
  const client = createMcpClient({ baseUrl, pin, session: `image_memory_video_${timestamp}` });

  try {
    await client.initialize({ name: "clipnode-image-memory-video-example", version: "1.0.0" });
    log("CONFIGURE", await configure(client));

    const templateList = await client.callTool("clipnode_media_list_templates", {
      taskType: "video_composition",
      query: "memory",
      limit: 10,
    }, 30000);
    log("TEMPLATE_LIST", {
      returned: templateList.returned,
      ids: (templateList.items || []).map((item) => item.id),
    });
    const templateResponse = await client.callTool("clipnode_media_get_template", {
      id: templateId,
    }, 30000);
    const template = templateResponse.template;
    const defaults = templateDefaults(template);
    const options = {
      templateId,
      templateName: defaults.templateName,
      dirKeyword: stringOption(argv, "dir", "CLIPNODE_IMAGE_DIR_KEYWORD", "DCIM"),
      collectionName: stringOption(argv, "collectionName", "CLIPNODE_COLLECTION_NAME", ""),
      count: numberOption(argv, "count", "CLIPNODE_IMAGE_COUNT", 10),
      width: numberOption(argv, "width", "CLIPNODE_OUTPUT_WIDTH", defaults.width),
      height: numberOption(argv, "height", "CLIPNODE_OUTPUT_HEIGHT", defaults.height),
      imageDurationUs: numberOption(argv, "imageDurationUs", "CLIPNODE_IMAGE_DURATION_US", defaults.imageDurationUs),
      transitionDurationUs: numberOption(argv, "transitionDurationUs", "CLIPNODE_TRANSITION_DURATION_US", defaults.transitionDurationUs),
      fps: numberOption(argv, "fps", "CLIPNODE_OUTPUT_FPS", defaults.fps),
      bitrateFactor: numberOption(argv, "bitrateFactor", "CLIPNODE_BITRATE_FACTOR", defaults.bitrateFactor),
      fitMode: stringOption(argv, "fitMode", "CLIPNODE_IMAGE_FIT_MODE", defaults.fitMode),
      transitionTag: stringOption(argv, "transitionTag", "CLIPNODE_TRANSITION_TAG", defaults.transitionTag),
      quality: stringOption(argv, "quality", "CLIPNODE_EXPORT_QUALITY", defaults.quality),
      keepAudio: booleanOption(argv, "keepAudio", "CLIPNODE_KEEP_AUDIO", defaults.keepAudio),
      audioCrossFade: booleanOption(argv, "audioCrossFade", "CLIPNODE_AUDIO_CROSS_FADE", false),
      titleText: stringOption(argv, "titleText", "CLIPNODE_TITLE_TEXT", "Memory Video"),
      endingText: stringOption(argv, "endingText", "CLIPNODE_ENDING_TEXT", "Created with ClipNode"),
      applyWarningFixes: booleanOption(argv, "applyWarningFixes", "CLIPNODE_APPLY_WARNING_FIXES", true),
      outputName,
      saveTo: argv.saveTo || path.join(os.homedir(), "Downloads", outputName),
    };
    log("SELECTED_TEMPLATE", {
      id: template.id,
      name: template.name,
      taskType: template.taskType,
      tags: template.tags || [],
      defaults,
    });

    const { taskId } = await beginTask(client, {
      title: `${options.dirKeyword} ${options.count}个图片/GIF生成回忆视频`,
      requestId: `clipnode_image_memory_begin_${timestamp}`,
    });
    log("TASK_BEGIN", { taskId });

    const dirsResponse = await client.callTool("clipnode_media_list_image_dirs", {
      taskId,
      toolRunId: `list_image_dirs_${timestamp}`,
      requestId: `clipnode_image_memory_dirs_${timestamp}`,
    }, 45000);
    const selectedDir = pickDir(unwrapList(dirsResponse), options.dirKeyword);
    if (!selectedDir) {
      throw new Error("No image directory found.");
    }
    const dirPath = selectedDir.dirPath || selectedDir.path || "";
    log("SELECTED_DIR", {
      name: itemName(selectedDir),
      path: dirPath,
      count: selectedDir.count || selectedDir.fileCount || 0,
    });

    const imagesResponse = await client.callTool("clipnode_media_list_images", {
      taskId,
      toolRunId: `list_images_${timestamp}`,
      requestId: `clipnode_image_memory_images_${timestamp}`,
      dirPath,
      page: 1,
      pageSize: Math.max(80, options.count * 3),
    }, 45000);
    const images = unwrapList(imagesResponse).filter(isImageOrGif).slice(0, options.count);
    if (images.length < options.count) {
      throw new Error(`Need ${options.count} images/GIFs, found ${images.length}.`);
    }
    log("SELECTED_IMAGES", images.map((item, index) => ({
      index,
      name: itemName(item),
      path: itemPath(item),
      size: item.size || item.fileSize || 0,
    })));

    const transitionSelection = await listRecommendedTransitions(client, {
      taskId,
      timestamp,
      transitionTag: options.transitionTag,
      requestIdPrefix: "clipnode_image_memory_transitions",
      limit: 100,
    });
    const transitionPoolRaw = transitionSelection.items;
    if (transitionPoolRaw.length <= 0) {
      throw new Error(`No transitions found${options.transitionTag ? ` for tag ${options.transitionTag}` : ""}.`);
    }
    const transitionPool = seededShuffle(transitionPoolRaw, timestamp)
      .slice(0, Math.min(options.count - 1, transitionPoolRaw.length));
    log("SELECTED_TRANSITIONS", {
      source: transitionSelection.source,
      filter: transitionSelection.filter,
      requestedTags: transitionSelection.requestedTags,
      items: transitionPool.map((item) => ({
        name: item.name,
        assetPath: item.assetPath,
        group: item.group,
        tags: item.tags,
      })),
    });

    const request = buildRequest(taskId, timestamp, options, images, transitionPool);
    log("REQUEST_SUMMARY", {
      templateId: request.templateId,
      templateName: request.templateName,
      outputName: options.outputName,
      saveTo: options.saveTo,
      sourceCount: request.sources.length,
      transitionCount: request.transitions.length,
      stickerCount: request.specPatch.stickers.items.length,
      canvas: request.specPatch.canvas,
      fitMode: options.fitMode,
      transitionTag: options.transitionTag || "autoSelectable",
      keepAudio: options.keepAudio,
      bitrateFactor: options.bitrateFactor,
      applyWarningFixes: options.applyWarningFixes,
    });

    const validationResult = await validateTaskWithSuggestedFixes(client, request, {
      applyWarningFixes: options.applyWarningFixes,
      maxFixes: 3,
      timeoutMs: 60000,
    });
    log("VALIDATE_HISTORY", validationResult.history.map((item) => ({
      attempt: item.attempt,
      warnings: item.warningCodes,
      suggestedFixId: item.suggestedFixId,
      suggestedFixPatch: item.suggestedFixPatch,
      readableText: item.planSummary?.readableText,
      userConfirmText: item.planSummary?.userConfirmText,
    })));
    log("VALIDATE_FINAL", {
      ok: validationResult.validation.ok,
      warnings: (validationResult.validation.warnings || []).map((item) => item.code),
      aiDecision: validationResult.validation.aiDecision,
      planSummary: validationResult.validation.planSummary,
    });

    const { created, jobId } = await createTask(client, request, 60000);
    log("CREATE", created);

    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `clipnode_image_memory_status_${timestamp}`,
      attempts: 180,
      intervalMs: 3000,
      timeoutMs: 45000,
      summarize: (latest) => ({
        jobId: latest.jobId,
        status: latest.status,
        stage: latest.stage,
        progress: latest.progress,
        frameCount: latest.frameCount,
        durationUs: latest.durationUs,
        outputPath: latest.outputPath,
        error: latest.error,
        transitionAssets: latest.timelineSummary?.transitions?.map((item) => item.assetPath),
      }),
    });
    if (finalStatus.status !== "success") {
      throw new Error(`Job did not succeed: ${JSON.stringify(finalStatus)}`);
    }

    await downloadOutput(client, {
      taskId,
      toolRunId: `download_${timestamp}`,
      requestId: `clipnode_image_memory_download_${timestamp}`,
      outputPath: finalStatus.outputPath,
      mediaType: "video",
      saveTo: options.saveTo,
    }, 240000);

    await logTaskStatus(client, taskId);
    console.log(`DONE ${options.saveTo}`);
  } finally {
    try {
      client.close();
    } catch {}
  }
}

main().catch((error) => {
  console.error(`ERROR ${error.stack || error.message}`);
  process.exitCode = 1;
});
