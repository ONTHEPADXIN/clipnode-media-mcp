#!/usr/bin/env node

const crypto = require("crypto");
const pathModule = require("path");
const { createClipNodeClient } = require("../lib/clipnode-http-client");
const { filterCatalogItems, normalizeFilterText } = require("../lib/catalog");
const { listTemplates, getTemplate } = require("../lib/templates");

const client = createClipNodeClient();
const TEMPLATE_CATALOG_PATH = pathModule.join(__dirname, "..", "assets", "templates.json");
const { resources, prompts, tools, workflowGuide } = require("../lib/mcp-definitions");
const validationCache = new Map();

async function handleTool(name, args) {
  if (name === "clipnode_media_configure") {
    requireString(args, "baseUrl");
    requireString(args, "pin");
    return client.configure(args.baseUrl, args.pin);
  }
  if (name === "clipnode_media_list_templates") {
    return listTemplates(TEMPLATE_CATALOG_PATH, args || {});
  }
  if (name === "clipnode_media_get_template") {
    requireString(args, "id");
    return getTemplate(TEMPLATE_CATALOG_PATH, args.id);
  }
  await client.ensureAuth();
  if (name === "clipnode_media_get_capabilities") {
    return client.requestJson("GET", "/media/capabilities", undefined, args || {}, name);
  }
  if (name === "clipnode_media_list_transitions") {
    return listTransitions(args || {}, name);
  }
  if (name === "clipnode_media_get_transition") {
    return getTransition(args || {}, name);
  }
  if (name === "clipnode_media_get_sticker_capabilities") {
    return getStickerCapabilities(args || {}, name);
  }
  if (name === "clipnode_media_list_sticker_animations") {
    return listStickerAnimations(args || {}, name);
  }
  if (name === "clipnode_task_begin") {
    return client.requestJson("POST", "/media/ai-tasks", args || {}, args || {}, name);
  }
  if (name === "clipnode_task_get_status") {
    requireString(args, "taskId");
    return client.requestJson("GET", `/media/ai-tasks/${encodeURIComponent(args.taskId)}`, undefined, args || {}, name);
  }
  if (name === "clipnode_task_get_current") {
    return client.requestJson("GET", "/media/ai-tasks/current", undefined, args || {}, name);
  }
  if (name === "clipnode_task_list_events") {
    requireString(args, "taskId");
    return client.requestJson("GET", `/media/ai-tasks/${encodeURIComponent(args.taskId)}/events`, undefined, args || {}, name);
  }
  if (name === "clipnode_media_probe_sources") {
    return client.requestJson("POST", "/media/probe", args || {}, args || {}, name);
  }
  if (name === "clipnode_media_list_video_dirs") {
    return client.requestJson("GET", "/localVideoDirs", undefined, args || {}, name);
  }
  if (name === "clipnode_media_list_videos") {
    return client.requestJson("GET", withQuery("/localVideos", pickQuery(args, ["dirPath", "page", "pageSize"])), undefined, args || {}, name);
  }
  if (name === "clipnode_media_list_image_dirs") {
    return client.requestJson("GET", "/localPicDirs", undefined, args || {}, name);
  }
  if (name === "clipnode_media_list_images") {
    return client.requestJson("GET", withQuery("/localPics", pickQuery(args, ["dirPath", "page", "pageSize"])), undefined, args || {}, name);
  }
  if (name === "clipnode_media_upload_file") {
    return client.uploadFile(args || {});
  }
  if (name === "clipnode_asset_list_themes") {
    return client.requestJson("GET", withQuery("/assetLibrary/themes", pickQuery(args, ["type", "query"])), undefined, args || {}, name);
  }
  if (name === "clipnode_asset_list_items") {
    return client.requestJson("GET", withQuery("/assetLibrary/items", normalizeAssetQuery(args || {})), undefined, args || {}, name);
  }
  if (name === "clipnode_asset_search") {
    return client.requestJson("GET", withQuery("/assetLibrary/search", normalizeAssetQuery(args || {})), undefined, args || {}, name);
  }
  if (name === "clipnode_asset_select_sources") {
    return selectAssetSources(args || {}, name);
  }
  if (name === "clipnode_media_download_file") {
    return client.downloadFile(args || {});
  }
  if (name === "clipnode_media_validate_task") {
    const request = normalizeTaskRequest(args || {});
    const result = await client.requestJson("POST", "/media/plans/validate", request, args || {}, name);
    rememberValidation(request, result);
    return result;
  }
  if (name === "clipnode_media_create_task") {
    const request = normalizeTaskRequest(args || {});
    if (request.taskType === "hls_mp4_export" || request.type === "hls_mp4_export") {
      if (Array.isArray(request.sources)) {
        throw new Error("sources[] is not supported for hls_mp4_export. Submit one m3u8 URL per job.");
      }
      return client.requestJson("POST", "/media/hls/mp4-export", request, args || {}, name);
    }
    attachCachedValidation(request);
    return client.requestJson("POST", "/media/export", request, args || {}, name);
  }
  if (name === "clipnode_media_export_m3u8_to_mp4") {
    if (args && Array.isArray(args.sources)) {
      throw new Error("sources[] is not supported. Submit one m3u8 URL per job.");
    }
    return client.requestJson("POST", "/media/hls/mp4-export", args || {}, args || {}, name);
  }
  if (name === "clipnode_media_get_job_status") {
    requireString(args, "jobId");
    return client.requestJson("GET", `/media/jobs/${encodeURIComponent(args.jobId)}`, undefined, args || {}, name);
  }
  if (name === "clipnode_media_cancel_job") {
    requireString(args, "jobId");
    return client.requestJson("POST", `/media/jobs/${encodeURIComponent(args.jobId)}/cancel`, {}, args || {}, name);
  }
  if (name === "clipnode_media_list_outputs") {
    return client.requestJson("GET", "/media/outputs", undefined, args || {}, name);
  }
  throw new Error(`Unknown tool: ${name}`);
}

