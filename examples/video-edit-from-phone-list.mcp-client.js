const os = require("os");
const path = require("path");
const { createMcpClient, log, sleep } = require("./lib/mcp-client");
const { chooseGif, firstDirPath, itemName, itemPath, unwrapList } = require("./lib/media-select");

const baseUrl = process.env.CLIPNODE_BASE_URL || "";
const pin = process.env.CLIPNODE_PIN || "";
const timestamp = Date.now();
const outputName = `clipnode_list_to_video_edit_${timestamp}.mp4`;
const saveTo = path.join(os.homedir(), "Downloads", outputName);
const client = createMcpClient({ baseUrl, pin, session: `codex_list_to_video_edit_${timestamp}` });

function chooseVideo(items) {
  const videos = items.filter((item) => itemPath(item).toLowerCase().endsWith(".mp4"));
  return videos.find((item) => {
    const size = item.size || item.fileSize || 0;
    return size > 0 && size < 20 * 1024 * 1024;
  }) || videos[0] || items[0];
}

function buildEditRequest(taskId, sourcePath, gifStickerPath) {
  const stickers = [
    {
      id: "ai_text_title",
      type: "text",
      startUs: 0,
      endUs: 2_000_000,
      x: 0.5,
      y: 0.78,
      scale: 2.8,
      rotation: -2,
      text: {
        content: "ClipNode AI",
        color: "#FFFFFFFF",
        textSize: 52,
      },
      textStyle: {
        bold: true,
        strokeEnabled: true,
        strokeWidth: 2,
        strokeColor: "#CC172033",
        backgroundColor: "#AA0B5FFF",
        backgroundCornerRadius: 14,
        horizontalPadding: 18,
        verticalPadding: 10,
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
        inName: "ScaleHandler",
        loopName: "",
        outName: "FadeHandler",
      },
    },
  ];
  if (gifStickerPath) {
    stickers.push({
      id: "ai_gif_badge",
      type: "gif",
      startUs: 0,
      endUs: 2_000_000,
      x: 0.18,
      y: 0.22,
      scale: 0.42,
      rotation: 0,
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
      animation: {
        inName: "FadeHandler",
        loopName: "",
        outName: "FadeHandler",
      },
    });
  }
  return {
    taskId,
    toolRunId: `list_to_edit_export_${timestamp}`,
    requestId: `codex_list_to_edit_export_${timestamp}`,
    taskType: "video_edit",
    type: "video_edit",
    source: { path: sourcePath },
    sources: [
      {
        id: "clip_0",
        path: sourcePath,
        trim: { startUs: 0, endUs: 2_000_000 },
        fit: { mode: "center_crop" },
        audio: { mute: true, volume: 0 },
      },
    ],
    specPatch: {
      timeRange: {
        startUs: 0,
        endUs: 2_000_000,
      },
      audio: {
        mute: true,
        volume: 0,
      },
      stickers: {
        items: stickers,
      },
      export: {
        fps: 24,
        keepAudio: false,
        bitrateFactor: 0.55,
      },
    },
    export: {
      outputName,
      quality: "balanced",
      fps: 24,
      keepAudio: false,
      bitrateFactor: 0.55,
    },
  };
}

async function waitForJob(taskId, jobId) {
  let latest = null;
  for (let attempt = 0; attempt < 90; attempt++) {
    latest = await client.callTool("clipnode_media_get_job_status", {
      taskId,
      requestId: `codex_list_to_edit_status_${timestamp}_${attempt}`,
      jobId,
    }, 45000);
    log("JOB_STATUS", {
      jobId: latest.jobId,
      status: latest.status,
      stage: latest.stage,
      progress: latest.progress,
      outputPath: latest.outputPath,
      error: latest.error,
    });
    if (["success", "failed", "canceled"].includes(latest.status)) {
      return latest;
    }
    await sleep(3000);
  }
  throw new Error(`job polling timed out: ${JSON.stringify(latest)}`);
}

