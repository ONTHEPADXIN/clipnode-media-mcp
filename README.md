# ClipNode Media MCP

[中文说明](README.zh-CN.md)

ClipNode Media MCP connects MCP-compatible AI clients to the ClipNode Android app, enabling local video, GIF, image, and HLS media workflows on your phone.

With this MCP bridge, an AI client can browse phone media, upload source files, choose templates and effects, validate an edit plan, start a local export job, poll progress, and download the finished result back to the computer.

ClipNode currently requires the Android app. Install it from Google Play:
[ClipNode](https://play.google.com/store/apps/details?id=cn.com.onthepad.tailor)

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
- 100+ built-in GL video transition effects, including fade, wipe, zoom, 3D page/book flip, cube, mosaic, glitch, light/color effects, and shape masks.
- GIF editing with transparency/alpha support.
- Text, image, and GIF stickers, including text styles, stroke, glow, background, padding, timing, grid layout, and enter/loop/exit animations.
- Local file upload/download between the computer and the Android device.
- Dry-run validation before export, with readable plan summaries, risk hints, and suggested fixes.

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
5. Configure your MCP client with this server:

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

More examples are in [docs/ai-prompts.md](docs/ai-prompts.md).

## Documentation

| File | Purpose |
|---|---|
| [docs/showcase.md](docs/showcase.md) | App capability showcase with visual examples, starting with transition demos. |
| [docs/capabilities.md](docs/capabilities.md) | Supported workflows, tools, templates, catalogs, and AI workflow rules. |
| [docs/ai-prompts.md](docs/ai-prompts.md) | Copy-ready prompts users can give to an AI client. |
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
- `examples/video-to-gif.mcp-client.js`
- `examples/gif-stickers.mcp-client.js`
- `examples/image-edit-title.mcp-client.js`
- `examples/image-compose-grid.mcp-client.js`
- `examples/image-memory-video.mcp-client.js`
- `examples/asset-library-video-composition.mcp-client.js`
- `examples/video-composition-mixed-stickers.mcp-client.js`
- `examples/complex-validation-suite.mcp-client.js`

## Safety

ClipNode's local service is intended for trusted devices on the same local network. Do not expose the service to the public internet, and keep the connection PIN private.

See [docs/privacy-and-local-service.md](docs/privacy-and-local-service.md) for details.
