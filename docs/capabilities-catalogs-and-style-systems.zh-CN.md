# ClipNode Media MCP 目录与风格系统

[English version](capabilities-catalogs-and-style-systems.md)

这一分支覆盖目录、内置模板和风格系统。AI 不应该自己瞎编这些名字。

先用 `clipnode_media_get_capabilities` 拿摘要，真正要精确名字时再查下面的目录工具。

## 转场目录

ClipNode 内置 100+ GL 转场动画。

常用过滤：

- `autoSelectable=true`：适合自动选择。
- `tag` / `tags`：例如 `3d`、`book`、`flip`、`soft`、`fade`、`wipe`、`glitch`、`grid`、`mosaic`、`shape`。
- `group`：例如 `Basic`、`Wipe`、`Shape`、`Zoom`、`3D`、`Distort`、`Color`。

如果用户要 soft、3D book flip、tech glitch、mosaic 或 shape mask，应优先查目录，不要自己拼 assetPath。

## 贴纸能力

贴纸支持包括：

- 文本贴纸。
- 图片贴纸。
- GIF 贴纸。
- 位置、缩放、旋转、时间范围、网格布局、随时间移动。
- 文本样式：颜色、字号、粗斜体、下划线、描边、发光、背景、圆角、内边距。
- 入场、循环、出场动画。

在组织贴纸请求前，先看 `clipnode_media_get_sticker_capabilities` 和 `clipnode_media_list_sticker_animations`。

## 内置模板

内置模板是起点，不是完整可直接执行的请求。

当前模板包括：

- `video_soft_9_16`
- `video_full_self_blur_canvas`
- `video_compress_480p_size_first`
- `video_composition_soft_fade`
- `hls_to_mp4_quality`
- `gif_crop_resize_reverse`
- `video_to_gif_clip_crop`
- `image_edit_square_title`
- `image_compose_3x3_screenshot_grid`
- `image_compose_product_long`
- `video_edit_rich_text_gif_badge`
- `image_memory_video`

需要起点时，用 `clipnode_media_list_templates` 和 `clipnode_media_get_template`。
