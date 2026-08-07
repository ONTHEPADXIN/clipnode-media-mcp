const path = require("path");

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function compactItems(items) {
  return items.slice(0, 5).map((item) => ({
    name: itemName(item),
    path: itemPath(item) || item.dirPath || "",
    size: item.size || item.fileSize || 0,
    durationUs: item.durationUs || 0,
  }));
}

function firstDirPath(response) {
  const dirs = unwrapList(response);
  const first = dirs.find((item) => item && (item.dirPath || item.path));
  return first ? first.dirPath || first.path : "";
}

function itemPath(item) {
  return item && (item.path || item.assetPath || item.filePath || item.appPath || "");
}

function itemName(item) {
  return item && (item.name || item.fileName || item.displayName || path.basename(itemPath(item) || item.dirPath || ""));
}

function chooseImages(items, count = 5) {
  return items
    .filter((item) => {
      const filePath = itemPath(item).toLowerCase();
      return filePath.endsWith(".jpg")
        || filePath.endsWith(".jpeg")
        || filePath.endsWith(".png")
        || filePath.endsWith(".webp")
        || filePath.endsWith(".bmp");
    })
    .slice(0, count);
}

function chooseVideo(items) {
  return items.find((item) => {
    const filePath = itemPath(item).toLowerCase();
    return filePath.endsWith(".mp4") || filePath.endsWith(".mov") || filePath.endsWith(".mkv");
  });
}

function chooseGif(items) {
  return items.find((item) => itemPath(item).toLowerCase().endsWith(".gif"));
}

function choose3dTransition(capabilities) {
  const items = capabilities.transitionCatalog?.items || [];
  return items.find((item) => {
    const tags = item.tags || [];
    const name = `${item.name || ""} ${item.assetPath || ""}`.toLowerCase();
    return tags.includes("3d") && (name.includes("book") || name.includes("flip"));
  }) || items.find((item) => (item.tags || []).includes("3d"));
}

function transitionTagsOf(item) {
  return (item?.tags || []).map(normalizeText).filter(Boolean);
}

function normalizeTransitionTags(options = {}) {
  const tags = [];
  if (options.transitionTag) {
    tags.push(options.transitionTag);
  }
  if (Array.isArray(options.transitionTags)) {
    tags.push(...options.transitionTags);
  }
  return [...new Set(tags.map(normalizeText).filter(Boolean))];
}

function hasAllTags(item, tags) {
  if (tags.length <= 0) {
    return true;
  }
  const itemTags = new Set(transitionTagsOf(item));
  return tags.every((tag) => itemTags.has(tag));
}

function isRecommendedTransition(item) {
  return Boolean(item?.autoSelectable);
}

async function requestTransitionList(client, request, timeoutMs) {
  const response = await client.callTool("clipnode_media_list_transitions", request, timeoutMs);
  return unwrapList(response).filter((item) => item && item.assetPath);
}

async function listRecommendedTransitions(client, options = {}) {
  const tags = normalizeTransitionTags(options);
  const taskId = options.taskId;
  const timestamp = options.timestamp || Date.now();
  const limit = options.limit || 100;
  const timeoutMs = options.timeoutMs || 30000;
  const requestIdPrefix = options.requestIdPrefix || "clipnode_transitions";
  const toolRunIdPrefix = options.toolRunIdPrefix || "list_transitions";
  const attempts = [];
  const tagFilter = tags.length === 1
    ? { tag: tags[0] }
    : tags.length > 1
      ? { tags, tagsMode: options.tagsMode || "all" }
      : {};

  if (tags.length > 0) {
    attempts.push({ ...tagFilter, autoSelectable: true });
    attempts.push(tagFilter);
  }
  attempts.push({ autoSelectable: true });
  attempts.push({});

  for (let index = 0; index < attempts.length; index++) {
    const request = {
      taskId,
      toolRunId: `${toolRunIdPrefix}_${timestamp}_${index}`,
      requestId: `${requestIdPrefix}_${timestamp}_${index}`,
      limit,
      ...attempts[index],
    };
    const items = await requestTransitionList(client, request, timeoutMs);
    if (items.length > 0) {
      return {
        items,
        source: "list_transitions",
        filter: attempts[index],
        requestedTags: tags,
      };
    }
  }

  const capabilities = await client.callTool("clipnode_media_get_capabilities", {}, timeoutMs);
  const catalogItems = (capabilities.transitionCatalog?.items || []).filter((item) => item && item.assetPath);
  const taggedItems = catalogItems.filter((item) => hasAllTags(item, tags));
  const recommendedTaggedItems = taggedItems.filter(isRecommendedTransition);
  if (recommendedTaggedItems.length > 0) {
    return {
      items: recommendedTaggedItems.slice(0, limit),
      source: "capabilities",
      filter: { tags, recommended: true },
      requestedTags: tags,
    };
  }
  if (taggedItems.length > 0) {
    return {
      items: taggedItems.slice(0, limit),
      source: "capabilities",
      filter: { tags },
      requestedTags: tags,
    };
  }
  return {
    items: catalogItems.filter(isRecommendedTransition).slice(0, limit),
    source: "capabilities",
    filter: { recommended: true },
    requestedTags: tags,
  };
}

module.exports = {
  choose3dTransition,
  chooseGif,
  chooseImages,
  chooseVideo,
  compactItems,
  firstDirPath,
  itemName,
  itemPath,
  listRecommendedTransitions,
  normalizeTransitionTags,
  transitionTagsOf,
  unwrapList,
};
