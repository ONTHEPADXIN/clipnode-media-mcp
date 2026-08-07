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
const { listRecommendedTransitions, unwrapList } = require("./lib/media-select");

const argv = parseArgs(process.argv.slice(2));
const baseUrl = process.env.CLIPNODE_BASE_URL || "";
const pin = process.env.CLIPNODE_PIN || "";
const timestamp = Date.now();
const assetType = stringOption(argv, "type", "CLIPNODE_ASSET_TYPE", "video");
const themeName = stringOption(argv, "theme", "CLIPNODE_ASSET_THEME", "灾难");
const count = numberOption(argv, "count", "CLIPNODE_ASSET_COUNT", 3);
const clipDurationUs = numberOption(argv, "clipDurationUs", "CLIPNODE_ASSET_CLIP_DURATION_US", 3_000_000);
const transitionDurationUs = numberOption(argv, "transitionDurationUs", "CLIPNODE_TRANSITION_DURATION_US", 600_000);
const transitionTag = stringOption(argv, "transitionTag", "CLIPNODE_TRANSITION_TAG", "fade");
const validateOnly = booleanOption(argv, "validateOnly", "CLIPNODE_VALIDATE_ONLY", false);
const outputName = stringOption(
  argv,
  "outputName",
  "CLIPNODE_OUTPUT_NAME",
  `clipnode_asset_library_composition_${timestamp}.mp4`
);
const saveTo = stringOption(
  argv,
  "saveTo",
  "CLIPNODE_SAVE_TO",
  path.join(os.homedir(), "Downloads", outputName)
);
const client = createMcpClient({
  baseUrl,
  pin,
  session: `codex_asset_library_composition_${timestamp}`,
});

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const raw = args[i];
    if (!raw.startsWith("--")) {
      continue;
    }
    const keyValue = raw.slice(2);
    const eqIndex = keyValue.indexOf("=");
    if (eqIndex >= 0) {
      result[keyValue.slice(0, eqIndex)] = keyValue.slice(eqIndex + 1);
    } else {
      result[keyValue] = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
    }
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

function booleanOption(args, key, envKey, fallback) {
  const value = args[key] || process.env[envKey];
  if (typeof value === "undefined") {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
}

function buildTransitions(sources, transitionPool) {
  const transitions = [];
  for (let i = 0; i < sources.length - 1; i++) {
    const transition = transitionPool[i % transitionPool.length];
    transitions.push({
      id: `transition_${i}`,
      fromClipId: sources[i].id,
      toClipId: sources[i + 1].id,
      assetPath: transition.assetPath,
      durationUs: transitionDurationUs,
      audioCrossFade: false,
    });
  }
  return transitions;
}

function buildRequest(taskId, sources, transitions) {
  return {
    taskId,
    toolRunId: `asset_library_composition_${timestamp}`,
    requestId: `codex_asset_library_composition_${timestamp}`,
    clientJobKey: `asset_library_composition_${timestamp}`,
    taskType: "video_composition",
    type: "video_composition",
    sources,
    transitions,
    config: {
      canvas: {
        preset: "portrait",
        width: 1080,
        height: 1920,
        background: {
          mode: "self_blur",
          fitMode: "center_crop",
          blurEnabled: true,
          blurRadius: 24,
          opacity: 1,
          color: "#000000",
        },
      },
    },
    export: {
      outputName,
      quality: "balanced",
      fps: 24,
      keepAudio: false,
      bitrateFactor: 0.5,
    },
  };
}

async function main() {
  await client.initialize({ name: "codex-clipnode-asset-library-composition", version: "1.0.0" });

  const configured = await configure(client);
  log("CONFIGURE", configured);

  const themes = await client.callTool("clipnode_asset_list_themes", {
    type: assetType,
    query: themeName,
    requestId: `codex_asset_library_themes_${timestamp}`,
  });
  log("ASSET_THEMES", {
    total: themes.data?.total ?? themes.total,
    items: unwrapList(themes).map((item) => ({
      themeName: item.themeName,
      count: item.count,
    })),
  });

  const { taskId } = await beginTask(client, {
    title: `素材库合成：${themeName}`,
    requestId: `codex_asset_library_begin_${timestamp}`,
  });
  log("TASK_BEGIN", { taskId });

  const selected = await client.callTool("clipnode_asset_select_sources", {
    taskId,
    type: assetType,
    themeName,
    count,
    fitMode: "center_crop",
    videoTrimStartUs: 0,
    videoTrimEndUs: clipDurationUs,
    imageDurationUs: clipDurationUs,
    muteOriginalAudio: true,
    requestId: `codex_asset_library_select_${timestamp}`,
  });
  log("ASSET_SELECT", {
    type: selected.type,
    themeName: selected.themeName,
    total: selected.total,
    returned: selected.returned,
    items: selected.items,
  });
  if (!Array.isArray(selected.sources) || selected.sources.length < 2) {
    throw new Error(`need at least 2 selected sources: ${JSON.stringify(selected)}`);
  }

  const probe = await client.callTool("clipnode_media_probe_sources", {
    taskId,
    sources: selected.sources.map((source) => ({ id: source.id, path: source.path })),
    requestId: `codex_asset_library_probe_${timestamp}`,
  });
  log("PROBE", probe);

  const transitionResult = await listRecommendedTransitions(client, {
    taskId,
    transitionTag,
    timestamp,
    limit: Math.max(10, selected.sources.length),
    requestIdPrefix: "codex_asset_library_transitions",
  });
  const transitionPool = transitionResult.items;
  if (transitionPool.length <= 0) {
    throw new Error(`no transition assets available: ${JSON.stringify(transitionResult)}`);
  }
  log("TRANSITIONS", {
    source: transitionResult.source,
    filter: transitionResult.filter,
    items: transitionPool.slice(0, selected.sources.length).map((item) => ({
      id: item.id,
      name: item.name,
      assetPath: item.assetPath,
      tags: item.tags || [],
    })),
  });

  const request = buildRequest(taskId, selected.sources, buildTransitions(selected.sources, transitionPool));
  const { validation, history } = await validateTaskWithSuggestedFixes(client, request, {
    maxFixes: 2,
    timeoutMs: 60000,
  });
  log("VALIDATE_HISTORY", history);
  log("VALIDATE_FINAL", {
    ok: validation.ok,
    needConfirmation: validation.needConfirmation,
    warnings: validation.warnings || [],
    planSummary: validation.planSummary,
    timelineSummary: validation.timelineSummary,
  });
  if (validation.needConfirmation) {
    throw new Error(`validation needs confirmation: ${JSON.stringify(validation.confirmationItems || [])}`);
  }
  if (validateOnly) {
    console.log("DONE validateOnly");
    return;
  }

  const { created, jobId } = await createTask(client, request, 60000);
  log("CREATE", created);

  const finalStatus = await waitForJob(client, {
    taskId,
    jobId,
    requestIdPrefix: `codex_asset_library_status_${timestamp}`,
    attempts: 120,
    intervalMs: 3000,
  });
  if (finalStatus.status !== "success") {
    throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
  }

  await downloadOutput(client, {
    taskId,
    toolRunId: `download_${timestamp}`,
    requestId: `codex_asset_library_download_${timestamp}`,
    outputPath: finalStatus.outputPath,
    mediaType: "video",
    saveTo,
  }, 180000);
  await logTaskStatus(client, taskId);
  console.log(`DONE ${saveTo}`);
}

main()
  .catch((error) => {
    console.error(`ERROR ${error.stack || error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      client.close();
    } catch {}
  });
