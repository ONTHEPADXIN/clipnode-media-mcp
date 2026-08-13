# AI 执行层

[English version](ai-execution.md)

这是给 AI 客户端用的执行层，先读两条能力树总览或入口选择页，再读这一页。

## 硬路由

| 场景 | 先做什么 | 再读哪里 |
|---|---|---|
| 新建导出任务 | 调 `clipnode_media_get_capabilities` | `capabilities-task-workflows.md` |
| 当前会话编辑 | 调 `clipnode_edit_get_current_state` | `capabilities-live-session-patching-core.md` |
| 需要素材 | 先选手机素材/素材库来源 | `capabilities-media-sources.md` |

把前两行当成并列能力树，不要理解成主次关系。

## 当前会话编辑

如果用户已经在 ClipNode 会话页：

1. 读当前状态
2. 读 `modeRules`
3. 选最小 patch 类型
4. 现有 id 用 `editableIndex`
5. 不确定就 validate
6. apply
7. 再读状态，信任 `revision`、`idMap`、`lastPatch`

## 新导出任务

如果用户要做一个新输出：

1. 读 capabilities
2. 选 task type
3. 选或 probe source
4. 组一个请求
5. validate 后再 create
6. create
7. 轮询直到终态
8. 需要时再下载

## source 选择

- 手机素材路径：设备上的素材
- 素材库路径：可复用的准备素材
- 上传返回的 `appPath` / `assetPath`：新上传但已可复用的素材

不要把临时上传的 `fileId` 当成普通 source。

## 失败恢复

- `revision_conflict` -> 重新读 state 再重建
- `pendingSections` -> 等一下再读
- `suggestedFix` -> 按修正再 validate
- `needConfirmation` -> 先问用户确认再 create/export

## 下一页

- [entry-choice.md](entry-choice.zh-CN.md)
- [knowledge-map.md](knowledge-map.md)
- [capabilities.md](capabilities.zh-CN.md)
- [patch-examples.md](patch-examples.zh-CN.md)
