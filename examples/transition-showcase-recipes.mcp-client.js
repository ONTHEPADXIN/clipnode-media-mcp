const os = require("os");
const path = require("path");
const { createMcpClient, log, sleep } = require("./lib/mcp-client");
const {
  beginTask,
  configure,
  createTask,
  downloadOutput,
  validateTaskWithSuggestedFixes,
  waitForJob,
} = require("./lib/job-flow");
const { listRecommendedTransitions, unwrapList } = require("./lib/media-select");

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const keyValue = raw.slice(2);
    const eqIndex = keyValue.indexOf("=");
    if (eqIndex >= 0) {
      result[keyValue.slice(0, eqIndex)] = keyValue.slice(eqIndex + 1);
      continue;
    }
    const next = argv[i + 1];
    result[keyValue] = next && !next.startsWith("--") ? argv[++i] : "true";
  }
  return result;
}

function stringOption(args, key, envKey, fallback) {
  const value = args[key] || process.env[envKey];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberOption(args, key, envKey, fallback) {
  const value = Number(args[key] || process.env[envKey]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function firstImages(items, count) {
  return items.filter((item) => {
    const filePath = String(item.path || item.assetPath || item.filePath || "").toLowerCase();
    return filePath.endsWith(".jpg")
      || filePath.endsWith(".jpeg")
      || filePath.endsWith(".png")
      || filePath.endsWith(".webp")
      || filePath.endsWith(".bmp")
      || filePath.endsWith(".gif");
  }).slice(0, count);
}

function buildSources(images, transitionCount, clipDurationUs, transitionDurationUs) {
  const clipCount = transitionCount + 1;
  return Array.from({ length: clipCount }, (_, index) => {
    const item = images[index % images.length];
    const durationUs = index === 0
      ? clipDurationUs + transitionDurationUs
      : index === clipCount - 1
        ? transitionDurationUs + clipDurationUs
        : clipDurationUs + transitionDurationUs * 2;
    return {
      id: `clip_${index}`,
      path: item.path || item.assetPath || item.filePath,
      durationUs,
      trim: { startUs: 0, endUs: durationUs },
      fit: { mode: "center_crop" },
      audio: { mute: true, volume: 0 },
    };
  });
}

function buildTransitions(sources, transitionPool, transitionDurationUs) {
  return sources.slice(0, -1).map((source, index) => {
    const transition = transitionPool[index % transitionPool.length];
    return {
      id: `transition_${index}`,
      fromClipId: source.id,
      toClipId: sources[index + 1].id,
      assetPath: transition.assetPath,
      durationUs: transitionDurationUs,
      audioCrossFade: false,
    };
  });
}

function buildLogoStickers(logoAssetPath, totalDurationUs) {
  return [
    {
      id: "clipnode_logo_top_right",
      type: "image",
      startUs: 0,
      endUs: totalDurationUs,
      image: { path: logoAssetPath },
      x: 0.945,
      y: 0.096,
      scale: 0.5,
      rotation: 0,
      opacity: 0.96,
      grid: { enabled: false, rows: 1, columns: 1 },
      timeBinding: { moveWithTime: false },
      animation: { inName: "", loopName: "", outName: "" },
    },
    {
      id: "clipnode_logo_text",
      type: "text",
      startUs: 0,
      endUs: totalDurationUs,
      x: 0.945,
      y: 0.186,
      scale: 0.95,
      rotation: 0,
      text: { content: "ClipNode", color: "#FFFFFFFF", textSize: 24 },
      textStyle: {
        bold: true,
        strokeEnabled: true,
        strokeWidth: 1,
        strokeColor: "#DD000000",
        glowEnabled: true,
        glowRadius: 5,
        glowColor: "#99000000",
        backgroundColor: "#00000000",
        backgroundCornerRadius: 0,
        horizontalPadding: 0,
        verticalPadding: 0,
      },
      grid: { enabled: false, rows: 1, columns: 1 },
      timeBinding: { moveWithTime: false },
      animation: { inName: "", loopName: "", outName: "" },
    },
  ];
}

function buildRecipeRequest({ taskId, outputName, sources, transitions, logoAssetPath, canvasWidth, canvasHeight, fps, bitrateFactor }) {
  const totalDurationUs = sources.reduce((sum, source) => sum + Number(source.durationUs || 0), 0)
    - transitions.reduce((sum, transition) => sum + Number(transition.durationUs || 0), 0);
  return {
    taskId,
    toolRunId: `showcase_recipe_${Date.now()}`,
    requestId: `showcase_recipe_${Date.now()}`,
    clientJobKey: `showcase_recipe_${Date.now()}`,
    taskType: "video_composition",
    type: "video_composition",
    sources,
    transitions,
    specPatch: {
      canvas: { preset: "custom", width: canvasWidth, height: canvasHeight },
      audio: { mute: true, volume: 0 },
      stickers: {
        items: buildLogoStickers(logoAssetPath, totalDurationUs),
      },
      export: { fps, keepAudio: false, bitrateFactor },
    },
    export: {
      outputName,
      quality: "balanced",
      fps,
      keepAudio: false,
      bitrateFactor,
      width: canvasWidth,
      height: canvasHeight,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = stringOption(args, "baseUrl", "CLIPNODE_BASE_URL", "");
  const pin = stringOption(args, "pin", "CLIPNODE_PIN", "");
  const imageTheme = stringOption(args, "imageTheme", "CLIPNODE_IMAGE_THEME", "示例素材");
  const logoPath = stringOption(args, "logoPath", "CLIPNODE_LOGO_PATH", "");
  const outputName = stringOption(args, "outputName", "CLIPNODE_OUTPUT_NAME", `clipnode_transition_showcase_${Date.now()}.mp4`);
  const saveTo = stringOption(args, "saveTo", "CLIPNODE_SAVE_TO", path.join(os.homedir(), "Downloads", outputName));
  const clipDurationUs = numberOption(args, "clipDurationUs", "CLIPNODE_CLIP_DURATION_US", 3_000_000);
  const transitionDurationUs = numberOption(args, "transitionDurationUs", "CLIPNODE_TRANSITION_DURATION_US", 700_000);
  const canvasWidth = numberOption(args, "width", "CLIPNODE_CANVAS_WIDTH", 1280);
  const canvasHeight = numberOption(args, "height", "CLIPNODE_CANVAS_HEIGHT", 720);
  const fps = numberOption(args, "fps", "CLIPNODE_EXPORT_FPS", 24);
  const bitrateFactor = Number(stringOption(args, "bitrateFactor", "CLIPNODE_BITRATE_FACTOR", "0.55"));
  const transitionGroup = stringOption(args, "transitionGroup", "CLIPNODE_TRANSITION_GROUP", "3D");
  const imageCount = numberOption(args, "count", "CLIPNODE_IMAGE_COUNT", 4);

  const client = createMcpClient({
    baseUrl,
    pin,
    session: `codex_showcase_recipe_${Date.now()}`,
  });

  await client.initialize({ name: "clipnode-transition-showcase-recipes", version: "1.0.0" });
  try {
    log("CONFIGURE", await configure(client));

    const logoUpload = await client.callTool("clipnode_media_upload_file", {
      localPath: logoPath,
      fileName: "clipnode_logo.png",
      target: { kind: "asset_library", type: "image", themeName: "codex_tmp" },
      requestId: `showcase_logo_upload_${Date.now()}`,
    }, 120000);
    const logoAssetPath = logoUpload.assetPath || logoUpload.appPath;
    if (!logoAssetPath) throw new Error(`missing logo asset path: ${JSON.stringify(logoUpload)}`);

    const themes = await client.callTool("clipnode_asset_list_themes", {
      type: "image",
      query: imageTheme,
      requestId: `showcase_image_theme_${Date.now()}`,
    }, 45000);
    const themeItems = unwrapList(themes).filter((item) => item.themeName === imageTheme);
    if (themeItems.length <= 0) {
      throw new Error(`missing image theme: ${imageTheme}`);
    }

    const selectedImages = firstImages(themeItems, imageCount);
    if (selectedImages.length < 2) {
      throw new Error(`need at least 2 images, found ${selectedImages.length}`);
    }

    const { taskId } = await beginTask(client, {
      title: "Transition showcase recipe",
      requestId: `showcase_begin_${Date.now()}`,
    });

    const transitionsResponse = await listRecommendedTransitions(client, {
      taskId,
      tags: [transitionGroup],
      tagsMode: "any",
      limit: Math.max(10, selectedImages.length),
      requestIdPrefix: "showcase_transitions",
      toolRunIdPrefix: "showcase_transitions",
    });
    if (!transitionsResponse.items.length) {
      throw new Error(`no transitions found for group ${transitionGroup}`);
    }

    const sources = buildSources(selectedImages, transitionsResponse.items.length - 1, clipDurationUs, transitionDurationUs);
    const transitions = buildTransitions(sources, transitionsResponse.items, transitionDurationUs);
    const request = buildRecipeRequest({
      taskId,
      outputName,
      sources,
      transitions,
      logoAssetPath,
      canvasWidth,
      canvasHeight,
      fps,
      bitrateFactor,
    });

    log("RECIPE_SUMMARY", {
      imageTheme,
      transitionGroup,
      sourceCount: sources.length,
      transitionCount: transitions.length,
      outputName,
      saveTo,
    });

    const validation = await validateTaskWithSuggestedFixes(client, request, {
      applyWarningFixes: false,
      maxFixes: 1,
      timeoutMs: 60000,
    });
    if (!validation.validation.ok) {
      throw new Error(`validation failed: ${JSON.stringify(validation.validation)}`);
    }

    const { jobId } = await createTask(client, request, 60000);
    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `showcase_status_${Date.now()}`,
      attempts: 240,
      intervalMs: 3000,
      timeoutMs: 45000,
    });
    if (finalStatus.status !== "success") {
      throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
    }

    await downloadOutput(client, {
      taskId,
      toolRunId: `showcase_download_${Date.now()}`,
      requestId: `showcase_download_${Date.now()}`,
      outputPath: finalStatus.outputPath,
      mediaType: "video",
      saveTo,
    }, 240000);
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
