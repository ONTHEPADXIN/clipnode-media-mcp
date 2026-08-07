#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_TIMEOUT_MS = 30000;
const TERMINAL = new Set(["success", "failed", "canceled"]);

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.CLIPNODE_BASE_URL || "",
    pin: process.env.CLIPNODE_PIN || "",
    title: "ClipNode MCP smoke test",
    server: path.join(__dirname, "clipnode-media-mcp-server.js"),
    m3u8: "",
    outputName: "clipnode_smoke_hls.mp4",
    downloadTo: "",
    poll: false,
    timeoutMs: 10 * 60 * 1000
  };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--base-url") {
      args.baseUrl = value || "";
      i++;
    } else if (key === "--pin") {
      args.pin = value || "";
      i++;
    } else if (key === "--title") {
      args.title = value || "";
      i++;
    } else if (key === "--server") {
      args.server = value || "";
      i++;
    } else if (key === "--m3u8") {
      args.m3u8 = value || "";
      i++;
    } else if (key === "--output-name") {
      args.outputName = value || "";
      i++;
    } else if (key === "--download-to") {
      args.downloadTo = value || "";
      i++;
    } else if (key === "--poll") {
      args.poll = true;
    } else if (key === "--timeout-ms") {
      args.timeoutMs = Number(value) || args.timeoutMs;
      i++;
    } else if (key === "--help") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node smoke-test-clipnode-task-flow.js --base-url http://host:port --pin 123456

