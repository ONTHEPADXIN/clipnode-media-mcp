# ClipNode Media MCP Catalogs And Style Systems

[中文版本](capabilities-catalogs-and-style-systems.zh-CN.md)

This branch covers catalogs, built-in reference templates, and the style systems AI should consult instead of inventing names.

## Transition Catalog

ClipNode includes 100+ GL transition effects.

Useful filters:

- `autoSelectable=true` for safe automatic selection.
- `tag` or `tags` for styles such as `3d`, `book`, `flip`, `soft`, `fade`, `wipe`, `glitch`, `grid`, `mosaic`, or `shape`.
- `group` for broad groups such as `Basic`, `Wipe`, `Shape`, `Zoom`, `3D`, `Distort`, or `Color`.

If a user asks for soft, 3D book flip, tech glitch, mosaic, or shape mask, use the transition catalog instead of inventing an asset path.

## Sticker Capabilities

Sticker support includes:

- Text stickers.
- Image stickers.
- GIF stickers.
- Normalized position, scale, rotation, time range, grid layout, and time-follow behavior.
- Text style controls such as color, size, bold, italic, underline, stroke, glow, background, corner radius, and padding.
- Enter, loop, and exit animations.

Use `clipnode_media_get_sticker_capabilities` and `clipnode_media_list_sticker_animations` before building sticker requests.

## Built-In Templates

Built-in templates are starting points, not complete executable requests.

Current templates include:

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

Use `clipnode_media_list_templates` and `clipnode_media_get_template` when you want a concrete starting point.
