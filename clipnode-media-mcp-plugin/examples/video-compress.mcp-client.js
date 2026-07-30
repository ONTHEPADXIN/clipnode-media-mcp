const os = require("os");
const path = require("path");
const { createMcpClient, log } = require("./lib/mcp-client");
const { waitForJob } = require("./lib/job-flow");

const baseUrl = process.env.CLIPNODE_BASE_URL || "";
const pin = process.env.CLIPNODE_PIN || "";
const sourcePath = process.env.CLIPNODE_VIDEO_COMPRESS_SOURCE || "/storage/emulated/0/DCIM/video.mp4";
const timestamp = Date.now();
const outputName = `clipnode_video_compress_${timestamp}.mp4`;
const saveTo = path.join(os.homedir(), "Downloads", outputName);
const client = createMcpClient({ baseUrl, pin, session: `codex_video_compress_${timestamp}` });

function buildRequest(taskId) {
  return {
    taskId,
    toolRunId: `video_compress_${timestamp}`,
    requestId: `codex_video_compress_${timestamp}`,
    taskType: "video_compress",
    type: "video_compress",
    source: { path: sourcePath },
    export: {
      outputName,
      preset: "size_first",
      bitrateFactor: 0.14,
      targetHeight: 480,
      fps: 24,
      keepAudio: true,
    },
  };
}

async function main() {
  await client.initialize({ name: "codex-clipnode-video-compress-test", version: "1.0.0" });

  const configured = await client.callTool("clipnode_media_configure", { baseUrl, pin });
  log("CONFIGURE", configured);

  const capabilities = await client.callTool("clipnode_media_get_capabilities", {});
  log("CAPABILITIES", {
    workflowIds: (capabilities.workflowCapabilities || []).map((item) => item.id),
    videoCompress: capabilities.features?.videoCompress,
  });

  const begin = await client.callTool("clipnode_task_begin", {
    title: "测试视频压缩导出",
    requestId: `codex_video_compress_begin_${timestamp}`,
  });
  const taskId = begin.taskId || begin.task?.taskId;
  if (!taskId) {
    throw new Error(`missing taskId: ${JSON.stringify(begin)}`);
  }
  log("TASK_BEGIN", { taskId, status: begin.status || begin.task?.status });

  const request = buildRequest(taskId);
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

  const finalStatus = await waitForJob(client, {
    taskId,
    jobId,
    requestIdPrefix: `codex_video_compress_status_${timestamp}`,
    attempts: 90,
    intervalMs: 2000,
  });
  if (finalStatus.status !== "success") {
    throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
  }

  const download = await client.callTool("clipnode_media_download_file", {
    taskId,
    toolRunId: `download_${timestamp}`,
    requestId: `codex_video_compress_download_${timestamp}`,
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
