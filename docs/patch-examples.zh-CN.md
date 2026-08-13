# Patch Examples

[English version](patch-examples.md)

这是 patch 样例索引页。先读对应能力分支，再看匹配的样例页。

## 分支

| 分支 | 说明 | 从这里开始 |
|---|---|---|
| Section patches | 画布、fit、export 和其他顶层 section 改动。 | [patch-examples-section-patches.md](patch-examples-section-patches.zh-CN.md) |
| Sticker actions | 新增文字、图片和 GIF 贴纸。 | [patch-examples-sticker-actions.md](patch-examples-sticker-actions.zh-CN.md) |
| Sticker object patches | 移动、复制或重排已有贴纸。 | [patch-examples-object-patches.md](patch-examples-object-patches.zh-CN.md) |
| Image compose | 新增或替换图片合成 source slot。 | [patch-examples-image-compose.md](patch-examples-image-compose.zh-CN.md) |
| Video composition segments | 新增、替换或裁剪时间线 segment。 | [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.zh-CN.md) |
| Video composition transitions | 新增或更新转场资产和时长。 | [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.zh-CN.md) |
| Video composition canvas/export | 画布、fit、音频和导出调参。 | [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.zh-CN.md) |
| Video composition recipe | 一次读 state、probe、add、transition、validate、apply 的完整流程。 | [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.zh-CN.md) |
| Negative examples | 要避免的错误和常见失败模式。 | [patch-examples-negative-examples.md](patch-examples-negative-examples.zh-CN.md) |

## 阅读顺序

1. 先读对应能力分支。
2. 再看匹配的样例页。
3. 复制最小可工作的形状。
4. apply 后记得 validate 和重新读状态。
5. 视频合成请直接进 segment、transition 或 canvas/export 分页，不要再找旧的合并页。
6. 想看完整闭环时，直接读 recipe 页。

## 规则

- 有更小的样例就不要用更大的。
- 样例要严格贴合模式。
- 一页只做一类用途。
- 出现新的 patch 家族时，新增同级样例页。
