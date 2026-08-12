"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const pathModule = require("path");
const { spawn } = require("child_process");
const { URL } = require("url");

function createClipNodeClient(options) {
  const state = {
    baseUrl: ((options && options.baseUrl) || process.env.CLIPNODE_BASE_URL || "http://127.0.0.1:18080").replace(/\/+$/, ""),
    pin: (options && options.pin) || process.env.CLIPNODE_PIN || "",
    authCookie: "",
    sessionId: (options && options.sessionId)
      || process.env.CLIPNODE_MCP_SESSION
      || `mcp_session_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    authExpiresAt: 0
  };
  const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 4 });
  const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 4 });
  let authInFlight = null;

  async function configure(baseUrl, pin) {
    state.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    state.pin = pin || "";
    state.authCookie = "";
    state.authExpiresAt = 0;
    loadCachedAuth();
    await ensureAuth();
    return { ok: true, baseUrl: state.baseUrl };
  }

  async function ensureAuth() {
    if (state.authCookie && (!state.authExpiresAt || state.authExpiresAt > Date.now())) {
      return;
    }
    loadCachedAuth();
    if (state.authCookie && (!state.authExpiresAt || state.authExpiresAt > Date.now())) {
      return;
    }
    if (authInFlight) {
      return authInFlight;
    }
    authInFlight = refreshAuth().finally(() => {
      authInFlight = null;
    });
    return authInFlight;
  }

  async function refreshAuth() {
    if (!state.pin) {
      throw new Error("CLIPNODE_PIN is empty. Set it in the plugin MCP env before calling ClipNode tools.");
    }
    const body = `pin=${encodeURIComponent(state.pin)}`;
    const result = await rawRequest("POST", "/auth/pin", body, {
      "Content-Type": "application/x-www-form-urlencoded"
    });
    const setCookie = result.headers["set-cookie"];
    if (Array.isArray(setCookie) && setCookie.length > 0) {
      state.authCookie = setCookie[0].split(";")[0];
    } else if (typeof setCookie === "string") {
      state.authCookie = setCookie.split(";")[0];
    }
    const parsed = parseJson(result.body);
    const authed = parsed && parsed.data && parsed.data.authed === true;
    if (!authed || !state.authCookie) {
      throw new Error(`ClipNode auth failed: ${result.body}`);
    }
    state.authExpiresAt = Date.now() + 11 * 60 * 60 * 1000;
    saveCachedAuth();
  }

  async function requestJson(method, path, data, meta, toolName) {
    await ensureAuth();
    const body = method === "GET" ? "" : JSON.stringify(data || {});
    const headers = withMetaHeaders({
      "Cookie": state.authCookie
    }, meta, toolName);
    if (method !== "GET") {
      headers["Content-Type"] = "application/json; charset=utf-8";
    }
    const result = await rawRequest(method, path, body, headers);
    if (result.statusCode === 401) {
      state.authCookie = "";
      state.authExpiresAt = 0;
      clearCachedAuth();
      await refreshAuth();
      return requestJson(method, path, data, meta, toolName);
    }
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`ClipNode HTTP ${result.statusCode}: ${result.body}`);
    }
    return parseJson(result.body);
  }

  async function uploadFile(args) {
    await ensureAuth();
    requireString(args, "localPath");
    const localPath = pathModule.resolve(args.localPath);
    const stat = fs.statSync(localPath);
    if (!stat.isFile()) {
      throw new Error(`localPath is not a file: ${localPath}`);
    }
    const fileName = sanitizeFileName(args.fileName || pathModule.basename(localPath));
    const fileId = `mcp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const fields = [
      ["fileId", fileId],
      ["fileName", fileName],
      ["fileSize", String(stat.size)],
      ["chunkIndex", "0"],
      ["chunkCount", "1"],
      ["chunkSize", String(stat.size)],
      ["chunkSizeStart", "0"],
      ["file", `@${localPath};filename=${fileName}`]
    ];
    appendAssetLibraryUploadFields(fields, args || {});
    const response = await rawCurlMultipartRequest("/uploadweb", fields, withMetaHeaders({
      "Cookie": state.authCookie
    }, args, "clipnode_media_upload_file"));
    if (response.statusCode === 401) {
      await refreshAuthForRetry();
      return uploadFile(args);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`ClipNode HTTP ${response.statusCode}: ${response.body}`);
    }
    const parsed = parseJson(response.body);
    const result = {
      ok: true,
      fileId,
      fileName,
      size: stat.size,
      upload: parsed
    };
    const asset = parsed && parsed.asset ? parsed.asset : null;
    if (asset) {
      result.appPath = parsed.appPath || asset.assetPath || "";
      result.themeName = asset.themeName || "";
      result.assetPath = asset.assetPath || "";
    }
    return result;
  }

  async function downloadFile(args) {
    await ensureAuth();
    const hasFileId = args && typeof args.fileId === "string" && args.fileId.length > 0;
    const hasOutputPath = args && typeof args.outputPath === "string" && args.outputPath.length > 0;
    if (!hasFileId && !hasOutputPath) {
      throw new Error("fileId or outputPath is required");
    }
    let requestPath;
    let outputName;
    if (hasFileId) {
      requestPath = `/download?fileId=${encodeURIComponent(args.fileId)}`;
      outputName = args.fileId;
    } else {
      const route = args.mediaType === "image" ? "/localPicFile" : "/localVideoFile";
      requestPath = `${route}?path=${encodeURIComponent(args.outputPath)}`;
      outputName = pathModule.basename(args.outputPath);
    }
    const saveTo = resolveSavePath(args.saveTo, outputName);
    let result;
    try {
      result = await rawCurlDownloadRequest(requestPath, saveTo, withMetaHeaders({
        "Cookie": state.authCookie
      }, Object.assign({}, args, { clientSaveTo: saveTo }), "clipnode_media_download_file"));
    } catch (error) {
      if (!isAuthError(error)) {
        throw error;
      }
      await refreshAuthForRetry();
      result = await rawCurlDownloadRequest(requestPath, saveTo, withMetaHeaders({
        "Cookie": state.authCookie
      }, Object.assign({}, args, { clientSaveTo: saveTo }), "clipnode_media_download_file"));
    }
    return {
      ok: true,
      statusCode: result.statusCode,
      localPath: saveTo,
      size: fs.existsSync(saveTo) ? fs.statSync(saveTo).size : 0
    };
  }

  function withMetaHeaders(headers, meta, toolName) {
    const result = Object.assign({}, headers || {});
    const source = meta || {};
    result["X-ClipNode-MCP-Client"] = "codex";
    result["X-ClipNode-MCP-Session"] = state.sessionId;
    result["X-ClipNode-MCP-Request"] = source.requestId || `mcp_request_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    result["X-ClipNode-MCP-Tool"] = source.toolName || toolName || "";
    if (source.taskId) {
      result["X-ClipNode-AI-Task"] = source.taskId;
    }
    if (source.toolRunId) {
      result["X-ClipNode-Tool-Run"] = source.toolRunId;
    }
    if (source.clientSaveTo || source.saveTo) {
      result["X-ClipNode-Client-Save-To"] = source.clientSaveTo || source.saveTo;
    }
    return result;
  }

  function authCacheEnabled() {
    return process.env.CLIPNODE_AUTH_CACHE !== "0";
  }

  function authCachePath() {
    if (process.env.CLIPNODE_AUTH_CACHE_FILE) {
      return process.env.CLIPNODE_AUTH_CACHE_FILE;
    }
    return pathModule.join(os.homedir(), ".clipnode-media-mcp", "auth-cache.json");
  }

  function authCacheKey() {
    return require("crypto")
      .createHash("sha256")
      .update(`${state.baseUrl}\n${state.pin}`)
      .digest("hex");
  }

  function loadCachedAuth() {
    if (!authCacheEnabled() || state.authCookie) {
      return;
    }
    try {
      const file = authCachePath();
      if (!fs.existsSync(file)) {
        return;
      }
      const cache = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
      const entry = cache[authCacheKey()];
      if (!entry || !entry.authCookie || (entry.expiresAt && entry.expiresAt <= Date.now())) {
        return;
      }
      state.authCookie = entry.authCookie;
      state.authExpiresAt = entry.expiresAt || 0;
    } catch (error) {
      // Auth cache is an optimization only; ignore corrupt or unreadable files.
    }
  }

  function saveCachedAuth() {
    if (!authCacheEnabled() || !state.authCookie) {
      return;
    }
    try {
      const file = authCachePath();
      fs.mkdirSync(pathModule.dirname(file), { recursive: true, mode: 0o700 });
      let cache = {};
      if (fs.existsSync(file)) {
        cache = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
      }
      cache[authCacheKey()] = {
        authCookie: state.authCookie,
        expiresAt: state.authExpiresAt || 0,
        baseUrl: state.baseUrl,
        updatedAt: Date.now()
      };
      fs.writeFileSync(file, JSON.stringify(cache, null, 2), { mode: 0o600 });
    } catch (error) {
      // Do not fail media tools just because a local cache cannot be written.
    }
  }

  function clearCachedAuth() {
    if (!authCacheEnabled()) {
      return;
    }
    try {
      const file = authCachePath();
      if (!fs.existsSync(file)) {
        return;
      }
      const cache = JSON.parse(fs.readFileSync(file, "utf8") || "{}");
      delete cache[authCacheKey()];
      fs.writeFileSync(file, JSON.stringify(cache, null, 2), { mode: 0o600 });
    } catch (error) {
      // Ignore cleanup failures; the next 401 will refresh again.
    }
  }

  async function refreshAuthForRetry() {
    state.authCookie = "";
    state.authExpiresAt = 0;
    clearCachedAuth();
    await refreshAuth();
  }

  function isAuthError(error) {
    return error && /HTTP\s+401\b/.test(error.message || "");
  }

  function appendAssetLibraryUploadFields(fields, args) {
    const target = args && args.target ? args.target : null;
    if (!target || target.kind !== "asset_library") {
      return;
    }
    fields.push(["target.kind", "asset_library"]);
    appendField(fields, "target.type", target.type);
    appendField(fields, "target.themeName", target.themeName);
  }

  function appendField(fields, key, value) {
    if (typeof value !== "undefined" && value !== null && String(value).length > 0) {
      fields.push([key, String(value)]);
    }
  }

  function rawRequest(method, path, body, headers) {
    return rawNodeRequest(method, path, body, headers).catch((error) => {
      if (shouldFallbackToCurl(error)) {
        return rawCurlRequest(method, path, body, headers);
      }
      throw error;
    });
  }

  function shouldFallbackToCurl(error) {
    if (!error) {
      return false;
    }
    const message = error.message || "";
    const lowerMessage = message.toLowerCase();
    return error.code === "ECONNRESET"
      || error.code === "ECONNREFUSED"
      || error.code === "EPERM"
      || error.code === "EPIPE"
      || lowerMessage.includes("socket hang up")
      || lowerMessage.includes("connection refused")
      || lowerMessage.includes("connect eperm")
      || lowerMessage.includes("empty reply from server");
  }

  function rawNodeRequest(method, path, body, headers) {
    return new Promise((resolve, reject) => {
      const url = new URL(state.baseUrl + path);
      const client = url.protocol === "https:" ? https : http;
      const requestBody = body || "";
      const requestHeaders = Object.assign({
        "User-Agent": "clipnode-media-mcp/0.1",
        "Accept": "application/json"
      }, headers || {});
      if (requestBody) {
        requestHeaders["Content-Length"] = Buffer.byteLength(requestBody);
      }
      const req = client.request({
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        headers: requestHeaders,
        agent: url.protocol === "https:" ? httpsAgent : httpAgent,
        family: url.hostname === "localhost" ? 4 : undefined
      }, (res) => {
        let chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          chunks += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: chunks });
        });
      });
      req.on("error", reject);
      if (requestBody) {
        req.write(requestBody);
      }
      req.end();
    });
  }

  function rawCurlRequest(method, path, body, headers) {
    return new Promise((resolve, reject) => {
      const url = state.baseUrl + path;
      const requestBody = body || "";
      const args = [
        "-q",
        "-sS",
        "-i",
        "--noproxy",
        "*",
        "--http1.1",
        "--connect-timeout",
        "8",
        "--max-time",
        "120",
        "-X",
        method,
        "-A",
        "clipnode-media-mcp/0.1"
      ];
      const requestHeaders = Object.assign({
        "Accept": "application/json"
      }, headers || {});
      Object.keys(requestHeaders).forEach((key) => {
        const value = requestHeaders[key];
        if (typeof value !== "undefined" && value !== null && String(value).length > 0) {
          args.push("-H", `${key}: ${value}`);
        }
      });
      if (requestBody) {
        args.push("--data-binary", requestBody);
      }
      args.push(url);

      const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`curl failed (${code}): ${stderr || stdout}`));
          return;
        }
        resolve(parseCurlResponse(stdout));
      });
    });
  }

  function rawCurlMultipartRequest(path, fields, headers) {
    return new Promise((resolve, reject) => {
      const url = state.baseUrl + path;
      const args = [
        "-q",
        "-sS",
        "-i",
        "--noproxy",
        "*",
        "--http1.1",
        "--connect-timeout",
        "8",
        "--max-time",
        "120",
        "-X",
        "POST",
        "-A",
        "clipnode-media-mcp/0.1"
      ];
      const requestHeaders = Object.assign({
        "Accept": "application/json"
      }, headers || {});
      Object.keys(requestHeaders).forEach((key) => {
        const value = requestHeaders[key];
        if (typeof value !== "undefined" && value !== null && String(value).length > 0) {
          args.push("-H", `${key}: ${value}`);
        }
      });
      (fields || []).forEach((field) => {
        args.push("-F", `${field[0]}=${field[1]}`);
      });
      args.push(url);

      const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`curl multipart failed (${code}): ${stderr || stdout}`));
          return;
        }
        resolve(parseCurlResponse(stdout));
      });
    });
  }

  function rawCurlDownloadRequest(path, saveTo, headers) {
    return new Promise((resolve, reject) => {
      const url = state.baseUrl + path;
      const args = [
        "-q",
        "-sS",
        "-L",
        "--noproxy",
        "*",
        "--http1.1",
        "--connect-timeout",
        "8",
        "--max-time",
        "120",
        "-A",
        "clipnode-media-mcp/0.1",
        "-w",
        "%{http_code}",
        "-o",
        saveTo
      ];
      const requestHeaders = Object.assign({}, headers || {});
      Object.keys(requestHeaders).forEach((key) => {
        const value = requestHeaders[key];
        if (typeof value !== "undefined" && value !== null && String(value).length > 0) {
          args.push("-H", `${key}: ${value}`);
        }
      });
      args.push(url);

      const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        const statusCode = Number((stdout || "").trim()) || 0;
        if (code !== 0 || statusCode < 200 || statusCode >= 300) {
          reject(new Error(`curl download failed (${code}, HTTP ${statusCode}): ${stderr || stdout}`));
          return;
        }
        resolve({ statusCode });
      });
    });
  }

  return {
    configure,
    ensureAuth,
    requestJson,
    uploadFile,
    downloadFile
  };
}

function parseCurlResponse(text) {
  const normalized = text || "";
  const parts = normalized.split(/\r?\n\r?\n/);
  const body = parts.length > 1 ? parts.pop() : normalized;
  let headerText = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^HTTP\//i.test(parts[i])) {
      headerText = parts[i];
      break;
    }
  }
  const lines = headerText.split(/\r?\n/).filter(Boolean);
  const statusLine = lines.shift() || "";
  const statusMatch = statusLine.match(/^HTTP\/\S+\s+(\d+)/i);
  const headers = {};
  lines.forEach((line) => {
    const index = line.indexOf(":");
    if (index <= 0) {
      return;
    }
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (headers[key]) {
      if (Array.isArray(headers[key])) {
        headers[key].push(value);
      } else {
        headers[key] = [headers[key], value];
      }
    } else {
      headers[key] = value;
    }
  });
  return {
    statusCode: statusMatch ? Number(statusMatch[1]) : 0,
    headers,
    body
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    return { raw: text };
  }
}

function requireString(args, key) {
  if (!args || typeof args[key] !== "string" || args[key].length === 0) {
    throw new Error(`${key} is required`);
  }
}

function sanitizeFileName(value) {
  const name = String(value || "").replace(/[\\/:*?"<>|]/g, "_");
  return name.length > 0 ? name : `clipnode_${Date.now()}`;
}

function resolveSavePath(saveTo, outputName) {
  const safeName = sanitizeFileName(outputName || `clipnode_download_${Date.now()}`);
  if (!saveTo || typeof saveTo !== "string") {
    return pathModule.join(process.cwd(), safeName);
  }
  const resolved = pathModule.resolve(saveTo);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return pathModule.join(resolved, safeName);
  }
  const parent = pathModule.dirname(resolved);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  return resolved;
}

module.exports = {
  createClipNodeClient,
  parseJson
};
