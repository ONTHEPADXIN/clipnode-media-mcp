const os = require("os");
const path = require("path");
const { createMcpClient, log, sleep } = require("./lib/mcp-client");
const {
  beginTask,
  configure,
  createTask,
  downloadOutput,
  logTaskStatus,
  validateTask,
  waitForJob,
} = require("./lib/job-flow");
const { itemName, itemPath, unwrapList } = require("./lib/media-select");

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
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanArg(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (value === true || value === "true" || value === "1" || value === "yes") {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === "no") {
    return false;
  }
  return fallback;
}

function pickDir(dirs, keyword) {
  const needle = String(keyword || "").toLowerCase();
  return dirs.find((item) => {
    const dirPath = String(item.dirPath || item.path || "").toLowerCase();
    const name = String(item.name || item.displayName || "").toLowerCase();
    return dirPath.includes(needle) || name.includes(needle);
  }) || dirs[0];
}

function isImage(item) {
  const filePath = itemPath(item).toLowerCase();
  return filePath.endsWith(".jpg")
    || filePath.endsWith(".jpeg")
    || filePath.endsWith(".png")
    || filePath.endsWith(".webp")
    || filePath.endsWith(".bmp");
}

function isGif(item) {
  return itemPath(item).toLowerCase().endsWith(".gif");
}

function buildRequest(options) {
  const {
    taskId,
    timestamp,
    sourceGifPath,
    imageStickerPath,
    gifStickerPath,
    outputName,
    outputWidth,
    outputHeight,
    frameSpace,
    animated,
    timeStartUs,
    timeEndUs,
    timingMode,
    gridEnabled,
  } = options;
  const hasTimeRange = timeEndUs > timeStartUs;
  const outputDurationUs = hasTimeRange ? timeEndUs - timeStartUs : 2_200_000;
  const halfDurationUs = Math.max(500_000, Math.floor(outputDurationUs / 2));
  const imageStartUs = timingMode === "half" ? 0 : 0;
  const imageEndUs = timingMode === "half" ? halfDurationUs : 60_000_000;
  const gifStartUs = timingMode === "half" ? halfDurationUs : 0;
  const gifEndUs = timingMode === "half" ? outputDurationUs : 60_000_000;
  const textStartUs = 0;
  const textEndUs = timingMode === "half" ? outputDurationUs : 60_000_000;
  const emptyAnimation = {
    inName: "",
    loopName: "",
    outName: "",
  };
  const imageAnimation = animated
    ? { inName: "FadeHandler", loopName: "BlinkHandler", outName: "FadeHandler" }
    : emptyAnimation;
  const gifAnimation = animated
    ? { inName: "ScaleHandler", loopName: "ShakeHandler", outName: "ScaleHandler" }
    : emptyAnimation;
  const textAnimation = animated
    ? { inName: "ScaleHandler", loopName: "HeartbeatHandler", outName: "FadeHandler" }
    : emptyAnimation;
  return {
    taskId,
    toolRunId: `gif_stickers_${timestamp}`,
    requestId: `codex_gif_stickers_${timestamp}`,
    taskType: "gif_edit",
    type: "gif_edit",
    source: { path: sourceGifPath },
    ...(hasTimeRange ? { timeRange: { startUs: timeStartUs, endUs: timeEndUs } } : {}),
    specPatch: {
      ...(hasTimeRange ? { timeRange: { startUs: timeStartUs, endUs: timeEndUs } } : {}),
      canvas: {
        preset: "custom",
        width: outputWidth,
        height: outputHeight,
      },
      fit: {
        mode: "center_inside",
      },
      gif: {
        backward: false,
        frameSpace,
        outputWidth,
        outputHeight,
      },
      stickers: {
        items: [
          {
            id: "image_corner_badge",
            type: "image",
            startUs: imageStartUs,
            endUs: imageEndUs,
            x: 0.18,
            y: 0.18,
            scale: 0.28,
            rotation: -10,
            image: {
              path: imageStickerPath,
            },
            grid: {
              enabled: gridEnabled,
              rows: gridEnabled ? 2 : 1,
              columns: gridEnabled ? 2 : 1,
              horizontalSpacing: gridEnabled ? 0.18 : 0,
              verticalSpacing: gridEnabled ? 0.18 : 0,
            },
            timeBinding: {
              moveWithTime: false,
            },
            animation: imageAnimation,
          },
          {
            id: "gif_motion_badge",
            type: "gif",
            startUs: gifStartUs,
            endUs: gifEndUs,
            x: 0.82,
            y: 0.22,
            scale: 0.26,
            rotation: 8,
            gif: {
              path: gifStickerPath,
            },
            grid: {
              enabled: false,
              rows: 1,
              columns: 1,
            },
            timeBinding: {
              moveWithTime: false,
            },
            animation: gifAnimation,
          },
          {
            id: "text_check_label",
            type: "text",
            startUs: textStartUs,
            endUs: textEndUs,
            x: 0.5,
            y: 0.88,
            scale: 1.0,
            rotation: 0,
            text: {
              content: gridEnabled ? "GRID STICKER" : (timingMode === "half" ? "HALF TIMING" : "IMAGE + GIF STICKERS"),
              color: "#FFFFFFFF",
              textSize: 24,
            },
            textStyle: {
              bold: true,
              backgroundColor: "#66000000",
              backgroundCornerRadius: 8,
              horizontalPadding: 12,
              verticalPadding: 7,
            },
            grid: {
              enabled: gridEnabled,
              rows: gridEnabled ? 2 : 1,
              columns: gridEnabled ? 3 : 1,
              horizontalSpacing: gridEnabled ? 0.2 : 0,
              verticalSpacing: gridEnabled ? 0.15 : 0,
            },
            timeBinding: {
              moveWithTime: false,
            },
            animation: textAnimation,
          },
        ],
      },
    },
    export: {
      outputName,
      width: outputWidth,
      height: outputHeight,
    },
  };
}