function normalizeTaskRequest(args) {
  const request = Object.assign({}, args || {});
  if (!request.type && request.taskType) {
    request.type = request.taskType;
  }
  if (!request.taskType && request.type) {
    request.taskType = request.type;
  }
  if (request.config && request.config.export && !request.export) {
    request.export = request.config.export;
  }
  if ((request.taskType === "hls_mp4_export" || request.type === "hls_mp4_export") && request.config) {
    if (request.config.export && !request.export) {
      request.export = request.config.export;
    }
    if (request.config.edit && !request.edit) {
      request.edit = request.config.edit;
    }
  }
  if (request.config && !request.specPatch) {
    request.specPatch = request.config;
  }
  return request;
}

function rememberValidation(request, validation) {
  if (!validation || !validation.ok || !validation.validationId || !validation.planHash) {
    return;
  }
  const key = planCacheKey(request);
  validationCache.set(key, {
    validationId: validation.validationId,
    validationPlanHash: validation.planHash,
    expiresAt: validation.validationExpiresAt || 0
  });
}

function attachCachedValidation(request) {
  if (!request || request.validationId) {
    return;
  }
  const cached = validationCache.get(planCacheKey(request));
  if (!cached) {
    return;
  }
  if (cached.expiresAt && cached.expiresAt < Date.now()) {
    validationCache.delete(planCacheKey(request));
    return;
  }
  request.validationId = cached.validationId;
  request.validationPlanHash = cached.validationPlanHash;
}

function planCacheKey(request) {
  return crypto.createHash("sha256").update(stableStringifyForPlan(request || {})).digest("hex");
}

