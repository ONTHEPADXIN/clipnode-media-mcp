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

function pickByOneBasedIndex(items, index) {
  return items[Math.max(1, index) - 1] || null;
}

function outputNameFor(format, timestamp) {
  const extension = String(format || "png").toLowerCase() === "jpg" ? "jpg" : "png";
  return `clipnode_image_edit_${timestamp}.${extension}`;
}

function buildRequest(options) {
  const {
    taskId,
    timestamp,
    sourcePath,
    imageStickerPath,
    gifStickerPath,
    outputName,
    outputWidth,
    outputHeight,
    fitMode,
    rotateDegrees,
    flipHorizontal,
    flipVertical,
    outputFormat,
    imageQuality,
  } = options;
  const stickers = [
    {
      id: "image_title_text",
      type: "text",
      x: 0.5,
      y: 0.14,
      scale: 1,
      rotation: 0,
      text: {
        content: "ClipNode Image",
        color: "#FFFFFFFF",
        textSize: 46,
      },
      textStyle: {
        bold: true,
        italic: false,
        letterSpacing: 0.02,
        glowEnabled: true,
        glowRadius: 8,
        glowColor: "#FFFFD400",
        strokeEnabled: true,
        strokeWidth: 1,
        strokeColor: "#99000000",
        backgroundColor: "#66000000",
        backgroundCornerRadius: 14,
        horizontalPadding: 24,
        verticalPadding: 12,
      },
      animation: {
        inName: "",
        loopName: "",
        outName: "",
      },
      grid: {
        enabled: false,
        rows: 1,
        columns: 1,
      },
      timeBinding: {
        moveWithTime: false,
      },
    },
  ];

  if (imageStickerPath) {
    stickers.push({
      id: "image_corner_badge",
      type: "image",
      image: { path: imageStickerPath },
      x: 0.18,
      y: 0.82,
      scale: 0.24,
      rotation: -8,
      opacity: 0.9,
      animation: {
        inName: "",
        loopName: "",
        outName: "",
      },
      grid: {
        enabled: true,
        rows: 2,
        columns: 2,
      },
      timeBinding: {
        moveWithTime: false,
      },
    });
  }

  if (gifStickerPath) {
    stickers.push({
      id: "image_gif_badge",
      type: "gif",
      gif: { path: gifStickerPath },
      x: 0.82,
      y: 0.82,
      scale: 0.28,
      rotation: 6,
      opacity: 1,
      animation: {
        inName: "",
        loopName: "",
        outName: "",
      },
      grid: {
        enabled: false,
        rows: 1,
        columns: 1,
      },
      timeBinding: {
        moveWithTime: false,
      },
    });
  }

  return {
    taskId,
    toolRunId: `image_edit_${timestamp}`,
    requestId: `codex_image_edit_${timestamp}`,
    taskType: "image_edit",
    type: "image_edit",
    source: { path: sourcePath },
    specPatch: {
      canvas: {
        preset: "custom",
        width: outputWidth,
        height: outputHeight,
      },
      fit: {
        mode: fitMode,
      },
      transform: {
        rotateDegrees,
        flipHorizontal,
        flipVertical,
      },
      stickers: {
        items: stickers,
      },
      export: {
        format: outputFormat,
        imageQuality,
      },
    },
    export: {
      outputName,
      imageQuality,
      format: outputFormat,
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
  const sourceIndex = Math.max(1, numberArg(argv.index || process.env.CLIPNODE_IMAGE_INDEX, 1));
  const imageStickerIndex = Math.max(1, numberArg(argv.imageStickerIndex || process.env.CLIPNODE_IMAGE_STICKER_INDEX, 2));
  const gifStickerIndex = Math.max(1, numberArg(argv.gifStickerIndex || process.env.CLIPNODE_GIF_STICKER_INDEX, 1));
  const outputWidth = Math.max(1, numberArg(argv.outputWidth || process.env.CLIPNODE_IMAGE_OUTPUT_WIDTH, 1080));
  const outputHeight = Math.max(1, numberArg(argv.outputHeight || process.env.CLIPNODE_IMAGE_OUTPUT_HEIGHT, 1080));
  const fitMode = argv.fitMode || process.env.CLIPNODE_IMAGE_FIT_MODE || "center_inside";
  const rotateDegrees = numberArg(argv.rotateDegrees || process.env.CLIPNODE_IMAGE_ROTATE_DEGREES, 0);
  const flipHorizontal = booleanArg(argv.flipHorizontal, booleanArg(process.env.CLIPNODE_IMAGE_FLIP_HORIZONTAL, false));
  const flipVertical = booleanArg(argv.flipVertical, booleanArg(process.env.CLIPNODE_IMAGE_FLIP_VERTICAL, false));
  const outputFormat = (argv.format || process.env.CLIPNODE_IMAGE_OUTPUT_FORMAT || "png").toLowerCase();
  const imageQuality = Math.max(1, Math.min(100, numberArg(argv.imageQuality || process.env.CLIPNODE_IMAGE_QUALITY, 92)));
  const includeImageSticker = booleanArg(argv.imageSticker, true);
  const includeGifSticker = booleanArg(argv.gifSticker, true);
  const timestamp = Date.now();
  const outputName = argv.outputName || outputNameFor(outputFormat, timestamp);
  const saveTo = argv.saveTo || path.join(os.homedir(), "Downloads", outputName);
  const client = createMcpClient({ baseUrl, pin, session: `codex_image_edit_${timestamp}` });

  try {
    await client.initialize({ name: "codex-clipnode-image-edit-test", version: "1.0.0" });
    log("CONFIGURE", await configure(client));

    const { taskId, begin } = await beginTask(client, {
      title: `${dirKeyword} 图片编辑导出验收`,
      requestId: `codex_image_edit_begin_${timestamp}`,
    });
    log("TASK_BEGIN", { taskId, status: begin.status || begin.task?.status });

    const dirsResponse = await client.callTool("clipnode_media_list_image_dirs", {
      taskId,
      toolRunId: `list_image_dirs_${timestamp}`,
      requestId: `codex_image_edit_dirs_${timestamp}`,
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
      requestId: `codex_image_edit_images_${timestamp}`,
      dirPath,
      page: 1,
      pageSize: Math.max(sourceIndex, imageStickerIndex, gifStickerIndex) + 30,
    }, 45000);
    const items = unwrapList(imagesPage);
    const stillImages = items.filter(isStillImage);
    const gifs = items.filter(isGif);
    const source = pickByOneBasedIndex(stillImages, sourceIndex);
    if (!source) {
      throw new Error(`image index ${sourceIndex} not found in ${dirKeyword}; images=${stillImages.length}`);
    }
    const imageSticker = includeImageSticker ? pickByOneBasedIndex(stillImages, imageStickerIndex) : null;
    const gifSticker = includeGifSticker ? pickByOneBasedIndex(gifs, gifStickerIndex) : null;
    const sourcePath = itemPath(source);
    const imageStickerPath = imageSticker ? itemPath(imageSticker) : "";
    const gifStickerPath = gifSticker ? itemPath(gifSticker) : "";
    log("SELECTED_ASSETS", {
      source: { index: sourceIndex, name: itemName(source), path: sourcePath },
      imageSticker: imageSticker ? { index: imageStickerIndex, name: itemName(imageSticker), path: imageStickerPath } : null,
      gifSticker: gifSticker ? { index: gifStickerIndex, name: itemName(gifSticker), path: gifStickerPath } : null,
    });

    const probe = await client.callTool("clipnode_media_probe_sources", {
      taskId,
      toolRunId: `probe_${timestamp}`,
      requestId: `codex_image_edit_probe_${timestamp}`,
      sources: [{ id: "image_0", path: sourcePath }],
    }, 60000);
    log("PROBE", probe);

    const request = buildRequest({
      taskId,
      timestamp,
      sourcePath,
      imageStickerPath,
      gifStickerPath,
      outputName,
      outputWidth,
      outputHeight,
      fitMode,
      rotateDegrees,
      flipHorizontal,
      flipVertical,
      outputFormat,
      imageQuality,
    });
    log("REQUEST_SUMMARY", {
      outputName,
      saveTo,
      sourcePath,
      outputWidth,
      outputHeight,
      fitMode,
      rotateDegrees,
      flipHorizontal,
      flipVertical,
      outputFormat,
      imageQuality,
      stickerTypes: request.specPatch.stickers.items.map((item) => item.type),
    });

    log("VALIDATE", await validateTask(client, request));
    const { created, jobId } = await createTask(client, request, 60000);
    log("CREATE", created);

    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `codex_image_edit_status_${timestamp}`,
      attempts: 80,
      intervalMs: 1000,
      timeoutMs: 45000,
    });
    if (finalStatus.status !== "success") {
      throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
    }

    await downloadOutput(client, {
      taskId,
      toolRunId: `download_${timestamp}`,
      requestId: `codex_image_edit_download_${timestamp}`,
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
