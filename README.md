# ClipNode Media MCP

[中文说明](README.zh-CN.md)

ClipNode Media MCP connects MCP-compatible AI clients to the ClipNode Android app, enabling local video, GIF, image, and HLS media workflows on your phone.

The plugin has two parallel capability trees:

- Headless export tasks for request-driven creation, batchable recipes, and script-like finished outputs.
- Live session patching for the currently open edit page, where AI can follow a person's live editing intent and also shape reusable settings that later feed headless exports.

Both trees matter. Headless export tasks are the primary production flow, and live-session patching is the interactive design/edit flow that can feed the same future template and task system.

ClipNode currently requires the Android app. Install it from Google Play:
[ClipNode](https://play.google.com/store/apps/details?id=cn.com.onthepad.tailor)

## Read This First

If you want the AI to understand the full capability surface quickly, use the table below to pick the first branch.

Important: do not try to access the ClipNode local service from a sandboxed command. Use an out-of-sandbox request or the MCP tools when a real local-service check is needed.

Shortest decision table:

| Situation | Read first |
|---|---|
| Need the two-tree overview | [docs/capability-trees.md](docs/capability-trees.md) |
| First task flow | [docs/capabilities-task-workflows.md](docs/capabilities-task-workflows.md) |
| Current session edit | [docs/capabilities-live-session-patching-core.md](docs/capabilities-live-session-patching-core.md) |
| Find or probe source media | [docs/capabilities-media-sources.md](docs/capabilities-media-sources.md) |

For a longer path, open [docs/entry-choice.md](docs/entry-choice.md) or [docs/ai-execution.md](docs/ai-execution.md), then follow the matching branch.

For AI patching on the live edit page:

1. Read [docs/capabilities-live-session-patching-core.md](docs/capabilities-live-session-patching-core.md).
2. Then read [docs/capabilities.md](docs/capabilities.md) and [docs/patch-examples.md](docs/patch-examples.md).
3. If you are only looking for the right branch, start with [docs/knowledge-map.md](docs/knowledge-map.md).

If you are doing finished-output creation, start with the headless tree first. If you are already in the edit page, use the live-session tree after that.

When new tool families are added later, extend the knowledge map and add a sibling branch instead of overloading an existing page.

## Contents

- [App Showcase](docs/showcase.md)
- [Highlights](#highlights)
- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Client Integrations](#client-integrations)
- [Release Packages](#release-packages)
- [Common Things You Can Ask](#common-things-you-can-ask)
- [Documentation](#documentation)
- [Examples](#examples)
- [Safety](#safety)

## Highlights

- Free to use.
- Local Android rendering through the ClipNode app.
- Stdio MCP server for Codex, Cursor, Claude Desktop, Claude Code, and other MCP-compatible clients.
- Video editing, video compression, video composition, GIF editing, video-to-GIF, image editing, image composition, and m3u8/HLS to MP4 export.
- Local file upload/download between the computer and the Android device.
- Dry-run validation before export, with readable plan summaries, risk hints, and suggested fixes.
- 100+ built-in GL video transition effects, including fade, wipe, zoom, 3D page/book flip, cube, mosaic, glitch, light/color effects, and shape masks.
- GIF editing with transparency/alpha support.
- Text, image, and GIF stickers, including text styles, stroke, glow, background, padding, timing, grid layout, and enter/loop/exit animations.
- Interactive AI patching for the currently open media-session draft, including current-state export, patch validation/apply, and AI undo/redo.

## How It Works

```text
AI client
-> MCP stdio server: scripts/clipnode-media-mcp-server.js
-> ClipNode Android app local HTTP service
-> Android local media render/export
-> optional download back to the computer
```

The MCP server is a bridge. It does not replace the Android app, and it does not render media by itself.

## Quick Start

1. Install and open the ClipNode Android app.
2. In ClipNode, start the local service or open the AI task center.
3. Make sure the phone and computer are on the same trusted local network.
4. Copy the local service URL and PIN shown in the app.
5. If your AI client can talk to the MCP server directly, you can give it the local service URL and PIN first and let it configure itself. Otherwise, configure your MCP client with this server:

```json
{
  "mcpServers": {
    "clipnode-media": {
      "command": "node",
      "args": [
        "/absolute/path/to/clipnode-media-mcp/scripts/clipnode-media-mcp-server.js"
      ],
      "env": {
        "CLIPNODE_BASE_URL": "http://192.168.1.23:8081",
        "CLIPNODE_PIN": "123456"
      }
    }
  }
}
```

6. Ask the AI client to call:

```text
clipnode_media_get_capabilities
```

If capabilities are returned, the chain is working:

```text
AI client -> MCP server -> ClipNode app local service
```

For live session editing, open a media edit session in the Android app first, then ask the AI client to call:

```text
clipnode_edit_get_current_state
```

The AI should use the returned `editableIndex` for existing object ids, send `baseRevision` with each patch, and read `idMap` after adding new objects. The current-state response also includes `lastPatch`, which mirrors the latest patch result with `runtimeVerifiedSections`, `pendingSections`, and changed object/section summaries.
For section edits, read `patchGrammar.sectionCapabilities` first to see validator/projector/verifier coverage, then choose fields from `patchGrammar.sectionPatchFields`. Some sections are state-runtime backed rather than timeline-backed; check `stateProjector`, `stateVerifier`, `completeForSessionState`, and `runtimeCoverage`.
Use `compact=true` for normal targeting reads. Current action patches can add text, image, or GIF stickers. For image/GIF stickers, canvas backgrounds, external audio, and source paths, use `clipnode_media_validate_app_path` when the path is uncertain. GIF stickers should then be probed with `includeFrameTimeline=true` and applied with an App-readable `.gif` path plus `gif.frameTimeList`.
In `image_compose`, use `sectionPatch/imageCompose` for layout/output fields or complete source-list replacement. For one image slot add/replace/delete/reorder/crop/rotate/flip, prefer `objectPatch` with `collection=imageComposeSources`; existing ids come from `editableIndex`, and source-list replacement must keep 2-16 unique App-readable images.
Sticker runtime restore can briefly be eventually consistent after apply/undo/redo because StickerView imports and layout happen asynchronously. If apply/undo/redo/current_state returns `pendingSections=["stickers"]` or `sticker_projection_pending` warnings, wait briefly and read again; do not overwrite the spec with transient StickerView default `x/y/scale` values or stale sticker objects.

To finish the live draft, call `clipnode_edit_create_export`. It validates readiness internally, opens the App export/progress panel, starts export, and then you can poll `clipnode_edit_get_current_state` for `exportStatus`. Use `clipnode_edit_validate_export` only when you need a read-only preflight or want to explain why export is not ready. Export plans split `specExport`, `runtimeExport`, and `warnings`; video live-session export consumes width/height/fps/bitrate from `runtimeExport`, while any remaining mode-specific gaps are listed in `warnings`.

## Client Integrations

Client-specific files live under `integrations/`. The shared MCP implementation stays in `scripts/`, `lib/`, and `assets/`, then release packages copy those shared files into each client package.

| Client | Files | Notes |
|---|---|---|
| Codex | [integrations/codex](integrations/codex) | Codex plugin metadata and MCP config template. |
| Generic stdio MCP client | Use the Quick Start JSON | Works for clients that accept a command, args, and env block. |

More client folders can be added later without duplicating the MCP server source.

## Release Packages

Build a Codex plugin zip:

```bash
npm run package:codex
```

The command creates:

```text
dist/codex/clipnode-media-mcp/
dist/clipnode-media-mcp-codex.zip
```

The zip is a self-contained plugin package. It includes the Codex metadata plus the shared MCP server files needed at runtime. GitHub showcase pages are not included in the runtime package.

## Common Things You Can Ask

- "Turn the latest 12 photos and GIFs from my phone DCIM folder into a 9:16 memory video. Use random 3D or page-flip transitions, add title text, export MP4, and download it to my computer."
- "Mix these videos and photos into one 1080p landscape MP4. Use the free 100+ transition library and prefer tech, glitch, or mosaic styles."
- "Compress this phone video to a smaller 720p MP4 while keeping it reasonably clear."
- "Convert seconds 3 to 8 of this video into a GIF around 480px wide, with a text sticker and transparent GIF output when possible."
- "Reverse this GIF, crop it to a square, lower the frame rate, and add a bottom watermark."
- "Make a 3x3 image from 9 screenshots with transparent background and 12px spacing."
- "Convert this m3u8 link to MP4 and download it to my computer."
- "I am on the ClipNode edit page. Add a bold glowing title near the bottom of the current draft, preview it, and keep it editable."

More examples are in [docs/ai-prompts.md](docs/ai-prompts.md).

## Documentation

| File | Purpose |
|---|---|
| [docs/capabilities.md](docs/capabilities.md) | Best starting point for AI. It explains supported workflows, task types, patch grammar, mode rules, and id handling. |
| [docs/ai-prompts.md](docs/ai-prompts.md) | Copy-ready prompts users can give to an AI client. |
| [docs/showcase.md](docs/showcase.md) | App capability showcase with visual examples, starting with transition demos. |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Connection, PIN, local network, permission, upload/download, and export troubleshooting. |
| [docs/privacy-and-local-service.md](docs/privacy-and-local-service.md) | Local service, PIN, media access, privacy, and security notes. |
| [integrations/codex/README.md](integrations/codex/README.md) | Codex plugin packaging and usage notes. |

## Project Structure

```text
assets/templates.json
lib/*.js
scripts/clipnode-media-mcp-server.js
scripts/package-codex-plugin.js
examples/*.mcp-client.js
examples/lib/*.js
docs/*.md
integrations/codex/.codex-plugin/plugin.json
integrations/codex/.mcp.json
dist/*.zip
```

## Examples

Example scripts are standalone MCP clients for debugging and integration reference. They are not required for normal AI-client use.

```bash
CLIPNODE_BASE_URL=http://192.168.1.23:8081 \
CLIPNODE_PIN=123456 \
node examples/list-phone-media.mcp-client.js
```

Useful examples:

- `examples/list-phone-media.mcp-client.js`
- `examples/hls-export.mcp-client.js`
- `examples/video-compress.mcp-client.js`
- `examples/video-edit-from-phone-list.mcp-client.js`
- `examples/transition-showcase-recipes.mcp-client.js`
- `examples/logo-overlay-showcase.mcp-client.js`
- `examples/video-to-gif.mcp-client.js`
- `examples/gif-stickers.mcp-client.js`
- `examples/image-edit-title.mcp-client.js`
- `examples/image-compose-grid.mcp-client.js`
- `examples/live-session-edit-regression.mcp-client.js`
- `examples/image-memory-video.mcp-client.js`
- `examples/asset-library-video-composition.mcp-client.js`
- `examples/video-composition-mixed-stickers.mcp-client.js`
- `examples/complex-validation-suite.mcp-client.js`

## Safety

ClipNode's local service is intended for trusted devices on the same local network. Do not expose the service to the public internet, and keep the connection PIN private.

See [docs/privacy-and-local-service.md](docs/privacy-and-local-service.md) for details.