function stableStringifyForPlan(value, depth = 0) {
  if (value === null || typeof value === "undefined") {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringifyForPlan(item, depth + 1)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value)
      .filter((key) => depth !== 0 || !isPlanHashIgnoredKey(key))
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringifyForPlan(value[key], depth + 1)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isPlanHashIgnoredKey(key) {
  return new Set([
    "validationId",
    "validationPlanHash",
    "planHash",
    "dryRun",
    "confirmationAccepted",
    "taskId",
    "toolRunId",
    "requestId",
    "clientJobKey",
    "clientSaveTo",
    "toolName"
  ]).has(key);
}

function requireString(args, key) {
  if (!args || typeof args[key] !== "string" || args[key].length === 0) {
    throw new Error(`${key} is required`);
  }
}

function pickQuery(args, keys) {
  const result = {};
  const source = args || {};
  keys.forEach((key) => {
    const value = source[key];
    if (typeof value !== "undefined" && value !== null && String(value).length > 0) {
      result[key] = value;
    }
  });
  return result;
}

function normalizeAssetQuery(args) {
  const query = pickQuery(args, ["type", "themeName", "query", "page", "pageSize"]);
  return query;
}

async function selectAssetSources(args, toolName) {
  requireString(args, "type");
  const count = clampNumber(args.count, 10, 1, 100);
  const query = normalizeAssetQuery(Object.assign({}, args, {
    page: args.page || 1,
    pageSize: args.pageSize || count
  }));
  const hasSearchFilter = Boolean(query.query);
  const route = hasSearchFilter ? "/assetLibrary/search" : "/assetLibrary/items";
  const response = await client.requestJson("GET", withQuery(route, query), undefined, args || {}, toolName);
  const items = unwrapList(response).filter((item) => assetItemPath(item)).slice(0, count);
  const result = {
    ok: true,
    type: args.type,
    themeName: args.themeName || "",
    query: args.query || "",
    total: response && response.data && typeof response.data.total !== "undefined" ? response.data.total : items.length,
    returned: items.length,
    items: items.map(summarizeAssetItem),
    sources: []
  };
  if (args.type === "audio") {
    result.audioExternal = items.length > 0 ? buildAudioExternal(items[0], args) : null;
    result.audioTracks = items.map((item) => buildAudioExternal(item, args));
  } else {
    result.sources = items.map((item, index) => buildCompositionSource(item, index, args));
  }
  return result;
}

function unwrapList(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  if (response && response.data && Array.isArray(response.data.list)) {
    return response.data.list;
  }
  if (response && Array.isArray(response.list)) {
    return response.list;
  }
  return [];
}

function summarizeAssetItem(item) {
  return {
    fileName: assetItemName(item),
    displayName: item.displayName || assetItemName(item),
    path: assetItemPath(item),
    size: item.size || item.fileSize || 0,
    themeName: item.themeName || "",
    type: item.type || ""
  };
}

function buildCompositionSource(item, index, args) {
  const source = {
    id: `clip_${index}`,
    path: assetItemPath(item),
    fit: {
      mode: args.fitMode || "center_crop"
    }
  };
  source.asset = item.themeName ? { themeName: item.themeName } : undefined;
  if (args.type === "image") {
    source.durationUs = clampNumber(args.imageDurationUs, 3000000, 500000, 30000000);
  }
  if (args.type === "video") {
    const startUs = Number(args.videoTrimStartUs || 0);
    const endUs = Number(args.videoTrimEndUs || 0);
    if (startUs > 0 || endUs > 0) {
      source.trim = {};
      if (startUs > 0) {
        source.trim.startUs = startUs;
      }
      if (endUs > 0) {
        source.trim.endUs = endUs;
      }
    }
    source.audio = {
      mute: args.muteOriginalAudio !== false,
      volume: args.muteOriginalAudio === false ? 1 : 0
    };
  }
  return source;
}

function buildAudioExternal(item, args) {
  return {
    enabled: true,
    path: assetItemPath(item),
    displayName: item.displayName || assetItemName(item),
    volume: typeof args.audioVolume === "number" ? args.audioVolume : 1,
    endMode: args.audioEndMode || "loop_to_video",
    asset: item.themeName ? { themeName: item.themeName } : undefined
  };
}

function assetItemPath(item) {
  return item && (item.path || item.assetPath || item.appPath || item.filePath || "");
}

function assetItemName(item) {
  const itemPath = assetItemPath(item);
  return item && (item.fileName || item.displayName || item.name || (itemPath ? pathModule.basename(itemPath) : ""));
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

async function listTransitions(args, toolName) {
  const capabilities = await client.requestJson("GET", "/media/capabilities", undefined, args || {}, toolName);
  const catalog = capabilities.transitionCatalog || {};
  const filtered = filterCatalogItems(catalog.items || [], args || {}, {
    includeAutoSelectable: true,
    queryFields: ["id", "name", "assetPath", "group", "status", "tags"]
  });
  return {
    ok: true,
    filters: filtered.filters,
    total: filtered.total,
    returned: filtered.items.length,
    defaultAssetPath: catalog.defaultAssetPath || "",
    verifiedOnlyForAuto: Boolean(catalog.verifiedOnlyForAuto),
    durationRangeUs: catalog.durationRangeUs || {},
    tagDictionary: catalog.tagDictionary || [],
    items: filtered.items
  };
}

async function getTransition(args, toolName) {
  const assetPath = normalizeFilterText(args.assetPath);
  const id = normalizeFilterText(args.id);
  if (!assetPath && !id) {
    throw new Error("assetPath or id is required");
  }
  const capabilities = await client.requestJson("GET", "/media/capabilities", undefined, args || {}, toolName);
  const catalog = capabilities.transitionCatalog || {};
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  const item = items.find((candidate) => {
    return assetPath && normalizeFilterText(candidate.assetPath) === assetPath
      || id && normalizeFilterText(candidate.id) === id;
  });
  if (!item) {
    return {
      ok: false,
      code: "transition_not_found",
      message: `Transition not found: ${args.assetPath || args.id}`,
      defaultAssetPath: catalog.defaultAssetPath || ""
    };
  }
  return {
    ok: true,
    transition: item,
    defaultAssetPath: catalog.defaultAssetPath || "",
    verifiedOnlyForAuto: Boolean(catalog.verifiedOnlyForAuto)
  };
}

async function getStickerCapabilities(args, toolName) {
  const capabilities = await client.requestJson("GET", "/media/capabilities", undefined, args || {}, toolName);
  const stickerCapabilities = capabilities.assetCapabilities?.stickerCapabilities || {};
  return {
    ok: true,
    stickerCapabilities
  };
}

async function listStickerAnimations(args, toolName) {
  const capabilities = await client.requestJson("GET", "/media/capabilities", undefined, args || {}, toolName);
  const stickerCapabilities = capabilities.assetCapabilities?.stickerCapabilities || {};
  const catalog = Array.isArray(stickerCapabilities.animationCatalog)
    ? stickerCapabilities.animationCatalog
    : [];
  const filtered = filterCatalogItems(catalog, args || {}, {
    queryFields: ["id", "name", "group", "status", "tags"]
  });
  return {
    ok: true,
    filters: filtered.filters,
    total: filtered.total,
    returned: filtered.items.length,
    animationSlots: stickerCapabilities.animationSlots || [],
    items: filtered.items
  };
}

function withQuery(path, query) {
  const params = new URLSearchParams();
  Object.keys(query || {}).forEach((key) => {
    params.set(key, String(query[key]));
  });
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

function sendMessage(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function sendResult(id, result) {
  sendMessage({ jsonrpc: "2.0", id, result });
}

function sendError(id, error) {
  sendMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message: error && error.message ? error.message : String(error)
    }
  });
}

function readResource(uri) {
  if (uri !== "clipnode://workflow-guide") {
    throw new Error(`resource not found: ${uri}`);
  }
  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: workflowGuide
      }
    ]
  };
}

