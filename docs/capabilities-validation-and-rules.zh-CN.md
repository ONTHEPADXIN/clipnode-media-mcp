# ClipNode Media MCP 校验与规则

[English version](capabilities-validation-and-rules.md)

这一分支覆盖请求形状、校验规则、id 规则、字段限制和安全规则。

## 校验协议

非 HLS 任务在 `clipnode_media_create_task` 之前必须先调用 `clipnode_media_validate_task`。

重要字段：

| 字段 | 含义 |
|---|---|
| `validationId` | 用于创建同一份已校验请求的凭据。 |
| `planHash` | 归一化请求计划的 hash。 |
| `planSummary.readableText` | 给用户看的任务说明。 |
| `timelineSummary` | 结构化的片段、转场和贴纸。 |
| `riskHints[]` | 不阻断的风险提示。 |
| `suggestedFix` | AI 可先应用再重新校验的修正。 |
| `needConfirmation` | 创建前是否需要用户确认。 |
| `aiDecision.action` | 推荐下一步动作。 |

## patch 请求形状

```json
{
  "sessionId": "current",
  "baseRevision": 0,
  "patches": [
    {
      "type": "actionPatch",
      "action": "add_text_sticker",
      "clientTempId": "ai_title_1",
      "value": {
        "x": 0.5,
        "y": 0.82,
        "text": {
          "content": "Title",
          "textSize": 42,
          "color": "#FFFFFFFF"
        }
      }
    }
  ]
}
```

## 支持的 patch 类型

| 类型 | 作用 | 关键字段 |
|---|---|---|
| `sectionPatch` | 合并顶层 edit section。 | `section`、`op=merge`、`value` |
| `objectPatch` | 合并、删除或重排已有对象。 | `collection`、`id`、`op`、`value` |
| `actionPatch` | 新增对象或执行命名动作。 | `action`、`clientTempId`、`value` |

## 当前支持的目标

| 目标 | 值 |
|---|---|
| Sections | `canvas`、`fit`、`transform`、`audio`、`gif`、`imageCompose`、`export` |
| Object collections | `stickers` |
| Object ops | `merge`、`delete`、`duplicate`、`bringToFront`、`sendToBack`、`moveForward`、`moveBackward` |
| Actions | `add_text_sticker`、`add_image_sticker`、`add_gif_sticker` |

## 规则

- 现有对象 id 必须来自 `editableIndex`。
- 新对象使用 `clientTempId`。
- `baseRevision` 必须和当前 revision 一致。
- `canvas.preset` 支持 `original`、`custom`、`1:1`、`4:3`、`3:4`、`3:2`、`2:3`、`9:16`、`16:9`。
- `fit` 支持 `center_crop`、`center_inside`、`fit_width`、`fit_height`、`stretch`、`custom`。
- `transform` 支持 90 度旋转和水平/垂直翻转。
- `audio.external` 需要 App 可读路径和时长信息。
- `imageComposeSources` 和 `compositionSegments` 要遵守 App 可见 source 规则。
- 图片贴纸和 GIF 贴纸路径必须是 App 可读的本地文件。
- `uiHint` 是 UI 提示，不是编辑数据。

## 安全

- 不要自己编 unsupported 的 section、id 或动画名。
- 需要 App 可见路径时不要传 PC 路径或远程 URL。
- 复杂编辑不要跳过校验。
- apply 后要重新读当前状态，并相信 `lastPatch` 和返回的 revision。
