# 场景摘要

[English version](scene-routing.md)

这是最短的第一步，用来先判断该走哪条路。

## 三选一

| 场景 | 先做什么 | 再看什么 |
|---|---|---|
| 新建成品 | 先走任务式导出树 | [capabilities-task-workflows.md](capabilities-task-workflows.zh-CN.md) |
| 当前会话编辑 | 先读当前状态 | [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.zh-CN.md) |
| 找素材 / 路径 | 先开素材来源分支 | [capabilities-media-sources.md](capabilities-media-sources.zh-CN.md) |

## 规则

- 如果你是在做一个新的成品，先走任务式导出。
- 如果你是在改当前草稿，先走会话 patch。
- 如果你只需要文件或路径，先走素材来源。
