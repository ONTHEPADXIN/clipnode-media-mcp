# ClipNode Media MCP 会话 patch

[English version](capabilities-live-session-patching.md)

这一分支覆盖 ClipNode 当前编辑页和 live patch 循环。

## 读取当前状态

先调用 `clipnode_edit_get_current_state`。

重点看：

- `sessionId`
- `revision`
- `editableIndex`
- `patchGrammar`
- `selectedContext`
- `lastPatch`

普通定位读取建议传 `compact=true`。

## patch 决策顺序

1. 先读当前状态。
2. 再读 `patchGrammar.modeRules`。
3. 判断是 section edit、object edit 还是 action patch。
4. 只能用当前模式暴露的 section / action / collection。
5. 现有对象 id 只能从 `editableIndex` 取。
6. 新对象用 `clientTempId`。
7. id、路径、字段不确定时先 validate。
8. 再 apply。
9. 再读当前状态，检查 `revision`、`idMap`、`changedObjects`、`changedSections`、`pendingSections`、`runtimeVerifiedSections`。

## 模式速查

- `video_edit`：canvas、fit、transform、audio、export、stickers
- `video_compress`：timeRange、audio、export
- `video_composition`：compositionSegments、compositionTransitions、canvas、audio、export、stickers
- `image_edit`：canvas、fit、transform、export、stickers
- `image_compose`：imageCompose、export、imageComposeSources
- `gif_edit`：timeRange、canvas、fit、transform、gif、export、stickers
- `video_to_gif`：timeRange、fit、transform、gif、export、stickers

如果当前模式没有暴露某个 section / collection / action，不要自己编。

## patch 类型

- `sectionPatch`：改顶层 section。
- `objectPatch`：改已有对象。
- `actionPatch`：新增贴纸或执行命名动作。

## live 编辑循环

```text
get_current_state
-> 看 patchGrammar
-> 选 patch 类型
-> 不确定就 validate
-> apply
-> 再读 current state
-> 检查 revision/idMap/lastPatch/状态稳定性
```

## 从会话页导出

用户要导出当前草稿时，直接用 `clipnode_edit_create_export`。

只想看能不能导出时，用 `clipnode_edit_validate_export`。

这个导出由 App 打开导出面板，不是 headless 任务流。
