# 对象编辑矩阵

[English version](patch-examples-object-edit-matrix.md)

当你已经知道目标 collection，但还不想猜 patch 形状时，先读这一页。

## 什么时候读我

- 你已经知道要改哪个 collection。
- 你想知道允许的 op、id 来源、必填字段和常见失败点。
- 你正准备写 `objectPatch`。

## 矩阵

| Collection | 允许的 op | id 来源 | 必须 probe? | 必须 validate? | 必填字段 | 常见失败点 |
|---|---|---|---|---|---|---|
| `stickers` | `merge`、`delete`、`duplicate`、`bringToFront`、`sendToBack`、`moveForward`、`moveBackward` | `editableIndex` | 文字贴纸不需要；图片/GIF 且路径不稳时需要 | 非平凡修改建议要 | 已有 sticker id；复制/新建时用 `clientTempId` | 编造 id、动画名不支持、恢复后状态还没稳定 |
| `imageComposeSources` | `add`、`merge`、`replace`、`delete`、`move`、`moveTo`、`moveForward`、`moveBackward`、`crop`、`rotate`、`flip`、`fit` | 现有 slot 来自 `editableIndex`；新增用 `clientTempId` | source 不够新鲜时需要 | 只要不是很简单的 slot 位移就建议要 | App 可见 source 路径、插入时的 slot index、布局安全的 source 字段 | 用了 PC 路径、明明只改一个 slot 却整表替换、slot 顺序错了 |
| `compositionSegments` | `add`、`merge`、`replace`、`delete`、`move`、`moveTo`、`moveForward`、`moveBackward` | 现有 segment 来自 `editableIndex`；新增用 `clientTempId` | add/replace 必须要 | add/replace 和多字段修改都要 | App 可读路径、width、height、`sourceDurationUs`、frame timeline，视频还要 key frame timeline | 没 probe 就猜元数据、timeline 乱填、模式不匹配、路径 App 看不见 |
| `compositionTransitions` | `merge`、`delete` | `editableIndex` | 不需要 | 改资产或时长时建议要 | 已有 transition id；当前 mode 规则里支持的 transition 资产或时长字段 | 猜 transition id、用了不支持的 transition 资产、当前模式根本没暴露它 |

## 通用规则

- 现有 id 一律来自 `editableIndex`
- 新对象一律优先用 `clientTempId`
- source 不够新鲜时先 probe 或 validate
- apply 后重新读状态，并以 `idMap` 为准拿 canonical id

## 常见用法

- `stickers`：贴纸移动、层级、复制
- `imageComposeSources`：单个图片合成 slot 编辑
- `compositionSegments`：视频合成里的时间线 source 编辑
- `compositionTransitions`：转场资产和时长编辑

## 下一页

- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md)
- [capabilities-validation-results.md](capabilities-validation-results.md)
