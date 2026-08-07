const os = require("os");
const path = require("path");
const { createMcpClient, log } = require("./lib/mcp-client");
const {
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

const argv = argsFromArgv(process.argv);
const baseUrl = argv.baseUrl || process.env.CLIPNODE_BASE_URL || "";
const pin = argv.pin || process.env.CLIPNODE_PIN || "";
const timestamp = Date.now();
const outputName = `clipnode_mixed_composition_stickers_${timestamp}.mp4`;
const saveTo = path.join(os.homedir(), "Downloads", outputName);
const client = createMcpClient({ baseUrl, pin, session: `codex_mixed_composition_${timestamp}` });

function firstVideo(items) {
  return items.find((item) => itemPath(item).toLowerCase().endsWith(".mp4")) || null;
}

function firstImagesOrGifs(items, count) {
  return items.filter((item) => {
    const filePath = itemPath(item).toLowerCase();
    return filePath.endsWith(".jpg")
      || filePath.endsWith(".jpeg")
      || filePath.endsWith(".png")
      || filePath.endsWith(".webp")
      || filePath.endsWith(".bmp")
      || filePath.endsWith(".gif");
  }).slice(0, count);
}

function pickTransition(capabilities, keyword) {
  const items = capabilities.transitionCatalog?.items || [];
  const needle = keyword.toLowerCase();
  return items.find((item) => {
    const haystack = `${item.name || ""} ${item.assetPath || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
    return item.assetPath && haystack.includes(needle);
  }) || items.find((item) => item.autoSelectable && item.assetPath) || { assetPath: "transitions/fade.glsl" };
}

function buildRequest(taskId, video, images, transitions) {
  const clipDurationUs = 3_000_000;
  const sources = [
    {
      id: "clip_0",
      path: itemPath(video),
      trim: { startUs: 0, endUs: clipDurationUs },
      fit: { mode: "center_inside" },
      audio: { mute: true, volume: 0 },
    },
    ...images.map((item, index) => ({
      id: `clip_${index + 1}`,
      path: itemPath(item),
      durationUs: clipDurationUs,
      trim: { startUs: 0, endUs: clipDurationUs },
      fit: { mode: "center_inside" },
      audio: { mute: true, volume: 0 },
    })),
  ];
  const transitionPlans = sources.slice(0, -1).map((source, index) => ({
    id: `transition_${index}`,
    fromClipId: source.id,
    toClipId: sources[index + 1].id,
    assetPath: transitions[index % transitions.length].assetPath,
    durationUs: 700_000,
    audioCrossFade: false,
  }));
  const durationUs = sources.length * clipDurationUs - transitionPlans.length * 700_000;
  return {
    taskId,
    toolRunId: `mixed_composition_export_${timestamp}`,
    requestId: `codex_mixed_composition_export_${timestamp}`,
    taskType: "video_composition",
    type: "video_composition",
    sources,
    transitions: transitionPlans,
    specPatch: {
      canvas: { preset: "custom", width: 1920, height: 1080 },
      audio: { mute: true, volume: 0 },
      stickers: {
        items: [
          {
            id: "mixed_composition_title",
            type: "text",
            startUs: 0,
            endUs: durationUs,
            x: 0.5,
            y: 0.1,
            scale: 2.4,
            rotation: 0,
            text: {
              content: "ClipNode Mixed Composition",
              color: "#FFFFFFFF",
              textSize: 42,
            },
            textStyle: {
              bold: true,
              strokeEnabled: true,
              strokeWidth: 2,
              strokeColor: "#FF000000",
              backgroundColor: "#88000000",
              backgroundCornerRadius: 12,
              horizontalPadding: 18,
              verticalPadding: 10,
            },
            grid: { enabled: false, rows: 1, columns: 1 },
            timeBinding: { moveWithTime: false },
            animation: { inName: "FadeHandler", loopName: "", outName: "FadeHandler" },
          },
        ],
      },
      export: { fps: 24, keepAudio: false, bitrateFactor: 0.5 },
    },
    export: {
      outputName,
      quality: "balanced",
      fps: 24,
      keepAudio: false,
      bitrateFactor: 0.5,
      width: 1920,
      height: 1080,
    },
  };
}

async function main() {
  await client.initialize({ name: "codex-clipnode-mixed-composition-stickers", version: "1.0.0" });
  log("CONFIGURE", await client.callTool("clipnode_media_configure", { baseUrl, pin }));

  const capabilities = await client.callTool("clipnode_media_get_capabilities", {});
  const transitionA = pickTransition(capabilities, "fade");
  const transitionB = pickTransition(capabilities, "book");
  log("SELECTED_TRANSITIONS", [transitionA, transitionB].map((item) => ({
    name: item.name,
    assetPath: item.assetPath,
    tags: item.tags,
  })));

  const begin = await client.callTool("clipnode_task_begin", {
    title: "视频图片GIF混合素材合成并添加文本贴纸",
    requestId: `codex_mixed_composition_begin_${timestamp}`,
  });
  const taskId = begin.taskId || begin.task?.taskId;
  if (!taskId) {
    throw new Error(`missing taskId: ${JSON.stringify(begin)}`);
  }
  log("TASK_BEGIN", { taskId, status: begin.status || begin.task?.status });

  const videoDirs = await client.callTool("clipnode_media_list_video_dirs", {
    taskId,
    toolRunId: `mixed_video_dirs_${timestamp}`,
    requestId: `codex_mixed_video_dirs_${timestamp}`,
  }, 45000);
  const videosPage = await client.callTool("clipnode_media_list_videos", {
    taskId,
    toolRunId: `mixed_videos_${timestamp}`,
    requestId: `codex_mixed_videos_${timestamp}`,
    dirPath: firstDirPath(videoDirs),
    page: 1,
    pageSize: 20,
  }, 45000);
  const video = firstVideo(unwrapList(videosPage));
  if (!video) {
    throw new Error("no phone video found");
  }

  const imageDirs = await client.callTool("clipnode_media_list_image_dirs", {
    taskId,
    toolRunId: `mixed_image_dirs_${timestamp}`,
    requestId: `codex_mixed_image_dirs_${timestamp}`,
  }, 45000);
  const imagesPage = await client.callTool("clipnode_media_list_images", {
    taskId,
    toolRunId: `mixed_images_${timestamp}`,
    requestId: `codex_mixed_images_${timestamp}`,
    dirPath: firstDirPath(imageDirs),
    page: 1,
    pageSize: 80,
  }, 45000);
  const images = firstImagesOrGifs(unwrapList(imagesPage), 2);
  if (images.length < 2) {
    throw new Error(`need 2 images/GIFs, found ${images.length}`);
  }
  log("SELECTED_MEDIA", {
    video: { name: itemName(video), path: itemPath(video) },
    images: images.map((item) => ({ name: itemName(item), path: itemPath(item) })),
  });

  const sourcesForProbe = [
    { id: "clip_0", path: itemPath(video) },
    ...images.map((item, index) => ({ id: `clip_${index + 1}`, path: itemPath(item) })),
  ];
  const probe = await client.callTool("clipnode_media_probe_sources", {
    taskId,
    toolRunId: `mixed_probe_${timestamp}`,
    requestId: `codex_mixed_probe_${timestamp}`,
    sources: sourcesForProbe,
  }, 60000);
  log("PROBE", probe);

  const request = buildRequest(taskId, video, images, [transitionA, transitionB]);
  log("REQUEST_SUMMARY", {
    sourceCount: request.sources.length,
    transitionCount: request.transitions.length,
    stickerCount: request.specPatch.stickers.items.length,
    canvas: request.specPatch.canvas,
    transitionAssets: request.transitions.map((item) => item.assetPath),
    saveTo,
  });

  const validation = await validateTask(client, request, { timeoutMs: 60000 });
  log("VALIDATE", validation);

  const { created, jobId } = await createTask(client, request, 60000);
  log("CREATE", created);

  const finalStatus = await waitForJob(client, {
    taskId,
    jobId,
    requestIdPrefix: `codex_mixed_status_${timestamp}`,
    attempts: 120,
    intervalMs: 3000,
    timeoutMs: 45000,
    summarize: (latest) => ({
      jobId: latest.jobId,
      status: latest.status,
      stage: latest.stage,
      progress: latest.progress,
      frameCount: latest.frameCount,
      durationUs: latest.durationUs,
      timelineDurationUs: latest.timelineSummary?.durationUs,
      transitionAssets: latest.timelineSummary?.transitions?.map((item) => item.assetPath),
      outputPath: latest.outputPath,
      error: latest.error,
    }),
  });
  if (finalStatus.status !== "success") {
    throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
  }

  await downloadOutput(client, {
    taskId,
    toolRunId: `mixed_download_${timestamp}`,
    requestId: `codex_mixed_download_${timestamp}`,
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