async function main() {
  const argv = argsFromArgv(process.argv);
  const baseUrl = argv.baseUrl || process.env.CLIPNODE_BASE_URL || "";
  const pin = argv.pin || process.env.CLIPNODE_PIN || "";
  const dirKeyword = argv.dir || process.env.CLIPNODE_IMAGE_DIR_KEYWORD || "DCIM";
  const sourceGifIndex = Math.max(1, numberArg(argv.sourceGifIndex || process.env.CLIPNODE_SOURCE_GIF_INDEX, 1));
  const stickerGifIndex = Math.max(1, numberArg(argv.stickerGifIndex || process.env.CLIPNODE_STICKER_GIF_INDEX, 2));
  const imageIndex = Math.max(1, numberArg(argv.imageIndex || process.env.CLIPNODE_IMAGE_STICKER_INDEX, 1));
  const frameSpace = Math.max(0, numberArg(argv.frameSpace || process.env.CLIPNODE_GIF_FRAME_SPACE, 4));
  const outputWidth = Math.max(1, numberArg(argv.outputWidth || process.env.CLIPNODE_GIF_OUTPUT_WIDTH, 480));
  const outputHeight = Math.max(1, numberArg(argv.outputHeight || process.env.CLIPNODE_GIF_OUTPUT_HEIGHT, 480));
  const animated = booleanArg(argv.animated, booleanArg(process.env.CLIPNODE_GIF_STICKERS_ANIMATED, false));
  const gridEnabled = booleanArg(argv.grid, booleanArg(process.env.CLIPNODE_GIF_STICKERS_GRID, false));
  const timingMode = argv.timingMode || process.env.CLIPNODE_GIF_STICKERS_TIMING_MODE || "full";
  const timeStartUs = Math.max(0, numberArg(argv.timeStartUs || process.env.CLIPNODE_GIF_TIME_START_US, 0));
  const timeEndUs = Math.max(0, numberArg(argv.timeEndUs || process.env.CLIPNODE_GIF_TIME_END_US, 0));
  const cancelAfterMs = Math.max(0, numberArg(argv.cancelAfterMs || process.env.CLIPNODE_GIF_CANCEL_AFTER_MS, 0));
  const timestamp = Date.now();
  const suffixes = [
    animated ? "animated" : "",
    gridEnabled ? "grid" : "",
    timingMode === "half" ? "half" : "",
    timeEndUs > timeStartUs ? "trim" : "",
    cancelAfterMs > 0 ? "cancel" : "",
  ].filter(Boolean).join("_");
  const outputName = argv.outputName || `clipnode_gif_stickers${suffixes ? `_${suffixes}` : ""}_${timestamp}.gif`;
  const saveTo = argv.saveTo || path.join(os.homedir(), "Downloads", outputName);
  const client = createMcpClient({ baseUrl, pin, session: `codex_gif_stickers_${timestamp}` });

  try {
    await client.initialize({ name: "codex-clipnode-gif-stickers", version: "1.0.0" });
    log("CONFIGURE", await configure(client));

    const { taskId, begin } = await beginTask(client, {
      title: `${dirKeyword} GIF 添加图片贴纸和GIF贴纸`,
      requestId: `codex_gif_stickers_begin_${timestamp}`,
    });
    log("TASK_BEGIN", { taskId, status: begin.status || begin.task?.status });

    const dirsResponse = await client.callTool("clipnode_media_list_image_dirs", {
      taskId,
      toolRunId: `list_image_dirs_${timestamp}`,
      requestId: `codex_gif_stickers_dirs_${timestamp}`,
    }, 45000);
    const selectedDir = pickDir(unwrapList(dirsResponse), dirKeyword);
    if (!selectedDir) {
      throw new Error("no image directories found");
    }
    const dirPath = selectedDir.dirPath || selectedDir.path || "";
    log("SELECTED_DIR", { name: itemName(selectedDir), path: dirPath });

    const imagesPage = await client.callTool("clipnode_media_list_images", {
      taskId,
      toolRunId: `list_images_${timestamp}`,
      requestId: `codex_gif_stickers_images_${timestamp}`,
      dirPath,
      page: 1,
      pageSize: 80,
    }, 45000);
    const items = unwrapList(imagesPage);
    const gifs = items.filter(isGif);
    const images = items.filter(isImage);
    const sourceGif = gifs[sourceGifIndex - 1];
    const gifSticker = gifs[stickerGifIndex - 1] || gifs[0];
    const imageSticker = images[imageIndex - 1];
    if (!sourceGif || !gifSticker || !imageSticker) {
      throw new Error(`missing sticker test assets: gifs=${gifs.length}, images=${images.length}`);
    }
    const sourceGifPath = itemPath(sourceGif);
    const gifStickerPath = itemPath(gifSticker);
    const imageStickerPath = itemPath(imageSticker);
    log("SELECTED_ASSETS", {
      sourceGif: { name: itemName(sourceGif), path: sourceGifPath },
      imageSticker: { name: itemName(imageSticker), path: imageStickerPath },
      gifSticker: { name: itemName(gifSticker), path: gifStickerPath },
    });

    const request = buildRequest({
      taskId,
      timestamp,
      sourceGifPath,
      imageStickerPath,
      gifStickerPath,
      outputName,
      outputWidth,
      outputHeight,
      frameSpace,
      animated,
      timeStartUs,
      timeEndUs,
      timingMode,
      gridEnabled,
    });
    log("REQUEST_SUMMARY", {
      outputName,
      saveTo,
      outputWidth,
      outputHeight,
      frameSpace,
      animated,
      gridEnabled,
      timingMode,
      timeRange: timeEndUs > timeStartUs ? { startUs: timeStartUs, endUs: timeEndUs } : null,
      cancelAfterMs,
      stickerTypes: request.specPatch.stickers.items.map((item) => item.type),
      stickerTimes: request.specPatch.stickers.items.map((item) => ({
        id: item.id,
        startUs: item.startUs,
        endUs: item.endUs,
        grid: item.grid,
      })),
      stickerAnimations: request.specPatch.stickers.items.map((item) => ({
        id: item.id,
        animation: item.animation,
      })),
    });

    log("VALIDATE", await validateTask(client, request));
    const { created, jobId } = await createTask(client, request, 60000);
    log("CREATE", created);

    if (cancelAfterMs > 0) {
      await sleep(cancelAfterMs);
      const cancelResult = await client.callTool("clipnode_media_cancel_job", {
        taskId,
        toolRunId: `cancel_${timestamp}`,
        requestId: `codex_gif_stickers_cancel_${timestamp}`,
        jobId,
      }, 45000);
      log("CANCEL", cancelResult);
    }

    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `codex_gif_stickers_status_${timestamp}`,
      attempts: 240,
      intervalMs: 1000,
      timeoutMs: 45000,
    });
    if (finalStatus.status !== "success") {
      if (finalStatus.status === "canceled") {
        await logTaskStatus(client, taskId);
        console.log(`DONE canceled ${jobId}`);
        return;
      }
      throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
    }

    await downloadOutput(client, {
      taskId,
      toolRunId: `download_${timestamp}`,
      requestId: `codex_gif_stickers_download_${timestamp}`,
      outputPath: finalStatus.outputPath,
      mediaType: "image",
      saveTo,
    }, 180000);
    await logTaskStatus(client, taskId);
    console.log(`DONE ${saveTo}`);
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
