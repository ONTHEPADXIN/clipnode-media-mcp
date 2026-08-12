#!/usr/bin/env node

const path = require("path");
const { createMcpClient, sleep } = require("./lib/mcp-client");

const LEVELS = new Set([
  "connectivity",
  "readonly",
  "validate",
  "apply-undo",
  "export-validate",
  "export-create",
  "video-image-composition",
  "safe-suite"
]);

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.CLIPNODE_BASE_URL || "",
    pin: process.env.CLIPNODE_PIN || "",
    level: "safe-suite",
    server: path.join(__dirname, "..", "scripts", "clipnode-media-mcp-server.js"),
    allowExportCreate: false,
    includeStickerApply: false,
    includeTextStickerAction: false,
    settleMs: 800
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
    } else if (key === "--level") {
      args.level = value || "";
      i++;
    } else if (key === "--server") {
      args.server = value || "";
      i++;
    } else if (key === "--allow-export-create") {
      args.allowExportCreate = true;
    } else if (key === "--include-sticker-apply") {
      args.includeStickerApply = true;
    } else if (key === "--include-text-sticker-action") {
      args.includeTextStickerAction = true;
    } else if (key === "--settle-ms") {
      args.settleMs = Number(value) || args.settleMs;
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
  node examples/live-session-edit-regression.mcp-client.js \\
    --base-url http://host:port --pin 123456 --level safe-suite

Levels:
  connectivity     MCP/tools/auth/capabilities only
  readonly         current_state compact/full and patchGrammar checks
  validate         validate-only section/object patches
  apply-undo       apply one small section patch, verify full state, undo
  export-validate  read-only live export preflight
  export-create    start real live export; requires --allow-export-create
  safe-suite       connectivity + readonly + validate + apply-undo + export-validate

Optional mutating checks:
  --include-text-sticker-action  add a text sticker, verify idMap/stable state, then undo
  --include-sticker-apply        allow apply-undo to move an existing sticker when no section candidate exists`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.baseUrl || !args.pin || !LEVELS.has(args.level)) {
    printHelp();
    throw new Error("--base-url, --pin, and a valid --level are required");
  }

  const client = createMcpClient({
    baseUrl: args.baseUrl,
    pin: args.pin,
    serverPath: args.server,
    session: `clipnode_live_edit_regression_${Date.now()}`
  });
  const context = { client, args, state: null };
  try {
    await client.initialize({ name: "clipnode-live-edit-regression", version: "1.0.0" });
    const levels = expandLevels(args.level);
    if (levels.includes("connectivity")) {
      await runConnectivity(context);
    }
    if (levels.includes("readonly")) {
      await runReadonly(context);
    }
    if (levels.includes("validate")) {
      await runValidate(context);
    }
    if (levels.includes("apply-undo")) {
      await runApplyUndo(context);
    }
    if (args.includeTextStickerAction) {
      await runTextStickerActionUndo(context);
    }
    if (levels.includes("export-validate")) {
      await runExportValidate(context);
    }
    if (levels.includes("export-create")) {
      await runExportCreate(context);
    }

    if (levels.includes("video-image-composition")) {
      await runVideoImageCompositionRegression(context);
    }
    console.log("[done] live session edit regression passed");
  } finally {
    client.close();
  }
}

function expandLevels(level) {
  if (level === "safe-suite") {
    return ["connectivity", "readonly", "validate", "apply-undo", "export-validate"];
  }
  if (level === "video-image-composition") {
    return ["video-image-composition"];
  }
  return [level];
}


async function runVideoImageCompositionRegression(context) {
  const { client } = context;
  const video1 = "/storage/emulated/0/Movies/Screen Recorder/26-07-13-22-03-44.mp4";
  const video2 = "/storage/emulated/0/Movies/Screen Recorder/26-07-13-21-52-50.mp4";
  const image1 = "/storage/emulated/0/Pictures/Screenshots/Screenshot_20260804-184143.jpg";
  const stateBefore = await getState(context, false);
  const probe = await client.callTool("clipnode_media_probe_sources", {
    sources: [
      { id: "v1", path: video1, includeFrameTimeline: true, includeKeyFrameTimeline: true, frameTimelineMode: "full" },
      { id: "v2", path: video2, includeFrameTimeline: true, includeKeyFrameTimeline: true, frameTimelineMode: "full" },
      { id: "img1", path: image1 }
    ],
    includeFrameTimeline: true,
    includeKeyFrameTimeline: true,
    frameTimelineMode: "full"
  }, 120000);
  const v1 = (probe.sources || []).find((item) => item.id === "v1");
  const v2 = (probe.sources || []).find((item) => item.id === "v2");
  const img = (probe.sources || []).find((item) => item.id === "img1");
  if (!v1 || !v2 || !img) {
    throw new Error(`probe failed: ${JSON.stringify(probe)}`);
  }
  const videoPatches = [
    {
      type: "objectPatch",
      collection: "compositionSegments",
      op: "add",
      clientTempId: "ai_video_1",
      value: {
        index: 0,
        path: v1.path,
        sourceType: "video",
        width: v1.width || v1.displayWidth,
        height: v1.height || v1.displayHeight,
        sourceDurationUs: v1.durationUs,
        sourceStartUs: 0,
        sourceEndUs: v1.durationUs,
        frameTimeline: { values: (v1.frameTimeline && v1.frameTimeline.values) || [] },
        keyFrameTimeline: { values: (v1.keyFrameTimeline && v1.keyFrameTimeline.values) || [] },
        fitMode: "center_inside"
      }
    },
    {
      type: "objectPatch",
      collection: "compositionSegments",
      op: "add",
      clientTempId: "ai_video_2",
      value: {
        index: 1,
        path: v2.path,
        sourceType: "video",
        width: v2.width || v2.displayWidth,
        height: v2.height || v2.displayHeight,
        sourceDurationUs: v2.durationUs,
        sourceStartUs: 0,
        sourceEndUs: v2.durationUs,
        frameTimeline: { values: (v2.frameTimeline && v2.frameTimeline.values) || [] },
        keyFrameTimeline: { values: (v2.keyFrameTimeline && v2.keyFrameTimeline.values) || [] },
        fitMode: "center_inside"
      }
    }
  ];
  const addVideos = await client.callTool("clipnode_edit_apply_patch", {
    sessionId: stateBefore.sessionId,
    baseRevision: stateBefore.revision,
    patches: videoPatches
  }, 180000);
  if (!addVideos.ok) {
    throw new Error(`add videos failed: ${JSON.stringify(addVideos)}`);
  }
  const stateAfterVideos = await getState(context, false);
  const imagePatch = {
    type: "objectPatch",
    collection: "compositionSegments",
    op: "add",
    clientTempId: "ai_image_1",
    value: {
      index: 2,
      path: img.path,
      sourceType: "image",
      width: img.width || img.displayWidth,
      height: img.height || img.displayHeight,
      sourceDurationUs: 3000000,
      imageDurationUs: 3000000,
      sourceStartUs: 0,
      sourceEndUs: 3000000,
      fitMode: "center_inside"
    }
  };
  const addImage = await client.callTool("clipnode_edit_apply_patch", {
    sessionId: stateAfterVideos.sessionId,
    baseRevision: stateAfterVideos.revision,
    patches: [imagePatch]
  }, 180000);
  if (!addImage.ok) {
    throw new Error(`add image failed: ${JSON.stringify(addImage)}`);
  }
  const finalState = await getState(context, false);
  console.log("[ok] video-image regression", {
    revision: finalState.revision,
    segmentCount: finalState.state?.composition?.segments?.length || 0,
    transitionCount: finalState.state?.composition?.transitions?.length || 0
  });
}

async function runConnectivity(context) {
  const { client } = context;
  const list = await client.send("tools/list", {});
  const names = new Set((list.tools || []).map((tool) => tool.name));
  [
    "clipnode_media_configure",
    "clipnode_media_get_capabilities",
    "clipnode_edit_get_current_state",
    "clipnode_edit_validate_patch",
    "clipnode_edit_apply_patch",
    "clipnode_edit_undo",
    "clipnode_edit_redo",
    "clipnode_edit_validate_export",
    "clipnode_edit_create_export"
  ].forEach((name) => assert(names.has(name), `missing MCP tool: ${name}`));
  console.log(`[ok] MCP tools listed: ${names.size}`);

  const configured = await callToolStep(context, "configure/auth", "clipnode_media_configure", {
    baseUrl: context.args.baseUrl,
    pin: context.args.pin
  });
  assert(configured.ok !== false, `configure failed: ${JSON.stringify(configured)}`);
  console.log("[ok] ClipNode configure/auth passed");

  const capabilities = await callToolStep(context, "load capabilities", "clipnode_media_get_capabilities", {});
  assert(capabilities.ok !== false, `capabilities failed: ${JSON.stringify(capabilities)}`);
  console.log(`[ok] capabilities loaded: serviceVersion=${capabilities.serviceVersion || ""}`);
}

async function runReadonly(context) {
  const compact = await getState(context, true);
  assert(compact.ok === true, `compact current state failed: ${JSON.stringify(compact)}`);
  assert(compact.sessionId, "compact current state missing sessionId");
  assert(typeof compact.revision === "number", "compact current state missing revision");
  assert(compact.patchGrammar, "compact current state missing patchGrammar");
  assert(compact.patchGrammar.modeRules, "compact current state missing modeRules");
  assert(Array.isArray(compact.patchGrammar.sectionCapabilities), "missing sectionCapabilities");
  console.log(`[ok] compact state: session=${compact.sessionId}, revision=${compact.revision}`);

  const full = await getState(context, false);
  assert(full.ok === true, `full current state failed: ${JSON.stringify(full)}`);
  assert(full.state, "full current state missing state");
  assert(full.stateJson, "full current state missing stateJson");
  context.state = full;
  const mode = getMode(full);
  const sections = getAllowedSections(full);
  const collections = getAllowedCollections(full);
  const coverage = (full.patchGrammar.sectionCapabilities || [])
    .map((item) => `${item.section}:${item.completeForEditRuntime ? "timeline" : item.completeForSessionState ? "state" : "partial"}`)
    .join(",");
  console.log(`[ok] full state: mode=${mode}, revision=${full.revision}, sections=${sections.join("|")}, collections=${collections.join("|")}`);
  console.log(`[ok] section coverage: ${coverage}`);
}

async function runValidate(context) {
  const state = context.state || await getState(context, false);
  context.state = state;
  const candidates = buildSectionCandidates(state, false);
  assert(candidates.length > 0, `no validate candidate for mode=${getMode(state)}`);
  for (const candidate of candidates) {
    const result = await callToolStep(context, `validate ${candidate.name}`, "clipnode_edit_validate_patch", patchRequest(state, candidate.patch));
    assert(result.ok === true, `validate ${candidate.name} failed: ${JSON.stringify(result)}`);
    console.log(`[ok] validate patch: ${candidate.name}`);
  }
  const sticker = firstEditable(state, "stickers");
  if (sticker) {
    const patch = {
      type: "objectPatch",
      collection: "stickers",
      id: sticker.id,
      op: "merge",
      value: { x: numberOr(sticker.bounds && sticker.bounds.x, 0.5) }
    };
    const result = await callToolStep(context, `validate sticker ${sticker.id}`, "clipnode_edit_validate_patch", patchRequest(state, patch));
    assert(result.ok === true, `validate sticker merge failed: ${JSON.stringify(result)}`);
    console.log(`[ok] validate sticker objectPatch: ${sticker.id}`);
  }
  const segment = firstEditable(state, "compositionSegments");
  if (segment) {
    const patch = {
      type: "objectPatch",
      collection: "compositionSegments",
      id: segment.id,
      op: "merge",
      value: { fitMode: getPath(segment, "bounds.fitMode") || "center_crop" }
    };
    const result = await callToolStep(context, `validate composition segment ${segment.id}`, "clipnode_edit_validate_patch", patchRequest(state, patch));
    assert(result.ok === true, `validate composition segment merge failed: ${JSON.stringify(result)}`);
    console.log(`[ok] validate composition segment objectPatch: ${segment.id}`);
  }
  const transition = firstEditable(state, "compositionTransitions");
  if (transition) {
    const patch = {
      type: "objectPatch",
      collection: "compositionTransitions",
      id: transition.id,
      op: "merge",
      value: { durationUs: numberOr(getPath(transition, "source.durationUs"), 1800000) }
    };
    const result = await callToolStep(context, `validate composition transition ${transition.id}`, "clipnode_edit_validate_patch", patchRequest(state, patch));
    assert(result.ok === true, `validate composition transition merge failed: ${JSON.stringify(result)}`);
    console.log(`[ok] validate composition transition objectPatch: ${transition.id}`);
  }
}

async function runApplyUndo(context) {
  const before = await getState(context, false);
  context.state = before;
  const candidate = buildApplyCandidate(before, context.args.includeStickerApply);
  assert(candidate, `no apply candidate for mode=${getMode(before)}`);
  console.log(`[run] apply candidate: ${candidate.name}`);

  const validate = await callToolStep(context, `validate apply candidate ${candidate.name}`, "clipnode_edit_validate_patch", patchRequest(before, candidate.patch));
  assert(validate.ok === true, `apply candidate validate failed: ${JSON.stringify(validate)}`);

  const applied = await callToolStep(context, `apply ${candidate.name}`, "clipnode_edit_apply_patch", patchRequest(before, candidate.patch), 60000);
  assert(applied.ok === true, `apply failed: ${JSON.stringify(applied)}`);
  assert(applied.revision > before.revision, `revision did not advance after apply: ${JSON.stringify(applied)}`);
  console.log(`[ok] apply succeeded: revision ${before.revision} -> ${applied.revision}`);

  const immediate = await getState(context, false);
  console.log(`[info] immediate read ${candidate.verifyPath}=${JSON.stringify(getPath(immediate.state, candidate.verifyPath))}`);
  await sleep(context.args.settleMs);
  const after = await getState(context, false);
  assertEquals(candidate.expectedValue, getPath(after.state, candidate.verifyPath), `stable state mismatch at ${candidate.verifyPath}`);
  console.log(`[ok] stable read ${candidate.verifyPath}=${JSON.stringify(candidate.expectedValue)}`);

  const undo = await callToolStep(context, `undo ${candidate.name}`, "clipnode_edit_undo", { sessionId: before.sessionId }, 60000);
  assert(undo.ok === true, `undo failed: ${JSON.stringify(undo)}`);
  console.log(`[ok] undo succeeded: revision=${undo.revision}`);

  await sleep(context.args.settleMs);
  const restored = await getState(context, false);
  console.log(`[ok] post-undo read ${candidate.verifyPath}=${JSON.stringify(getPath(restored.state, candidate.verifyPath))}`);
  context.state = restored;
}

async function runTextStickerActionUndo(context) {
  const before = await getState(context, false);
  const allowedActions = new Set(getPath(before, "patchGrammar.modeRules.allowedActions") || []);
  if (!allowedActions.has("add_text_sticker")) {
    console.log(`[skip] add_text_sticker not supported for mode=${getMode(before)}`);
    context.state = before;
    return;
  }
  const clientTempId = `live_text_${Date.now()}`;
  const patch = {
    type: "actionPatch",
    action: "add_text_sticker",
    clientTempId,
    value: {
      x: 0.51,
      y: 0.79,
      scale: 0.72,
      startUs: 0,
      endUs: 5000000,
      text: {
        content: "AI live check",
        textSize: 36,
        color: "#FFFFFFFF"
      },
      textStyle: {
        bold: true,
        backgroundColor: "#66000000",
        horizontalPadding: 12,
        verticalPadding: 6
      },
      animation: {
        loopName: "blink"
      }
    },
    uiHint: {
      select: true
    }
  };

  const validate = await callToolStep(context, "validate text sticker action", "clipnode_edit_validate_patch", patchRequest(before, patch));
  assert(validate.ok === true, `text sticker validate failed: ${JSON.stringify(validate)}`);

  const applied = await callToolStep(context, "apply text sticker action", "clipnode_edit_apply_patch", patchRequest(before, patch), 60000);
  assert(applied.ok === true, `text sticker apply failed: ${JSON.stringify(applied)}`);
  const stickerId = applied.idMap && applied.idMap[clientTempId];
  assert(stickerId, `text sticker apply missing idMap.${clientTempId}: ${JSON.stringify(applied)}`);
  assert(
    Array.isArray(applied.pendingSections) && applied.pendingSections.includes("stickers"),
    `text sticker apply should report pending stickers: ${JSON.stringify(applied)}`
  );
  console.log(`[ok] text sticker apply idMap: ${clientTempId} -> ${stickerId}`);

  await sleep(Math.max(context.args.settleMs, 1200));
  const after = await getState(context, false);
  const sticker = findSticker(after, stickerId);
  assert(sticker, `stable state missing new sticker id=${stickerId}`);
  assertEquals("AI live check", getPath(sticker, "text.content"), "text sticker content mismatch");
  assertEquals(0.51, numberOr(sticker.x, -1), "text sticker x mismatch");
  assertEquals(0.79, numberOr(sticker.y, -1), "text sticker y mismatch");
  assertEquals(0.72, numberOr(sticker.scale, -1), "text sticker scale mismatch");
  console.log(`[ok] text sticker stable state verified: ${stickerId}`);

  const undo = await callToolStep(context, "undo text sticker action", "clipnode_edit_undo", { sessionId: before.sessionId }, 60000);
  assert(undo.ok === true, `text sticker undo failed: ${JSON.stringify(undo)}`);
  await sleep(Math.max(context.args.settleMs, 1200));
  const restored = await getState(context, false);
  assert(!findSticker(restored, stickerId), `text sticker still exists after undo: ${stickerId}`);
  console.log(`[ok] text sticker undo removed: ${stickerId}`);
  context.state = restored;
}

async function runExportValidate(context) {
  const state = context.state || await getState(context, false);
  const result = await callToolStep(context, "validate export", "clipnode_edit_validate_export", {
    sessionId: state.sessionId
  }, 60000);
  assert(result.ok !== false || result.code, `validate_export malformed: ${JSON.stringify(result)}`);
  assert(result.exportStatus, "validate_export missing exportStatus");
  if (result.plan) {
    assert(result.plan.specExport, "validate_export plan missing specExport");
    assert(result.plan.runtimeExport, "validate_export plan missing runtimeExport");
    if (result.plan.kind === "video") {
      assert(typeof result.plan.runtimeExport.width === "number", "video runtimeExport missing width");
      assert(typeof result.plan.runtimeExport.height === "number", "video runtimeExport missing height");
      assert(typeof result.plan.runtimeExport.fps === "number", "video runtimeExport missing fps");
      assert(typeof result.plan.runtimeExport.bitrate === "number", "video runtimeExport missing bitrate");
      const warnings = result.plan.warnings || [];
      assert(
        !warnings.some((warning) => String(warning).includes("not fully projected")),
        `video export runtime coverage warning should be gone: ${JSON.stringify(warnings)}`
      );
    }
  }
  console.log(`[ok] validate_export: ready=${result.ready}, code=${result.code || ""}, warnings=${JSON.stringify(result.plan && result.plan.warnings || [])}`);
}

async function runExportCreate(context) {
  if (!context.args.allowExportCreate) {
    throw new Error("export-create requires --allow-export-create because it starts a real App export");
  }
  const state = context.state || await getState(context, false);
  const result = await callToolStep(context, "create export", "clipnode_edit_create_export", {
    sessionId: state.sessionId
  }, 60000);
  assert(result.ok === true, `create_export failed: ${JSON.stringify(result)}`);
  console.log(`[ok] create_export started: ready=${result.ready}, started=${result.started}`);
}

async function getState(context, compact) {
  return callToolStep(context, `get_current_state compact=${compact}`, "clipnode_edit_get_current_state", {
    sessionId: "current",
    compact
  }, 60000);
}

async function callToolStep(context, label, name, args, timeoutMs) {
  const startedAt = Date.now();
  console.log(`[run] ${label}: ${name}`);
  const result = await context.client.callTool(name, args, timeoutMs);
  console.log(`[got] ${label}: ${Date.now() - startedAt}ms`);
  return result;
}

function buildSectionCandidates(state, applyOnly) {
  const allowed = new Set(getAllowedSections(state));
  const candidates = [];
  if (allowed.has("fit")) {
    const current = getPath(state.state, "fit.mode") || "center_crop";
    const mode = current === "center_inside" ? "center_crop" : "center_inside";
    candidates.push({
      name: "section:fit.mode",
      patch: sectionPatch("fit", { mode }),
      verifyPath: "fit.mode",
      expectedValue: mode
    });
  }
  if (allowed.has("imageCompose")) {
    const current = numberOr(getPath(state.state, "imageCompose.spacingDp"), 4);
    const spacing = current >= 48 ? 47 : current + 1;
    candidates.push({
      name: "section:imageCompose.spacingPx",
      patch: sectionPatch("imageCompose", { spacingPx: spacing }),
      verifyPath: "imageCompose.spacingDp",
      expectedValue: spacing
    });
  }
  if (!applyOnly && allowed.has("canvas")) {
    const current = getPath(state.state, "canvas.preset") || "original";
    const preset = current === "1:1" ? "original" : "1:1";
    candidates.push({
      name: "section:canvas.preset",
      patch: sectionPatch("canvas", { preset }),
      verifyPath: "canvas.preset",
      expectedValue: preset
    });
  }
  if (!applyOnly && allowed.has("gif")) {
    const current = numberOr(getPath(state.state, "gif.frameSpace"), 0);
    candidates.push({
      name: "section:gif.frameSpace",
      patch: sectionPatch("gif", { frameSpace: current + 1 }),
      verifyPath: "gif.frameSpace",
      expectedValue: current + 1
    });
  }
  if (!applyOnly && allowed.has("export")) {
    const current = numberOr(getPath(state.state, "export.imageQuality"), 100);
    const imageQuality = current > 90 ? 90 : current + 1;
    candidates.push({
      name: "section:export.imageQuality",
      patch: sectionPatch("export", { imageQuality }),
      verifyPath: "export.imageQuality",
      expectedValue: imageQuality
    });
    if (isVideoExportMode(state)) {
      const width = evenNumber(numberOr(
        getPath(state.state, "export.width"),
        numberOr(getPath(state.state, "canvas.width"), 640)
      ));
      const height = evenNumber(numberOr(
        getPath(state.state, "export.height"),
        numberOr(getPath(state.state, "canvas.height"), 640)
      ));
      candidates.push({
        name: "section:export.runtimeConfig",
        patch: sectionPatch("export", {
          width,
          height,
          fps: 30,
          bitrate: 1800000,
          bitrateFactor: 0.2
        }),
        verifyPath: "export.fps",
        expectedValue: 30
      });
    }
  }
  return candidates;
}

function buildApplyCandidate(state, includeStickerApply) {
  const section = buildSectionCandidates(state, true)[0];
  if (section) {
    return section;
  }
  const transition = firstEditable(state, "compositionTransitions");
  if (transition) {
    const index = numberOr(transition.index, 0);
    const current = numberOr(getPath(transition, "source.durationUs"), 1800000);
    const durationUs = current === 1200000 ? 1800000 : 1200000;
    return {
      name: `object:compositionTransition.durationUs:${transition.id}`,
      patch: {
        type: "objectPatch",
        collection: "compositionTransitions",
        id: transition.id,
        op: "merge",
        value: { durationUs }
      },
      verifyPath: `composition.transitions.${index}.durationUs`,
      expectedValue: durationUs
    };
  }
  const allowed = new Set(getAllowedSections(state));
  if (allowed.has("export")) {
    const current = numberOr(getPath(state.state, "export.imageQuality"), 100);
    const imageQuality = current > 90 ? 90 : current + 1;
    return {
      name: "section:export.imageQuality",
      patch: sectionPatch("export", { imageQuality }),
      verifyPath: "export.imageQuality",
      expectedValue: imageQuality
    };
  }
  if (includeStickerApply) {
    const sticker = firstEditable(state, "stickers");
    if (sticker) {
      const current = numberOr(sticker.bounds && sticker.bounds.x, 0.5);
      const x = Math.max(0.05, Math.min(0.95, current + 0.01));
      return {
        name: `object:sticker.x:${sticker.id}`,
        patch: {
          type: "objectPatch",
          collection: "stickers",
          id: sticker.id,
          op: "merge",
          value: { x }
        },
        verifyPath: stickerStatePath(state, sticker.id, "x"),
        expectedValue: x
      };
    }
  }
  return null;
}

function sectionPatch(section, value) {
  return { type: "sectionPatch", section, op: "merge", value };
}

function patchRequest(state, patch) {
  return {
    sessionId: state.sessionId || "current",
    baseRevision: state.revision,
    patches: [patch]
  };
}

function getMode(state) {
  return getPath(state, "state.type") || getPath(state, "stateSummary.type") || "";
}

function getAllowedSections(state) {
  return getPath(state, "patchGrammar.modeRules.allowedSections") || [];
}

function getAllowedCollections(state) {
  return getPath(state, "patchGrammar.modeRules.allowedObjectCollections") || [];
}

function isVideoExportMode(state) {
  return ["video_edit", "video_composition", "video_compress"].includes(getMode(state));
}

function firstEditable(state, collection) {
  return (state.editableIndex || []).find((item) => item && item.collection === collection);
}

function findSticker(state, id) {
  const items = getPath(state.state, "stickers.items") || [];
  return items.find((item) => item && item.id === id);
}

function stickerStatePath(state, id, field) {
  const items = getPath(state.state, "stickers.items") || [];
  const index = items.findIndex((item) => item && item.id === id);
  return index >= 0 ? `stickers.items.${index}.${field}` : `stickers.items.0.${field}`;
}

function getPath(object, dotted) {
  if (!object || !dotted) {
    return undefined;
  }
  return dotted.split(".").reduce((value, key) => {
    if (value == null) {
      return undefined;
    }
    if (/^\d+$/.test(key)) {
      return Array.isArray(value) ? value[Number(key)] : undefined;
    }
    return value[key];
  }, object);
}

function numberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function evenNumber(value) {
  const number = Math.max(2, Math.round(Number(value) || 2));
  return number % 2 === 0 ? number : number - 1;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(expected, actual, message) {
  if (typeof expected === "number" && typeof actual === "number") {
    if (Math.abs(expected - actual) <= 0.0001) {
      return;
    }
  } else if (expected === actual) {
    return;
  }
  throw new Error(`${message}; expected=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)}`);
}

main().catch((error) => {
  console.error(`[failed] ${error.stack || error.message}`);
  process.exit(1);
});
