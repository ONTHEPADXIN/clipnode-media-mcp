const { spawn } = require("child_process");
const path = require("path");

const DEFAULT_SERVER_PATH = path.join(__dirname, "..", "..", "scripts", "clipnode-media-mcp-server.js");

function parseToolResult(result) {
  const text = (result.content || []).find((item) => item.type === "text")?.text || "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function createMcpClient(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.CLIPNODE_BASE_URL ?? "";
  const pin = options.pin ?? process.env.CLIPNODE_PIN ?? "";
  const serverPath = options.serverPath || DEFAULT_SERVER_PATH;
  const proc = spawn(options.nodeBin || "node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      CLIPNODE_BASE_URL: baseUrl,
      CLIPNODE_PIN: pin,
      ...(options.session ? { CLIPNODE_MCP_SESSION: options.session } : {}),
      ...(options.env || {}),
    },
  });

  let buffer = "";
  let stderr = "";
  let nextId = 1;
  const waiters = new Map();

  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  proc.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(message, "id") && waiters.has(message.id)) {
        waiters.get(message.id)(message);
        waiters.delete(message.id);
      }
    }
  });

  function send(method, params = {}, timeoutMs = 30000) {
    const id = nextId++;
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        reject(new Error(`timeout ${method}; stderr=${stderr}`));
      }, timeoutMs);
      waiters.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) {
          reject(new Error(JSON.stringify(message.error)));
        } else {
          resolve(message.result);
        }
      });
    });
  }

  async function initialize(clientInfo = { name: "clipnode-example-client", version: "1.0.0" }) {
    await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo,
    });
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })}\n`);
  }

  async function callTool(name, args = {}, timeoutMs = 30000) {
    return parseToolResult(await send("tools/call", { name, arguments: args }, timeoutMs));
  }

  function close() {
    for (const rejecter of waiters.values()) {
      rejecter({ error: { message: "client closed" } });
    }
    waiters.clear();
    try {
      proc.kill();
    } catch {}
  }

  return {
    baseUrl,
    pin,
    proc,
    send,
    initialize,
    callTool,
    close,
  };
}

function log(label, value) {
  console.log(`${label} ${JSON.stringify(value)}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  createMcpClient,
  log,
  parseToolResult,
  sleep,
};
