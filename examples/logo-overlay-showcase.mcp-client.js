const os = require("os");
const path = require("path");
const { createMcpClient, log } = require("./lib/mcp-client");
const {
  beginTask,
  configure,
  createTask,
  downloadOutput,
  validateTaskWithSuggestedFixes,
  waitForJob,
} = require("./lib/job-flow");

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

function firstProbeItem(response) {
  if (Array.isArray(response)) return response[0] || {};
  if (response && Array.isArray(response.sources)) return response.sources[0] || {};
  if (response && response.data && Array.isArray(response.data.sources)) return response.data.sources[0] || {};
  if (response && Array.isArray(response.data)) return response.data[0] || {};
  if (response && response.data && Array.isArray(response.data.list)) return response.data.list[0] || {};
  return response && typeof response === "object" ? response : {};
}

function durationFromProbe(response) {
  const item = firstProbeItem(response);
  return Number(item.durationUs || item.duration || item.mediaDurationUs || item.videoDurationUs || 0);
}

function buildRequest({ taskId, sourceVideoPath, logoAssetPath, outputName, durationUs }) {
  const endUs = Math.max(1_000_000, durationUs);
  return {
    taskId,
    toolRunId: `logo_overlay_showcase_${Date.now()}`,
    requestId: `logo_overlay_showcase_${Date.now()}`,
    clientJobKey: `logo_overlay_showcase_${Date.now()}`,
    taskType: "video_edit",
    type: "video_edit",
    source: { path: sourceVideoPath },
    sources: [
      {
        id: "clip_0",
        path: sourceVideoPath,
        trim: { startUs: 0, endUs },
        fit: { mode: "center_crop" },
        audio: { mute: true, volume: 0 },
      },
    ],
    specPatch: {
      timeRange: { startUs: 0, endUs },
      canvas: { preset: "custom", width: 1280, height: 720 },
      fit: { mode: "center_crop" },
      audio: { mute: true, volume: 0 },
      stickers: {
        items: [
          {
            id: "logo_image",
            type: "image",
            startUs: 0,
            endUs,
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
            id: "logo_text",
            type: "text",
            startUs: 0,
            endUs,
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
        ],
      },
      export: { fps: 24, keepAudio: false, bitrateFactor: 0.55 },
    },
    export: {
      outputName,
      quality: "balanced",
      fps: 24,
      keepAudio: false,
      bitrateFactor: 0.55,
      width: 1280,
      height: 720,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = stringOption(args, "baseUrl", "CLIPNODE_BASE_URL", "");
  const pin = stringOption(args, "pin", "CLIPNODE_PIN", "");
  const sourceVideoPath = stringOption(args, "source", "CLIPNODE_SOURCE_VIDEO", "");
  const logoPath = stringOption(args, "logoPath", "CLIPNODE_LOGO_PATH", "");
  const outputName = stringOption(args, "outputName", "CLIPNODE_OUTPUT_NAME", `clipnode_logo_overlay_${Date.now()}.mp4`);
  const saveTo = stringOption(args, "saveTo", "CLIPNODE_SAVE_TO", path.join(os.homedir(), "Downloads", outputName));

  if (!sourceVideoPath) {
    throw new Error("Pass --source or CLIPNODE_SOURCE_VIDEO with an app-visible video path.");
  }

  const client = createMcpClient({
    baseUrl,
    pin,
    session: `codex_logo_overlay_showcase_${Date.now()}`,
  });

  await client.initialize({ name: "clipnode-logo-overlay-showcase", version: "1.0.0" });
  try {
    log("CONFIGURE", await configure(client));
    const { taskId } = await beginTask(client, {
      title: "Logo overlay showcase",
      requestId: `logo_overlay_begin_${Date.now()}`,
    });

    const logoUpload = await client.callTool("clipnode_media_upload_file", {
      taskId,
      localPath: logoPath,
      fileName: "clipnode_logo.png",
      target: { kind: "asset_library", type: "image", themeName: "codex_tmp" },
      requestId: `logo_overlay_upload_${Date.now()}`,
    }, 120000);
    const logoAssetPath = logoUpload.assetPath || logoUpload.appPath;
    if (!logoAssetPath) throw new Error(`missing logo asset path: ${JSON.stringify(logoUpload)}`);

    const probe = await client.callTool("clipnode_media_probe_sources", {
      taskId,
      sources: [{ id: "clip_0", path: sourceVideoPath }],
      requestId: `logo_overlay_probe_${Date.now()}`,
    }, 60000);
    const durationUs = durationFromProbe(probe);
    if (!durationUs) throw new Error(`could not read source duration: ${JSON.stringify(probe)}`);

    const request = buildRequest({ taskId, sourceVideoPath, logoAssetPath, outputName, durationUs });
    log("RECIPE_SUMMARY", {
      sourceVideoPath,
      outputName,
      saveTo,
      durationSeconds: durationUs / 1_000_000,
    });

    const validation = await validateTaskWithSuggestedFixes(client, request, {
      applyWarningFixes: false,
      maxFixes: 1,
      timeoutMs: 60000,
    });
    if (!validation.validation.ok || validation.validation.needConfirmation) {
      throw new Error(`validation did not auto-pass: ${JSON.stringify(validation.validation)}`);
    }

    const { jobId } = await createTask(client, request, 60000);
    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `logo_overlay_status_${Date.now()}`,
      attempts: 220,
      intervalMs: 3000,
      timeoutMs: 45000,
    });
    if (finalStatus.status !== "success") {
      throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
    }

    await downloadOutput(client, {
      taskId,
      toolRunId: `logo_overlay_download_${Date.now()}`,
      requestId: `logo_overlay_download_${Date.now()}`,
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
