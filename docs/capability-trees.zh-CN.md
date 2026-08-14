# 能力树

[English version](capability-trees.md)

ClipNode Media MCP 有两条并列的能力树。AI 先选树，再只读这棵树对应的分支。

## 树 1：任务式导出

这棵树用于按需求生成成品。

适合这些场景：

- 新的成品输出
- 可重复或可批量的流程
- 脚本化的导出配方
- 后续可以沉淀成任务式导出的复用样例

典型流程：

1. 读 capabilities。
2. 选 task type。
3. 找素材或 probe source。
4. 校验方案。
5. 创建任务。
6. 轮询进度。
7. 下载结果。

最适合先读的分支：

- [capabilities-task-workflows.md](capabilities-task-workflows.zh-CN.md)
- [capabilities-media-sources.md](capabilities-media-sources.zh-CN.md)
- [ai-prompts-task-workflows.md](ai-prompts-task-workflows.zh-CN.md)
- [showcase-recipes.md](showcase-recipes.zh-CN.md)
- [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.zh-CN.md)

## 树 2：会话 Patch

这棵树用于编辑当前打开的 ClipNode 会话。

适合这些场景：

- 修改当前草稿
- 让 AI 承接人的实时编辑意图
- 先做可复用的设置或模板，再供任务式导出使用
- 先读当前状态，再决定最小且安全的 patch

典型流程：

1. 读当前状态。
2. 读 `modeRules`。
3. 现有 id 用 `editableIndex`。
4. 选最小 patch 类型。
5. 不确定就 validate。
6. apply。
7. 再读状态，信任 `revision`、`idMap` 和 `lastPatch`。

最适合先读的分支：

- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.zh-CN.md)
- [capabilities-live-session-patching.md](capabilities-live-session-patching.zh-CN.md)
- [patch-examples.md](patch-examples.zh-CN.md)
- [patch-examples-object-edit-matrix.md](patch-examples-object-edit-matrix.zh-CN.md)
- [capabilities-validation-results.md](capabilities-validation-results.zh-CN.md)
- [ai-prompts-live-session.md](ai-prompts-live-session.zh-CN.md)

## 共享底座

两条树共用同一层基础能力：

- 素材发现和 probe
- App 可读路径校验
- 校验与恢复规则
- id 处理和 `editableIndex`
- 目录、模板和风格系统
- 导出结果读取和失败解释

最适合先读的分支：

- [capabilities-media-sources.md](capabilities-media-sources.zh-CN.md)
- [capabilities-validation-and-rules.md](capabilities-validation-and-rules.zh-CN.md)
- [capabilities-validation-results.md](capabilities-validation-results.zh-CN.md)
- [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.zh-CN.md)

## 阅读规则

如果用户要做新成品，先走任务式导出树。
如果用户已经在编辑页，先走会话 patch 树。
如果目标不够明确，先读这一页，再分流。
