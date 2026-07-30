const os = require("os");
const path = require("path");
const { createMcpClient, log } = require("./lib/mcp-client");
const {
  beginTask,
  configure,
  createTask,
  downloadOutput,
  validateTask,
  waitForJob,
} = require("./lib/job-flow");
const { itemName, itemPath, unwrapList } = require("./lib/media-select");

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

function numberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickDir(dirs, keyword) {
  const needle = String(keyword || "").toLowerCase();
  return dirs.find((item) => {
    const dirPath = String(item.dirPath || item.path || "").toLowerCase();
    const name = String(item.name || item.displayName || "").toLowerCase();
    return dirPath.includes(needle) || name.includes(needle);
  }) || dirs[0];
}

function isStillImage(item) {
  const filePath = itemPath(item).toLowerCase();
  return filePath.endsWith(".jpg")
    || filePath.endsWith(".jpeg")
    || filePath.endsWith(".png")
    || filePath.endsWith(".webp")
    || filePath.endsWith(".bmp");
}

function buildRequest(options) {
  const {
    taskId,
    requestId,
    timestamp,
    sources,
    layoutMode,
    outputRatio,
    outputWidth,
    outputHeight,
    spacingPx,
    paddingPx,
    imageQuality,
  } = options;
  return {
    taskId,
    requestId,
    clientJobKey: `image_compose_${timestamp}`,
    type: "image_compose",
    taskType: "image_compose",
    sources: sources.map((sourcePath, index) => ({
      id: `image_${index + 1}`,
      path: sourcePath,
      fitMode: "center_crop",
    })),
    imageCompose: {
      layoutMode,
      outputRatio,
      outputWidth,
      outputHeight,
      spacingPx,
      paddingPx,
      backgroundColor: 0xffffffff,
      transparentBackground: imageQuality >= 100,
      fitMode: "center_crop",
    },
    export: {
      outputName: `clipnode_image_compose_${timestamp}.png`,
      imageQuality,
    },
  };
}

async function main() {
  const args = argsFromArgv(process.argv);
  const timestamp = Date.now();
  const count = Math.max(2, Math.min(16, numberArg(args.count, 4)));
  const layoutMode = args.layout || "auto_grid";
  const outputRatio = args.ratio || "1:1";
  const outputWidth = numberArg(args.width, 1080);
  const outputHeight = numberArg(args.height, 1080);
  const spacingPx = numberArg(args.spacing, 8);
  const paddingPx = numberArg(args.padding, 0);
  const imageQuality = numberArg(args.quality, 100);
  const saveTo = args.saveTo || path.join(os.tmpdir(), `clipnode_image_compose_${timestamp}.png`);

  const client = createMcpClient({
    session: `clipnode_image_compose_${timestamp}`,
  });
  await client.start();
  try {
    await client.initialize({ name: "codex-clipnode-image-compose-test", version: "1.0.0" });
    await configure(client);

    const { taskId } = await beginTask(client, {
      title: "MCP image compose",
      requestId: `image_compose_begin_${timestamp}`,
    });

    const dirsResult = await client.callTool("clipnode_media_list_image_dirs", {
      taskId,
      requestId: `image_compose_dirs_${timestamp}`,
    });
    const dirs = unwrapList(dirsResult);
    if (!dirs.length) {
      throw new Error("No phone image dirs returned.");
    }
    const dir = pickDir(dirs, args.dir || args.dirKeyword);
    log("IMAGE_DIR", dir);

    const imagesResult = await client.callTool("clipnode_media_list_images", {
      taskId,
      requestId: `image_compose_list_${timestamp}`,
      dirPath: dir.path || dir.dirPath,
      pageSize: Math.max(60, count * 4),
    });
    const images = unwrapList(imagesResult).filter(isStillImage);
    if (images.length < count) {
      throw new Error(`Need ${count} still images, got ${images.length}.`);
    }
    const selected = images.slice(0, count);
    log("SELECTED_IMAGES", selected.map((item) => ({
      name: itemName(item),
      path: itemPath(item),
    })));

    const request = buildRequest({
      taskId,
      requestId: `image_compose_request_${timestamp}`,
      timestamp,
      sources: selected.map(itemPath),
      layoutMode,
      outputRatio,
      outputWidth,
      outputHeight,
      spacingPx,
      paddingPx,
      imageQuality,
    });

    const validation = await validateTask(client, request, { timeoutMs: 60000 });
    log("VALIDATION", {
      validationId: validation.validationId,
      planHash: validation.planHash,
      summary: validation.planSummary?.readableText,
    });

    if (String(args.validateOnly || "false") === "true") {
      return;
    }

    const { jobId } = await createTask(client, request, 60000);
    const finalStatus = await waitForJob(client, {
      taskId,
      jobId,
      requestIdPrefix: `image_compose_status_${timestamp}`,
      attempts: numberArg(args.polls, 80),
      intervalMs: numberArg(args.intervalMs, 3000),
    });
    if (finalStatus.status !== "success") {
      throw new Error(`image_compose failed: ${JSON.stringify(finalStatus)}`);
    }
    await downloadOutput(client, {
      taskId,
      requestId: `image_compose_download_${timestamp}`,
      outputPath: finalStatus.outputPath,
      mediaType: "image",
      saveTo,
    });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
