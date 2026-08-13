# Video Composition Transitions

[中文版本](patch-examples-video-composition-transitions.zh-CN.md)

Read this page when you need to edit `compositionTransitions`.

## When To Read Me

- The current mode exposes `compositionTransitions`.
- You want to adjust transition asset, duration, or audio cross-fade.
- You already know the transition id from `editableIndex`.

## Key Rule

Transitions are attached to the boundary between neighboring segments, not standalone creative objects.

## Update A Transition

```json
{
  "sessionId": "current",
  "baseRevision": 18,
  "patches": [
    {
      "type": "objectPatch",
      "collection": "compositionTransitions",
      "id": "transition_0",
      "op": "merge",
      "value": {
        "assetPath": "transitions/fade.glsl",
        "durationUs": 700000,
        "audioCrossFade": false
      }
    }
  ]
}
```

## Common Rules

- Existing transition ids come from `editableIndex`.
- Do not guess a transition id.
- Only use this page when the active mode exposes the collection.

## Next Pages

- [patch-examples-video-composition-segments.md](patch-examples-video-composition-segments.md)
- [patch-examples-video-composition-canvas-export.md](patch-examples-video-composition-canvas-export.md)
- [capabilities-catalogs-and-style-systems.md](capabilities-catalogs-and-style-systems.md)
