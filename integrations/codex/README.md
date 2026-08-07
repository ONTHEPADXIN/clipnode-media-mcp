# Codex Integration

This folder contains the Codex-specific package metadata for ClipNode Media MCP.

```text
.codex-plugin/plugin.json
.mcp.json
```

The shared MCP implementation is maintained at the repository root:

```text
assets/
lib/
scripts/clipnode-media-mcp-server.js
```

Release packaging copies those shared files into a self-contained Codex plugin package.

## Build Package

From the repository root:

```bash
npm run package:codex
```

Generated output:

```text
dist/codex/clipnode-media-mcp/
dist/clipnode-media-mcp-codex.zip
```

The generated package has the layout Codex expects:

```text
.codex-plugin/plugin.json
.mcp.json
assets/templates.json
lib/*.js
scripts/clipnode-media-mcp-server.js
README.md
README.zh-CN.md
docs/*.md
examples/*.mcp-client.js
```

## Runtime Configuration

Update the generated `.mcp.json` or configure these environment variables in Codex:

| Environment variable | Required | Description |
|---|---|---|
| `CLIPNODE_BASE_URL` | Yes | Local service URL shown by the ClipNode app. |
| `CLIPNODE_PIN` | Yes | Connection PIN shown by the ClipNode app. |
| `CLIPNODE_MCP_SESSION` | No | Optional session id for debugging/log correlation. |

## Codex Network Notes

Prefer the provided MCP tools over manual `curl` checks. Do not ask Codex to run `curl`, `wget`, or ad-hoc HTTP client scripts inside the sandbox to test `CLIPNODE_BASE_URL`, especially when the URL points to `127.0.0.1`, localhost, a LAN IP, an Android device, an emulator, or an ADB-forwarded port. Sandboxed network requests may be blocked or unable to see the host-local ClipNode service.

If a real HTTP request is necessary for debugging, Codex should run it with `sandbox_permissions: "require_escalated"` and explain the endpoint, purpose, and expected effect.