function getPrompt(name, args) {
  if (name !== "clipnode_media_task_workflow") {
    throw new Error(`prompt not found: ${name}`);
  }
  const userRequest = args && typeof args.user_request === "string" && args.user_request.length > 0
    ? `\n\nUser request:\n${args.user_request}`
    : "";
  return {
    description: "Use ClipNode Media MCP to run a local media task with validation and job polling.",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `${workflowGuide}${userRequest}`
        }
      }
    ]
  };
}

async function handleMessage(message) {
  if (!message || !message.method) {
    return;
  }
  const id = message.id;
  try {
    if (message.method === "initialize") {
      sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        serverInfo: {
          name: "clipnode-media-mcp",
          version: "0.1.0"
        }
      });
      return;
    }
    if (message.method === "tools/list") {
      sendResult(id, { tools });
      return;
    }
    if (message.method === "resources/list") {
      sendResult(id, { resources });
      return;
    }
    if (message.method === "resources/read") {
      const params = message.params || {};
      requireString(params, "uri");
      sendResult(id, readResource(params.uri));
      return;
    }
    if (message.method === "prompts/list") {
      sendResult(id, { prompts });
      return;
    }
    if (message.method === "prompts/get") {
      const params = message.params || {};
      requireString(params, "name");
      sendResult(id, getPrompt(params.name, params.arguments || {}));
      return;
    }
    if (message.method === "tools/call") {
      const params = message.params || {};
      const data = await handleTool(params.name, params.arguments || {});
      sendResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2)
          }
        ]
      });
      return;
    }
    if (typeof id !== "undefined") {
      sendError(id, new Error(`Unsupported method: ${message.method}`));
    }
  } catch (error) {
    if (typeof id !== "undefined") {
      sendError(id, error);
    }
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) {
      continue;
    }
    try {
      handleMessage(JSON.parse(line));
    } catch (error) {
      sendError(null, error);
    }
  }
});
