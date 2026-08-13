# Patch Examples

[中文版本](patch-examples.zh-CN.md)

This is the patch cookbook index. Read the matching branch before using the example pages.

## Branches

| Branch | What It Covers | Start Here |
|---|---|---|
| Section patches | Canvas, fit, export, and other top-level section changes. | [patch-examples-section-patches.md](patch-examples-section-patches.md) |
| Sticker actions | Add text, image, and GIF stickers. | [patch-examples-sticker-actions.md](patch-examples-sticker-actions.md) |
| Sticker object patches | Move, duplicate, or reorder existing stickers. | [patch-examples-object-patches.md](patch-examples-object-patches.md) |
| Image compose | Add or replace image-compose source slots. | [patch-examples-image-compose.md](patch-examples-image-compose.md) |
| Video composition segments | Add, replace, or trim timeline segments. | [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md) |
| Video composition transitions | Add or update transition assets and durations. | [patch-examples-video-composition-transitions.md](patch-examples-video-composition-transitions.md) |
| Video composition canvas/export | Canvas, fit, audio, and export tuning. | [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md) |
| Video composition recipe | One-pass read/probe/add/transition/validate/apply flow. | [patch-examples-video-composition-recipe.md](patch-examples-video-composition-recipe.md) |
| Negative examples | Mistakes to avoid and common failure patterns. | [patch-examples-negative-examples.md](patch-examples-negative-examples.md) |

## Reading Order

1. Read the matching capability branch first.
2. Open the example page for the exact patch shape.
3. Copy the smallest working shape.
4. Apply validation and re-read state after apply.
5. For video composition, open the segment, transition, or canvas/export page instead of the old combined shape.
6. Use the recipe page when you want one complete working flow rather than one field family.

## Rule Of Thumb

- Do not use a bigger example when a smaller one exists.
- Keep examples mode-specific.
- Prefer one purpose per example page.
- Add a new example page when a new patch family appears.
