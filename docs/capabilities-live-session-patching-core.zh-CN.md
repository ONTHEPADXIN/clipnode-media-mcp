# ClipNode Media MCP 会话核心入口

[English version](capabilities-live-session-patching-core.md)

当前用户已经在 ClipNode 会话页时，先读这一页。

## 什么时候读我

当你要最快进入当前草稿编辑时，先读这页。

只有在需要下面这些内容时，再继续读更深的会话 patch 页：

- 精确的 patch 决策顺序
- mode 级别的 patch 规则
- section / object / action 样例
- undo / redo 或导出细节

## 读状态顺序

1. `sessionId`
2. `revision`
3. `selectedContext`
4. `patchGrammar.modeRules`
5. `editableIndex`
6. `patchGrammar.sectionCapabilities`
7. `patchGrammar.sectionPatchFields`
8. `lastPatch`

## 一句话判断 patch

- `sectionPatch`：顶层 mode section
- `objectPatch`：`editableIndex` 里的已有对象
- `actionPatch`：只用于支持的新增动作

## 快速规则

- 现有 id 来自 `editableIndex`
- 新对象用 `clientTempId`
- id、路径、字段不确定时先 validate
- apply 之后再读状态
- 以 `revision`、`idMap`、`lastPatch` 为准

## 最快循环

1. 读 state
2. 读 `modeRules`
3. 选最小 patch 类型
4. 不确定就 validate
5. apply
6. 再读并信任返回的 revision

## 下一步读这里

- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [patch-examples.md](patch-examples.md)
- [patch-examples-object-edit-matrix.md](patch-examples-object-edit-matrix.md)
- [capabilities-validation-results.md](capabilities-validation-results.md)
