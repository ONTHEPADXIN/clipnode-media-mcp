const os = require("os");
const path = require("path");
const { createMcpClient, log, sleep } = require("./lib/mcp-client");

const baseUrl = process.env.CLIPNODE_BASE_URL || "";
const pin = process.env.CLIPNODE_PIN || "";
const timestamp = Date.now();
const m3u8Url = "https://szlogo2.youxuepai.com/73530a15e88b4099af5139d1a5ede8c5/main.m3u8?auth_key=1784692026-i3TtyPqCcb-b0bfe12b2dba4957b51ddd2e7d6eb6e2-6c4eda96cbbd9798e4d83280ee5591c3";
const outputName = `clipnode_m3u8_export_${timestamp}.mp4`;
const saveTo = path.join(os.homedir(), "Downloads", outputName);
const client = createMcpClient({ baseUrl, pin, session: `codex_hls_export_${timestamp}` });

async function tryStatus(jobId) {
  return await client.callTool("clipnode_media_get_job_status", { jobId }, 45000);
}

async function createJob() {
  return await client.callTool(
    "clipnode_media_export_m3u8_to_mp4",
    {
      requestId: `codex_hls_${Date.now()}`,
      source: {
        videoId: Date.now(),
        url: m3u8Url,
      },
      export: {
        outputName: "clipnode_m3u8_export_20260722.mp4",
        overwrite: true,
        allowNetworkFallback: true,
        cleanupSegments: true,
        quality: "quality_first",
        keepAudio: true,
      },
    },
    60000,
  );
}

async function waitForSuccess(jobId) {
  let status = null;
  let lastError = "";
  for (let attempt = 0; attempt < 180; attempt++) {
    try {
      status = await tryStatus(jobId);
      console.log("STATUS", JSON.stringify(status));
      const state = status.status || status.data?.status;
      if (["success", "failed", "canceled"].includes(state)) {
        return status;
      }
    } catch (error) {
      lastError = error.message;
      console.log("STATUS_RETRY", lastError);
    }
    await sleep(5000);
  }
  throw new Error(`status polling timed out; lastError=${lastError}; lastStatus=${JSON.stringify(status)}`);
}

async function main() {
  await client.initialize({ name: "codex-manual-mcp", version: "1.0.0" });

  const created = await createJob();
  console.log("CREATE", JSON.stringify(created));
  const jobId = created.jobId || created.data?.jobId;
  if (!jobId) {
    throw new Error(`no jobId in create result: ${JSON.stringify(created)}`);
  }

  const finalStatus = await waitForSuccess(jobId);
  const finalState = finalStatus.status || finalStatus.data?.status;
  if (finalState !== "success") {
    throw new Error(`job did not succeed: ${JSON.stringify(finalStatus)}`);
  }

  const outputPath = finalStatus.outputPath || finalStatus.data?.outputPath;
  if (!outputPath) {
    throw new Error(`missing outputPath: ${JSON.stringify(finalStatus)}`);
  }

  const download = await client.callTool(
    "clipnode_media_download_file",
    { outputPath, mediaType: "video", saveTo },
    180000,
  );
  console.log("DOWNLOAD", JSON.stringify(download));
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
