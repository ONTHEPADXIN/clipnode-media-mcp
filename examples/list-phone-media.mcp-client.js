const { createMcpClient, log } = require("./lib/mcp-client");
const { compactItems, firstDirPath, unwrapList } = require("./lib/media-select");

const baseUrl = process.env.CLIPNODE_BASE_URL || "";
const pin = process.env.CLIPNODE_PIN || "";
const timestamp = Date.now();
const client = createMcpClient({ baseUrl, pin, session: `codex_list_media_${timestamp}` });

async function main() {
  await client.initialize({ name: "codex-clipnode-list-media-smoke", version: "1.0.0" });

  const configured = await client.callTool("clipnode_media_configure", {
    baseUrl,
    pin,
  });
  log("CONFIGURE", configured);

  const listedTools = await client.send("tools/list", {});
  log("TOOLS", {
    hasVideoDirs: listedTools.tools.some((tool) => tool.name === "clipnode_media_list_video_dirs"),
    hasVideos: listedTools.tools.some((tool) => tool.name === "clipnode_media_list_videos"),
    hasImageDirs: listedTools.tools.some((tool) => tool.name === "clipnode_media_list_image_dirs"),
    hasImages: listedTools.tools.some((tool) => tool.name === "clipnode_media_list_images"),
  });

  const videoDirs = await client.callTool("clipnode_media_list_video_dirs", {
    requestId: `codex_list_video_dirs_${timestamp}`,
  });
  const videoDirPath = firstDirPath(videoDirs);
  log("VIDEO_DIRS", {
    count: unwrapList(videoDirs).length,
    firstDirPath: videoDirPath,
    sample: compactItems(unwrapList(videoDirs)),
  });

  const videos = await client.callTool("clipnode_media_list_videos", {
    requestId: `codex_list_videos_${timestamp}`,
    dirPath: videoDirPath,
    page: 1,
    pageSize: 5,
  });
  log("VIDEOS", {
    page: videos.data?.page || videos.page,
    pageSize: videos.data?.pageSize || videos.pageSize,
    hasMore: videos.data?.hasMore || videos.hasMore || false,
    count: unwrapList(videos).length,
    sample: compactItems(unwrapList(videos)),
  });

  const imageDirs = await client.callTool("clipnode_media_list_image_dirs", {
    requestId: `codex_list_image_dirs_${timestamp}`,
  });
  const imageDirPath = firstDirPath(imageDirs);
  log("IMAGE_DIRS", {
    count: unwrapList(imageDirs).length,
    firstDirPath: imageDirPath,
    sample: compactItems(unwrapList(imageDirs)),
  });

  const images = await client.callTool("clipnode_media_list_images", {
    requestId: `codex_list_images_${timestamp}`,
    dirPath: imageDirPath,
    page: 1,
    pageSize: 5,
  });
  log("IMAGES", {
    page: images.data?.page || images.page,
    pageSize: images.data?.pageSize || images.pageSize,
    hasMore: images.data?.hasMore || images.hasMore || false,
    count: unwrapList(images).length,
    sample: compactItems(unwrapList(images)),
  });
}

main().catch((error) => {
  console.error("ERROR", error);
  process.exitCode = 1;
}).finally(() => {
  client.close();
});