Optional HLS end-to-end test:
  node smoke-test-clipnode-task-flow.js --base-url http://host:port --pin 123456 \\
    --m3u8 "https://example.com/main.m3u8" --output-name test.mp4 --poll \\
    --download-to ~/Downloads/test.mp4`);
}

class McpClient {
  constructor(server, env) {
    this.nextId = 1;
    this.buffer = "";
    this.stderr = "";
    this.waiters = new Map();
    this.process = spawn("node", [server], {
      stdio: ["pipe", "pipe", "pipe"],
      env
    });
    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");
    this.process.stdout.on("data", (chunk) => this.onStdout(chunk));
    this.process.stderr.on("data", (chunk) => {
      this.stderr += chunk;
    });
  }

  onStdout(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";
    lines.forEach((line) => {
      if (!line.trim()) {
        return;
      }
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        return;
      }
      const waiter = this.waiters.get(message.id);
      if (waiter) {
        this.waiters.delete(message.id);
        waiter(message);
      }
    });
  }

  send(method, params, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };
    this.process.stdin.write(JSON.stringify(payload) + "\n");
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(id);
        reject(new Error(`timeout ${method}; stderr=${this.stderr}`));
      }, timeoutMs);
      this.waiters.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) {
          reject(new Error(JSON.stringify(message.error)));
        } else {
          resolve(message.result);
        }
      });
    });
  }

  async initialize() {
    await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "clipnode-smoke-test",
        version: "1.0.0"
      }
    });
    this.process.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    }) + "\n");
  }

  async tool(name, args, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const result = await this.send("tools/call", {
      name,
      arguments: args || {}
    }, timeoutMs);
    const item = (result.content || []).find((content) => content.type === "text");
    return JSON.parse(item ? item.text : "{}");
  }

  close() {
    setTimeout(() => this.process.kill(), 100);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.baseUrl || !args.pin) {
    printHelp();
    throw new Error("--base-url and --pin are required, or set CLIPNODE_BASE_URL and CLIPNODE_PIN");
  }
  if (!fs.existsSync(args.server)) {
    throw new Error(`MCP server script not found: ${args.server}`);
  }

  const env = Object.assign({}, process.env, {
    CLIPNODE_BASE_URL: args.baseUrl,
    CLIPNODE_PIN: args.pin,
    CLIPNODE_MCP_SESSION: `clipnode_smoke_${Date.now()}`
  });
  const client = new McpClient(args.server, env);
  try {
    await client.initialize();
    const tools = await client.send("tools/list", {});
    const toolNames = new Set((tools.tools || []).map((tool) => tool.name));
    ["clipnode_task_begin", "clipnode_task_get_status", "clipnode_task_get_current", "clipnode_task_list_events"]
      .forEach((name) => {
        if (!toolNames.has(name)) {
          throw new Error(`missing MCP tool: ${name}`);
        }
      });
    console.log("[ok] MCP initialized and task tools are present");

    await client.tool("clipnode_media_configure", {
      baseUrl: args.baseUrl,
      pin: args.pin
    });
    console.log("[ok] ClipNode auth/configure passed");

    const capabilities = await client.tool("clipnode_media_get_capabilities", {});
    console.log(`[ok] capabilities loaded: serviceVersion=${capabilities.serviceVersion || ""}, mcpProtocolVersion=${capabilities.mcpProtocolVersion || ""}`);

    const begin = await client.tool("clipnode_task_begin", {
      title: args.title,
      requestId: `smoke_begin_${Date.now()}`
    });
    const taskId = begin.taskId || (begin.task && begin.task.taskId);
    if (!taskId) {
      throw new Error(`taskId missing from begin response: ${JSON.stringify(begin)}`);
    }
    console.log(`[ok] task created: ${taskId}, status=${begin.status || ""}`);

    const current = await client.tool("clipnode_task_get_current", {});
    const currentTask = current.currentTask || current.task || {};
    console.log(`[ok] current task: ${currentTask.taskId || ""}, status=${currentTask.status || ""}`);

    const status = await client.tool("clipnode_task_get_status", { taskId });
    console.log(`[ok] task status: ${status.taskId || ""}, status=${status.status || ""}, progress=${status.progress}`);

    const events = await client.tool("clipnode_task_list_events", { taskId });
    console.log(`[ok] task events: ${Array.isArray(events.items) ? events.items.length : 0}`);

    if (args.m3u8) {
      await runHlsFlow(client, args, taskId);
    }
  } finally {
    client.close();
  }
}

async function runHlsFlow(client, args, taskId) {
  const toolRunId = `smoke_hls_${Date.now()}`;
  const job = await client.tool("clipnode_media_export_m3u8_to_mp4", {
    taskId,
    toolRunId,
    requestId: `smoke_hls_${Date.now()}`,
    source: {
      videoId: Date.now(),
      url: args.m3u8
    },
    export: {
      outputName: args.outputName,
      overwrite: true,
      allowNetworkFallback: true,
      cleanupSegments: true,
      keepAudio: true
    }
  }, DEFAULT_TIMEOUT_MS);
  const jobId = job.jobId || (job.data && job.data.jobId);
  if (!jobId) {
    throw new Error(`jobId missing from HLS response: ${JSON.stringify(job)}`);
  }
  console.log(`[ok] HLS job created: ${jobId}, status=${job.status || ""}`);
  if (!args.poll) {
    return;
  }

  const startedAt = Date.now();
  let latest = job;
  while (Date.now() - startedAt < args.timeoutMs) {
    await delay(3000);
    latest = await client.tool("clipnode_media_get_job_status", {
      taskId,
      requestId: `smoke_job_status_${Date.now()}`,
      jobId
    });
    console.log(`[poll] job=${jobId}, status=${latest.status}, stage=${latest.stage}, progress=${latest.progress}, message=${latest.message || ""}`);
    if (TERMINAL.has(latest.status)) {
      break;
    }
  }
  if (!TERMINAL.has(latest.status)) {
    throw new Error(`HLS job did not finish before timeout: ${jobId}`);
  }
  if (latest.status !== "success") {
    throw new Error(`HLS job ended with ${latest.status}: ${latest.error || latest.message || ""}`);
  }
  if (args.downloadTo) {
    const saveTo = expandHome(args.downloadTo);
    const download = await client.tool("clipnode_media_download_file", {
      taskId,
      toolRunId: `smoke_download_${Date.now()}`,
      requestId: `smoke_download_${Date.now()}`,
      outputPath: latest.outputPath,
      mediaType: "video",
      saveTo
    }, args.timeoutMs);
    console.log(`[ok] downloaded: ${download.localPath}, size=${download.size}`);
    const taskStatus = await client.tool("clipnode_task_get_status", {
      taskId,
      requestId: `smoke_final_task_status_${Date.now()}`
    });
    const toolRuns = Object.values(taskStatus.toolRuns || {});
    const downloadRun = toolRuns.find((tool) => tool.toolName === "clipnode_media_download_file");
    const downloadStatus = downloadRun ? downloadRun.status : "";
    console.log(`[ok] final task status: ${taskStatus.status}, progress=${taskStatus.progress}, download=${downloadStatus}`);
    if (downloadStatus !== "success" || taskStatus.status !== "success") {
      throw new Error(`final AI task status is not complete: task=${taskStatus.status}, download=${downloadStatus}`);
    }
  }
}

function expandHome(value) {
  if (!value || value === "~") {
    return os.homedir();
  }
  if (value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(`[fail] ${error.stack || error.message}`);
  process.exitCode = 1;
});
