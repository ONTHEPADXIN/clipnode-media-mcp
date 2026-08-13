# ClipNode Media MCP 能力索引

这是 ClipNode Media MCP 的中文能力索引。

英文版见 [capabilities.md](capabilities.md)。

先读这个索引，再按当前目标进入对应分支，不要一上来加载整页细节。

## 分支

| 分支 | 说明 | 从这里开始 |
|---|---|---|
| 任务工作流 | headless 导出任务、支持的任务类型、默认流程和省 token 规则。 | [capabilities-task-workflows.md](capabilities-task-workflows.md) |
| 会话 patch | 当前编辑页、patch 决策顺序、交互式会话流程和 live patch 行为。 | [capabilities-live-session-patching.md](capabilities-live-session-patching.md) |
| 会话核心入口 | 当前状态快读、patch 选择和导出衔接的首读页。 | [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md) |
| 素材来源 | 手机素材、素材库、上传下载、source probe 和本地服务访问规则。 | [capabilities-media-sources.md](capabilities-media-sources.md) |
| 目录与风格系统 | 转场目录、贴纸能力目录、动画目录和内置模板。 | [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.md) |
| 校验与规则 | 校验协议、导出流程、patch 请求形状、id、字段规则和安全规则。 | [capabilities-validation-and-rules.md](capabilities-validation-and-rules.md) |
| 校验结果 | suggestedFix、needConfirmation、冲突和 pending 状态的结果解释。 | [capabilities-validation-results.md](capabilities-validation-results.md) |

## 阅读顺序

新任务建议按这个顺序读：

1. 先读匹配当前目标的分支。
2. 如果需要素材或 source，先读素材来源分支。
3. 如果需要 patch，先读会话 patch 分支。
4. 如果需要导出或 readiness 校验，先读校验与规则分支。
5. 如果需要目录或模板，再读目录与风格系统分支。
6. 如果是当前会话编辑，先打开会话核心入口页，再进深页。

## 规则

- 不要一次把所有分支都读完。
- 先读最贴近当前页面或任务的分支。
- apply/validate 之后要重新读当前状态。
- 后面如果新增工具家族，就在这里加一个同级分支和一行索引。