async function main() {
  await client.initialize({ name: "codex-clipnode-list-to-video-edit-smoke", version: "1.0.0" });

  log("CONFIGURE", await client.callTool("clipnode_media_configure", { baseUrl, pin }));

  const capabilities = await client.callTool("clipnode_media_get_capabilities", {});
  log("CAPABILITIES", {
    workflows: (capabilities.workflowCapabilities || []).map((item) => item.id),
    sourceCapabilities: capabilities.sourceCapabilities,
  });

  const begin = await client.callTool("clipnode_task_begin", {
    title: "从手机素材列表选择视频并添加贴纸",
    requestId: `codex_list_to_edit_begin_${timestamp}`,
  });
  const taskId = begin.taskId || begin.task?.taskId;
  if (!taskId) {
    throw new Error(`missing taskId: ${JSON.stringify(begin)}`);
  }
  log("TASK_BEGIN", { taskId, status: begin.status || begin.task?.status });

  const videoDirs = await client.callTool("clipnode_media_list_video_dirs", {
    taskId,
    toolRunId: `list_video_dirs_${timestamp}`,
    requestId: `codex_list_to_edit_video_dirs_${timestamp}`,
  });
  const videos = await client.callTool("clipnode_media_list_videos", {
    taskId,
    toolRunId: `list_videos_${timestamp}`,
    requestId: `codex_list_to_edit_videos_${timestamp}`,
    dirPath: firstDirPath(videoDirs),
    page: 1,
    pageSize: 20,
  });
  const video = chooseVideo(unwrapList(videos));
  if (!video || !itemPath(video)) {
    throw new Error(`no video found: ${JSON.stringify(videos)}`);
  }

  const imageDirs = await client.callTool("clipnode_media_list_image_dirs", {
    taskId,
    toolRunId: `list_image_dirs_${timestamp}`,
    requestId: `codex_list_to_edit_image_dirs_${timestamp}`,
  });
  const images = await client.callTool("clipnode_media_list_images", {
    taskId,
    toolRunId: `list_images_${timestamp}`,
    requestId: `codex_list_to_edit_images_${timestamp}`,
    dirPath: firstDirPath(imageDirs),
    page: 1,
    pageSize: 30,
  });
  const gif = chooseGif(unwrapList(images));
  log("SELECTED_MEDIA", {
    videoName: itemName(video),
    videoPath: itemPath(video),
    videoSize: video.size || video.fileSize || 0,
    gifName: gif ? itemName(gif) : "",
    gifPath: gif ? itemPath(gif) : "",
  });

  const probe = await client.callTool("clipnode_media_probe_sources", {
    taskId,
    toolRunId: `probe_${timestamp}`,
    requestId: `codex_list_to_edit_probe_${timestamp}`,
    sources: [{ id: "clip_0", path: itemPath(video) }],
  });
  log("PROBE", probe);

  const request = buildEditRequest(taskId, itemPath(video), gif ? itemPath(gif) : "");
  const validation = await client.callTool("clipnode_media_validate_task", request);
  log("VALIDATE", validation);
  if (!validation.ok) {
    throw new Error(`validation failed: ${JSON.stringify(validation)}`);
  }

  const created = await client.callTool("clipnode_media_create_task", request, 60000);
  log("CREATE", created);
  const jobId = created.jobId || created.data?.jobId;
  if (!jobId) {
    throw new Error(`missing jobId: ${JSON.stringify(created)}`);
  }

  const finalStatus = await waitForJob(taskId, jobId);
  if (finalStatus.status !== "success") {
    throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
  }

  const download = await client.callTool("clipnode_media_download_file", {
    taskId,
    toolRunId: `download_${timestamp}`,
    requestId: `codex_list_to_edit_download_${timestamp}`,
    outputPath: finalStatus.outputPath,
    mediaType: "video",
    saveTo,
  }, 180000);
  log("DOWNLOAD", download);

  const taskStatus = await client.callTool("clipnode_task_get_status", { taskId });
  log("TASK_STATUS", {
    taskId: taskStatus.taskId,
    status: taskStatus.status,
    progress: taskStatus.progress,
    current: taskStatus.summary?.current,
    outputCandidates: taskStatus.outputCandidates,
    toolRunIds: Object.keys(taskStatus.toolRuns || {}),
  });
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
