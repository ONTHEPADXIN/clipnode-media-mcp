# Troubleshooting

Use this guide when ClipNode Media MCP cannot connect, list media, create tasks, export, or download results.

## Quick Checks

1. The ClipNode Android app is installed and open.
2. The app local service is started.
3. The phone and computer are on the same trusted local network.
4. `CLIPNODE_BASE_URL` exactly matches the URL shown in the app.
5. `CLIPNODE_PIN` exactly matches the PIN shown in the app.
6. Node.js is installed and the MCP client points to the absolute path of `scripts/clipnode-media-mcp-server.js`.
7. The app has media permissions for the files you want to browse or process.

## Connection Problems

### `baseUrl is required` or empty capabilities

Cause:

- `CLIPNODE_BASE_URL` is missing.
- The MCP client did not pass environment variables to the server.
- The session was started before the app local service was configured.

Fix:

- Set `CLIPNODE_BASE_URL` in the MCP client config.
- Use the URL shown by ClipNode, for example `http://192.168.1.23:8081`.
- Restart the MCP client after changing config.
- Or call `clipnode_media_configure` with `baseUrl` and `pin`.

### Authentication failed or PIN error

Cause:

- `CLIPNODE_PIN` is empty, outdated, or typed incorrectly.
- The app generated a new PIN after the MCP client was configured.

Fix:

- Copy the current PIN from the ClipNode app.
- Update `CLIPNODE_PIN`.
- Restart the MCP client or call `clipnode_media_configure`.
- Do not commit real PIN values to a public repository.

### Network timeout, connection refused, or socket hang up

Cause:

- Phone and computer are not on the same network.
- The local service is not running.
- The phone changed IP address.
- Firewall, VPN, private Wi-Fi isolation, hotspot isolation, or router settings block local traffic.

Fix:

- Reopen ClipNode and verify the service address.
- Make sure both devices are on the same Wi-Fi.
- Disable VPN or private relay temporarily for testing.
- Try opening the base URL in a browser on the computer.
- If the phone IP changed, update `CLIPNODE_BASE_URL`.

## MCP Client Setup Problems

### Tools are not visible

Cause:

- The MCP client did not start the server.
- The script path is wrong.
- Node.js cannot run the server.

Fix:

- Use an absolute script path:

```text
/absolute/path/to/clipnode-media-mcp/scripts/clipnode-media-mcp-server.js
```

- Confirm Node.js 18+ is available.
- Check the MCP client logs.
- Run syntax checks:

```bash
node --check scripts/clipnode-media-mcp-server.js
node --check lib/mcp-definitions.js
node --check lib/clipnode-http-client.js
```

### Environment variables are ignored

Cause:

- Some clients require env variables in their MCP config file rather than shell startup files.

Fix:

- Put `CLIPNODE_BASE_URL` and `CLIPNODE_PIN` directly in the MCP server `env` block.
- Restart the client after editing config.

## Phone Media Listing Problems

### No videos or images appear

Cause:

- The app does not have media permissions.
- The selected directory has no supported files.
- Android media indexing has not updated yet.

Fix:

- Grant image/video permissions to ClipNode.
- Open the media in the phone gallery once, then retry listing.
- Try listing directories first:

```text
clipnode_media_list_video_dirs
clipnode_media_list_image_dirs
```

### A selected source cannot be probed

Cause:

- The file was moved or deleted.
- ClipNode does not have permission to read it.
- The media format is unsupported or damaged.

Fix:

- List files again and choose a current `path`.
- Try a different source.
- Run `clipnode_media_probe_sources` before building crop, trim, canvas, transition, or audio settings.

## Upload And Download Problems

### Upload fails

Cause:

- The local PC path is wrong.
- The MCP client cannot access the file.
- The file is too large or network transfer failed.

Fix:

- Use an absolute local path.
- Confirm the MCP client has file access.
- Keep the phone awake during large uploads.
- Retry on a stable local network.

### Download fails

Cause:

- The export job did not succeed.
- The output path or file id is missing.
- The app output was deleted.
- The destination directory is not writable by the MCP client.

Fix:

- Poll `clipnode_media_get_job_status` until `status=success`.
- Use `outputPath` from job status or `fileId` from `clipnode_media_list_outputs`.
- Choose a writable local destination.

## Validation Problems

Always validate complex tasks before creating them.

If `clipnode_media_validate_task` returns:

| Field | Meaning | What to do |
|---|---|---|
| `suggestedFix` | The app suggests a safe patch. | Apply it and validate again. |
| `needConfirmation=true` | The plan needs user confirmation. | Explain `planSummary.userConfirmText` and ask before create. |
| `aiDecision.action=choose_source_again` | The source is missing or wrong type. | List media again and choose another source. |
| `aiDecision.action=probe_source_again` | Metadata probing failed. | Probe again or choose a different source. |
| `aiDecision.action=blocked` | The app cannot continue with this request. | Explain the error and wait for user input or a changed request. |

Useful fields:

- `planSummary.readableText`
- `planSummary.riskHints[]`
- `timelineSummary.clips`
- `timelineSummary.transitions`
- `timelineSummary.stickers`

## Export Problems

### Job stays queued or running for a long time

Cause:

- ClipNode uses a single local media queue.
- GIF editing, large canvases, many stickers, long videos, and many transition clips can be expensive.

Fix:

- Poll `clipnode_media_get_job_status`.
- Surface progress to the user.
- Do not start another task until the current job is terminal.
- If the user wants to stop, call `clipnode_media_cancel_job`.

### GIF export is slow or huge

Cause:

- GIF is frame-based.
- High fps, large dimensions, all-frame output, rotation, flip, or many stickers increase cost.

Fix:

- Lower `gif.fps`.
- Increase `gif.frameSpace`.
- Shorten `timeRange`.
- Reduce `gif.outputWidth` / `gif.outputHeight`.
- Apply `suggestedFix` from validation when available.

### HLS/m3u8 export fails

Cause:

- The URL is expired, blocked, requires auth, or is not reachable from the Android device.
- Network is unstable.
- Multiple URLs were submitted in one request.

Fix:

- Submit one m3u8 URL per job.
- Make sure the phone can access the URL.
- Retry with a fresh URL if it contains time-limited authorization.
- Read job status and task events for failure details.

## Release Hygiene

Before publishing examples or docs, scan for private values:

```bash
rg "auth_key=|/Users/|192\\.168\\.28|YAPI_TOKEN|CLIPNODE_PIN|613437"
```

Use placeholders such as:

```text
http://192.168.1.23:8081
123456
/absolute/path/to/clipnode-media-mcp
```
