const os = require("os");
const path = require("path");
const { createMcpClient, log } = require("./lib/mcp-client");
const {
  beginTask,
  configure,
  createTask,
  downloadOutput,
  logTaskStatus,
  validateTask,
  waitForJob,
} = require("./lib/job-flow");
const { firstDirPath, itemName, itemPath, unwrapList } = require("./lib/media-select");

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
  if (!needle) {
    return dirs[0];
  }
  return dirs.find((item) => {
    const dirPath = String(item.dirPath || item.path || "").toLowerCase();
    const name = String(item.name || item.displayName || "").toLowerCase();
    return dirPath.includes(needle) || name.includes(needle);
  }) || dirs[0];
}

function isVideo(item) {
  const filePath = itemPath(item).toLowerCase();
  return filePath.endsWith(".mp4")
    || filePath.endsWith(".mov")
    || filePath.endsWith(".mkv")
    || filePath.endsWith(".webm")
    || filePath.endsWith(".3gp");
}

function isStillImage(item) {
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

function pickVideo(items, index) {
  const videos = items.filter(isVideo);
  return videos[Math.max(1, index) - 1] || videos.find((item) => {
    const size = item.size || item.fileSize || 0;
    return size > 0 && size < 50 * 1024 * 1024;
  }) || videos[0] || null;
}

function pickByOneBasedIndex(items, index) {
  return items[Math.max(1, index) - 1] || null;
}

function buildStickers(options) {
  const {
    durationUs,
    imageStickerPath,
    gifStickerPath,
  } = options;
  const endUs = Math.max(500_000, durationUs);
  const stickers = [
    {
      id: "video_to_gif_text",
      type: "text",
      startUs: 0,
      endUs,
      x: 0.5,
      y: 0.82,
      scale: 1.0,
      rotation: 0,
      text: {
        content: "VIDEO TO GIF",
        color: "#FFFFFFFF",
        textSize: 28,
      },
      textStyle: {
        bold: true,
        strokeEnabled: true,
        strokeWidth: 1,
        strokeColor: "#CC000000",
        glowEnabled: true,
        glowRadius: 6,
        glowColor: "#FFFFD400",
        backgroundColor: "#66000000",
        backgroundCornerRadius: 8,
        horizontalPadding: 10,
        verticalPadding: 6,
      },
      grid: {
        enabled: false,
        rows: 1,
        columns: 1,
      },
      timeBinding: {
        moveWithTime: false,
      },
      animation: {
        inName: "",
        loopName: "",
        outName: "",
      },
    },
  ];
  if (imageStickerPath) {
    stickers.push({
      id: "video_to_gif_image",
      type: "image",
      startUs: 0,
      endUs,
      image: { path: imageStickerPath },
      x: 0.18,
      y: 0.25,
      scale: 0.2,
      rotation: -8,
      grid: {
        enabled: false,
        rows: 1,
        columns: 1,
      },
      timeBinding: {
        moveWithTime: false,
      },
      animation: {
        inName: "",
        loopName: "",
        outName: "",
      },
    });
  }
  if (gifStickerPath) {
    stickers.push({
      id: "video_to_gif_gif",
      type: "gif",
      startUs: 0,
      endUs,
      gif: { path: gifStickerPath },
      x: 0.82,
      y: 0.24,
      scale: 0.24,
      rotation: 5,
      grid: {
        enabled: false,
        rows: 1,
        columns: 1,
      },
      timeBinding: {
        moveWithTime: false,
      },
      animation: {
        inName: "",
        loopName: "",
        outName: "",
      },
    });
  }
  return stickers;
}

function buildRequest(options) {
  const {
    taskId,
    timestamp,
    sourcePath,
    outputName,
    startUs,
    endUs,
    fps,
    frameSpace,
    backward,
    outputWidth,
    outputHeight,
    cropEnabled,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    stickers,
  } = options;
  const specPatch = {};
  if (stickers && stickers.length > 0) {
    specPatch.stickers = { items: stickers };
  }
  return {
    taskId,
    toolRunId: `video_to_gif_${timestamp}`,
    requestId: `codex_video_to_gif_${timestamp}`,
    taskType: "video_to_gif",
    type: "video_to_gif",
    source: { path: sourcePath },
    timeRange: {
      startUs,
      endUs,
    },
    gif: {
      fps,
      frameSpace,
      backward,
      outputWidth,
      outputHeight,
      crop: {
        enabled: cropEnabled,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      },
    },
    ...(Object.keys(specPatch).length > 0 ? { specPatch } : {}),
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
  const dirKeyword = argv.dir || process.env.CLIPNODE_VIDEO_DIR_KEYWORD || "";
  const index = Math.max(1, numberArg(argv.index || process.env.CLIPNODE_VIDEO_INDEX, 1));
  const startUs = Math.max(0, numberArg(argv.startUs || process.env.CLIPNODE_VIDEO_TO_GIF_START_US, 0));
  const endUs = Math.max(startUs + 1, numberArg(argv.endUs || process.env.CLIPNODE_VIDEO_TO_GIF_END_US, 2_000_000));
  const fps = Math.max(1, Math.min(60, numberArg(argv.fps || process.env.CLIPNODE_VIDEO_TO_GIF_FPS, 12)));
  const frameSpace = Math.max(1, numberArg(argv.frameSpace || process.env.CLIPNODE_VIDEO_TO_GIF_FRAME_SPACE, 1));
  const backward = booleanArg(argv.backward, booleanArg(process.env.CLIPNODE_VIDEO_TO_GIF_BACKWARD, false));
  const outputWidth = Math.max(1, numberArg(argv.outputWidth || process.env.CLIPNODE_VIDEO_TO_GIF_OUTPUT_WIDTH, 320));
  const outputHeight = Math.max(1, numberArg(argv.outputHeight || process.env.CLIPNODE_VIDEO_TO_GIF_OUTPUT_HEIGHT, 320));
  const cropEnabled = booleanArg(argv.crop, booleanArg(process.env.CLIPNODE_VIDEO_TO_GIF_CROP, true));
  const cropX = Math.max(0, Math.min(1, numberArg(argv.cropX || process.env.CLIPNODE_VIDEO_TO_GIF_CROP_X, 0.1)));
  const cropY = Math.max(0, Math.min(1, numberArg(argv.cropY || process.env.CLIPNODE_VIDEO_TO_GIF_CROP_Y, 0.1)));
  const cropWidth = Math.max(0.01, Math.min(1, numberArg(argv.cropWidth || process.env.CLIPNODE_VIDEO_TO_GIF_CROP_WIDTH, 0.8)));
  const cropHeight = Math.max(0.01, Math.min(1, numberArg(argv.cropHeight || process.env.CLIPNODE_VIDEO_TO_GIF_CROP_HEIGHT, 0.8)));
  const includeStickers = booleanArg(argv.stickers, booleanArg(process.env.CLIPNODE_VIDEO_TO_GIF_STICKERS, false));
  const imageDirKeyword = argv.imageDir || process.env.CLIPNODE_IMAGE_DIR_KEYWORD || "DCIM";
  const imageStickerIndex = Math.max(1, numberArg(argv.imageStickerIndex || process.env.CLIPNODE_IMAGE_STICKER_INDEX, 1));
  const gifStickerIndex = Math.max(1, numberArg(argv.gifStickerIndex || process.env.CLIPNODE_GIF_STICKER_INDEX, 1));
  const timestamp = Date.now();
  const suffix = [backward ? "backward" : "clip", includeStickers ? "stickers" : ""].filter(Boolean).join("_");
  const outputName = argv.outputName || `clipnode_video_to_gif_${suffix}_${timestamp}.gif`;
  const saveTo = argv.saveTo || path.join(os.homedir(), "Downloads", outputName);
  const client = createMcpClient({ baseUrl, pin, session: `codex_video_to_gif_${timestamp}` });

  try {
    await client.initialize({ name: "codex-clipnode-video-to-gif-test", version: "1.0.0" });
    log("CONFIGURE", await configure(client));

    const { taskId, begin } = await beginTask(client, {
      title: "测试视频转 GIF 导出",
      requestId: `codex_video_to_gif_begin_${timestamp}`,
    });
    log("TASK_BEGIN", { taskId, status: begin.status || begin.task?.status });

    const dirsResponse = await client.callTool("clipnode_media_list_video_dirs", {
      taskId,
      toolRunId: `list_video_dirs_${timestamp}`,
      requestId: `codex_video_to_gif_dirs_${timestamp}`,
    }, 45000);
    const dirs = unwrapList(dirsResponse);
    const selectedDir = pickDir(dirs, dirKeyword);
    const dirPath = selectedDir ? selectedDir.dirPath || selectedDir.path || "" : firstDirPath(dirsResponse);
    if (!dirPath) {
      throw new Error("no video directories found");
    }
    log("SELECTED_DIR", { name: itemName(selectedDir), path: dirPath });

    const videosPage = await client.callTool("clipnode_media_list_videos", {
      taskId,
      toolRunId: `list_videos_${timestamp}`,
      requestId: `codex_video_to_gif_videos_${timestamp}`,
      dirPath,
      page: 1,
      pageSize: Math.max(index, 30),
    }, 45000);
    const selectedVideo = pickVideo(unwrapList(videosPage), index);
    if (!selectedVideo || !itemPath(selectedVideo)) {
      throw new Error(`video index ${index} not found in ${dirKeyword || dirPath}`);
    }
    const sourcePath = itemPath(selectedVideo);
    log("SELECTED_VIDEO", {
      index,
      name: itemName(selectedVideo),
      path: sourcePath,
      size: selectedVideo.size || selectedVideo.fileSize || 0,
      durationUs: selectedVideo.durationUs || 0,
    });

    const probe = await client.callTool("clipnode_media_probe_sources", {
      taskId,
      toolRunId: `probe_${timestamp}`,
      requestId: `codex_video_to_gif_probe_${timestamp}`,
      sources: [{ id: "video_0", path: sourcePath }],
    }, 60000);
    log("PROBE", probe);

    let imageStickerPath = "";
    let gifStickerPath = "";
    if (includeStickers) {
      const imageDirsResponse = await client.callTool("clipnode_media_list_image_dirs", {
        taskId,
        toolRunId: `list_image_dirs_${timestamp}`,
        requestId: `codex_video_to_gif_image_dirs_${timestamp}`,
      }, 45000);
      const selectedImageDir = pickDir(unwrapList(imageDirsResponse), imageDirKeyword);
      if (selectedImageDir) {
        const imageDirPath = selectedImageDir.dirPath || selectedImageDir.path || "";
        const imagesPage = await client.callTool("clipnode_media_list_images", {
          taskId,
          toolRunId: `list_images_${timestamp}`,
          requestId: `codex_video_to_gif_images_${timestamp}`,
          dirPath: imageDirPath,
          page: 1,
          pageSize: Math.max(imageStickerIndex, gifStickerIndex, 30),
        }, 45000);
        const imageItems = unwrapList(imagesPage);
        const imageSticker = pickByOneBasedIndex(imageItems.filter(isStillImage), imageStickerIndex);
        const gifSticker = pickByOneBasedIndex(imageItems.filter(isGif), gifStickerIndex);
        imageStickerPath = imageSticker ? itemPath(imageSticker) : "";
        gifStickerPath = gifSticker ? itemPath(gifSticker) : "";
        log("SELECTED_STICKERS", {
          imageDir: { name: itemName(selectedImageDir), path: imageDirPath },
          imageSticker: imageSticker ? { name: itemName(imageSticker), path: imageStickerPath } : null,
          gifSticker: gifSticker ? { name: itemName(gifSticker), path: gifStickerPath } : null,
        });
      }
    }

    const stickers = includeStickers
      ? buildStickers({
        durationUs: endUs - startUs,
        imageStickerPath,
        gifStickerPath,
      })
      : [];

    const request = buildRequest({
      taskId,
      timestamp,
      sourcePath,
      outputName,
      startUs,
      endUs,
      fps,
      frameSpace,
      backward,
      outputWidth,
      outputHeight,
      cropEnabled,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      stickers,
    });
    log("REQUEST_SUMMARY", {
      outputName,
      saveTo,
      sourcePath,
      timeRange: { startUs, endUs },
      fps,
      frameSpace,
      backward,
      outputWidth,
      outputHeight,
      crop: request.gif.crop,
      stickerTypes: stickers.map((item) => item.type),
    });

    log("VALIDATE", await validateTask(client, request));
    const { created, jobId } = await createTask(client, request, 60000);
    log("CREATE", created);

    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `codex_video_to_gif_status_${timestamp}`,
      attempts: 160,
      intervalMs: 1000,
      timeoutMs: 45000,
    });
    if (finalStatus.status !== "success") {
      throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
    }

    await downloadOutput(client, {
      taskId,
      toolRunId: `download_${timestamp}`,
      requestId: `codex_video_to_gif_download_${timestamp}`,
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
