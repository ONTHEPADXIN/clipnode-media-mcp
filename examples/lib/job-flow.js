const { log, sleep } = require("./mcp-client");

const TERMINAL_STATUSES = new Set(["success", "failed", "canceled"]);

function taskIdFrom(beginResult) {
  return beginResult.taskId || beginResult.task?.taskId || "";
}

function jobIdFrom(createResult) {
  return createResult.jobId || createResult.data?.jobId || "";
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function pathSegments(path) {
  const segments = [];
  String(path || "").split(".").forEach((part) => {
    const matcher = /([^\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = matcher.exec(part)) !== null) {
      segments.push(typeof match[2] !== "undefined" ? Number(match[2]) : match[1]);
    }
  });
  return segments;
}

function applyPathValuePatch(target, patch) {
  if (!target || !patch || typeof patch !== "object") {
    return target;
  }
  for (const [path, value] of Object.entries(patch)) {
    const segments = pathSegments(path);
    if (segments.length <= 0) {
      continue;
    }
    let cursor = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      const nextKey = segments[i + 1];
      if (typeof cursor[key] === "undefined" || cursor[key] === null) {
        cursor[key] = typeof nextKey === "number" ? [] : {};
      }
      cursor = cursor[key];
    }
    cursor[segments[segments.length - 1]] = value;
  }
  return target;
}

function applySuggestedFix(request, suggestedFix) {
  if (!suggestedFix || suggestedFix.type !== "patch" || suggestedFix.patchFormat !== "path_value") {
    return false;
  }
  applyPathValuePatch(request, suggestedFix.patch);
  delete request.validationId;
  delete request.validationPlanHash;
  delete request.planHash;
  return true;
}

function safeIdPart(value, fallback) {
  const normalized = String(value || fallback || "media")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback || "media";
}

function baseToolRunId(request) {
  return safeIdPart(
    request?.toolRunId
      || request?.clientJobKey
      || request?.requestId
      || request?.taskType
      || request?.type,
    "media"
  );
}

function requestForToolPhase(request, phase) {
  const cloned = cloneJson(request);
  cloned.toolRunId = `${safeIdPart(phase, "tool")}_${baseToolRunId(request)}`;
  return cloned;
}

function defaultJobSummary(status) {
  return {
    jobId: status.jobId,
    type: status.type,
    status: status.status,
    stage: status.stage,
    progress: status.progress,
    frameCount: status.frameCount,
    durationUs: status.durationUs,
    outputPath: status.outputPath,
    error: status.error,
  };
}

async function configure(client) {
  return client.callTool("clipnode_media_configure", {
    baseUrl: client.baseUrl,
    pin: client.pin,
  });
}

async function beginTask(client, { title, requestId }) {
  const begin = await client.callTool("clipnode_task_begin", { title, requestId });
  const taskId = taskIdFrom(begin);
  if (!taskId) {
    throw new Error(`missing taskId: ${JSON.stringify(begin)}`);
  }
  return { begin, taskId };
}

async function validateTask(client, request, options = {}) {
  const validationRequest = options.preserveToolRunId
    ? cloneJson(request)
    : requestForToolPhase(request, "validate");
  const validation = await client.callTool(
    "clipnode_media_validate_task",
    validationRequest,
    options.timeoutMs || 60000
  );
  if (!validation.ok) {
    throw new Error(`validation failed: ${JSON.stringify(validation)}`);
  }
  // Keep the validated token on the original request so createTask can work
  // even when the MCP bridge validation cache is not available.
  if (request && validation.validationId) {
    request.validationId = validation.validationId;
  }
  if (request && validation.planHash) {
    request.validationPlanHash = validation.planHash;
  }
  return validation;
}

async function validateTaskWithSuggestedFixes(client, request, options = {}) {
  const maxFixes = Number.isFinite(options.maxFixes) ? options.maxFixes : 3;
  const applyWarningFixes = options.applyWarningFixes !== false;
  const history = [];
  let latest = null;
  for (let attempt = 0; attempt <= maxFixes; attempt++) {
    latest = await validateTask(client, request, {
      preserveToolRunId: options.preserveToolRunId,
      timeoutMs: options.timeoutMs || 60000,
    });
    history.push({
      attempt,
      ok: latest.ok,
      warningCodes: (latest.warnings || []).map((item) => item.code),
      suggestedFixId: latest.suggestedFix?.id || "",
      suggestedFixPatch: latest.suggestedFix?.patch || null,
      planSummary: latest.planSummary,
    });
    const shouldApplyFix = applyWarningFixes
      && latest.ok
      && latest.suggestedFix
      && latest.suggestedFix.type === "patch";
    if (!shouldApplyFix || attempt >= maxFixes) {
      break;
    }
    if (!applySuggestedFix(request, latest.suggestedFix)) {
      break;
    }
  }
  return { validation: latest, history };
}

async function createTask(client, request, timeoutMs = 60000, options = {}) {
  const createRequest = options.preserveToolRunId
    ? cloneJson(request)
    : requestForToolPhase(request, "create");
  const created = await client.callTool("clipnode_media_create_task", createRequest, timeoutMs);
  const jobId = jobIdFrom(created);
  if (!jobId) {
    throw new Error(`missing jobId: ${JSON.stringify(created)}`);
  }
  return { created, jobId };
}

async function waitForJob(client, options) {
  const {
    taskId,
    jobId,
    requestIdPrefix,
    attempts = 120,
    intervalMs = 3000,
    timeoutMs = 45000,
    summarize = defaultJobSummary,
    logLabel = "JOB_STATUS",
  } = options;
  let latest = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    latest = await client.callTool("clipnode_media_get_job_status", {
      taskId,
      requestId: `${requestIdPrefix}_${attempt}`,
      jobId,
    }, timeoutMs);
    log(logLabel, summarize(latest));
    if (TERMINAL_STATUSES.has(latest.status)) {
      return latest;
    }
    await sleep(intervalMs);
  }
  throw new Error(`job polling timed out: ${JSON.stringify(latest)}`);
}

async function downloadOutput(client, options, timeoutMs = 180000) {
  const download = await client.callTool("clipnode_media_download_file", options, timeoutMs);
  log("DOWNLOAD", download);
  return download;
}

async function logTaskStatus(client, taskId, summarize) {
  const taskStatus = await client.callTool("clipnode_task_get_status", { taskId });
  log("TASK_STATUS", summarize ? summarize(taskStatus) : {
    taskId: taskStatus.taskId,
    status: taskStatus.status,
    progress: taskStatus.progress,
    current: taskStatus.summary?.current,
    outputCandidates: taskStatus.outputCandidates,
    toolRunIds: Object.keys(taskStatus.toolRuns || {}),
  });
  return taskStatus;
}

module.exports = {
  applyPathValuePatch,
  applySuggestedFix,
  beginTask,
  configure,
  createTask,
  defaultJobSummary,
  downloadOutput,
  jobIdFrom,
  logTaskStatus,
  taskIdFrom,
  validateTask,
  validateTaskWithSuggestedFixes,
  waitForJob,
};
