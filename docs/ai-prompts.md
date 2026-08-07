# AI Prompts For ClipNode Media MCP

Users do not need to know MCP tool names or task schemas. They can describe the source media, desired output, style, and download destination in natural language.

The AI client should turn these prompts into the standard workflow:

```text
capabilities -> source discovery/upload -> probe -> validate -> create -> poll -> download
```

## Album And Memory Videos

```text
Turn the latest 12 photos and GIFs from my phone DCIM folder into a 9:16 memory video. Use each image for 3 seconds, add random 3D or page-flip transitions, title it "Summer Notes", export MP4, and download it to my computer.
```

```text
Use the images in my asset-library theme "my child" to make a gentle album video. Keep the transitions subtle, add background music, add the opening title "Growing Moments", and end with "To be continued".
```

```text
Make a short product slideshow from 8 phone images. Use clean transitions, white background, 1080x1920 canvas, and export an MP4 suitable for sharing.
```

## Video Composition

```text
Mix these videos and photos into one 1080p landscape MP4. Use the free 100+ transition library and prefer tech, glitch, or mosaic styles. Before exporting, tell me the estimated duration and any risks.
```

```text
Combine the 5 videos in ~/Desktop/materials/ in filename order, use soft transitions, export MP4, and save the final file to ~/Downloads/clipnode_final.mp4.
```

```text
Create a 9:16 highlight video from the selected phone clips. Use fast cuts, 3D transitions, keep the original audio low, and add a title sticker at the beginning.
```

## Single Video Editing

```text
Add a logo image sticker to the top-right corner of this phone video, then add a large title. Make the title white with black stroke, slight glow, a translucent rounded background, fade-in entrance, and fade-out exit.
```

```text
Crop this video to 9:16, keep the whole subject visible with a blurred self-background canvas, mute the original audio, and export MP4.
```

```text
Rotate this phone video 90 degrees, add a bottom text watermark, keep the audio, and export a clear MP4.
```

## Video Compression

```text
Compress this video so it stays reasonably clear but gets smaller. Export 720p MP4, and tell me the suggested settings first if the quality loss may be obvious.
```

```text
Upload /Users/me/Videos/input/trip-original.mp4 from my computer to ClipNode, compress it so the file is smaller but still clear, then download the result to /Users/me/Videos/output/trip-compressed.mp4.
```

## Video To GIF

```text
Convert seconds 3 to 8 of this video into a GIF around 480px wide. Add a text sticker saying "Here it comes" with stroke and a pop-in entrance animation, then download the result.
```

```text
Make a small transparent-friendly reaction GIF from the first 4 seconds of this phone video. Reduce the frame rate if needed to keep the output lightweight.
```

```text
Turn this video clip into a square GIF, reverse the frame order, add a short caption, and export it for chat sharing.
```

## GIF Editing

```text
Reverse this phone GIF, crop it to a square, lower the frame rate to reduce size, and add a bottom text watermark.
```

```text
Edit this GIF and preserve transparency where possible. Resize it to about 512px wide, add a small corner sticker, and export GIF.
```

```text
Trim this GIF to the best 2 seconds, keep alpha transparency, add a short animated text sticker, and download the final GIF.
```

## Image Editing

```text
Edit this phone image into a square PNG, add the title "New Arrival" at the top, add a logo sticker at the bottom-right, and keep the background transparent if possible.
```

```text
Upload /Users/me/Pictures/logo.png and use it as a top-right image sticker on this phone image. Export PNG and download it to my desktop.
```

## Image Composition

```text
Compose 6 product images into one long image using an image-composition layout/template. Use a white background, add spacing between images, export PNG, and pick a layout suitable for ecommerce.
```

```text
Make a 3x3 image from 9 screenshots, transparent background, 12px spacing, export PNG.
```

```text
Upload the product images from ~/Pictures/product/, compose them into one long image with an image-composition layout/template, and export PNG to ~/Desktop/product-compose.png.
```

## HLS / m3u8 To MP4

```text
Convert this m3u8 link to MP4 and download it to my computer. If the link or network fails, tell me the reason.
```

```text
Export this HLS URL as a stable MP4 file. Track progress and download the result after success.
```

## Troubleshooting Prompts

```text
Check whether ClipNode MCP can connect to my phone. First read capabilities, then list phone video and image directories without creating any export task.
```

```text
My export failed. Read the task status and event log, summarize the failure reason, and suggest the safest next step.
```

```text
Before creating the export, validate the task and explain the plan summary, output settings, and any risk hints.
```
