# Negative Examples

[中文版本](patch-examples-negative-examples.zh-CN.md)

This page shows mistakes to avoid.

## Do Not Guess ids

Wrong:

```json
{
  "type": "objectPatch",
  "collection": "stickers",
  "id": "made_up_id",
  "op": "merge",
  "value": {
    "x": 0.5
  }
}
```

Correct: use ids from `editableIndex`.

## Do Not Use Unsupported Sections

Wrong:

```json
{
  "type": "sectionPatch",
  "section": "subtitle",
  "op": "merge",
  "value": {}
}
```

Correct: only use sections exposed by the active mode rules.

## Do Not Skip State Refresh

Wrong: apply a patch and continue guessing.

Correct: read current state again and check `revision`, `idMap`, and `lastPatch`.

## Do Not Use Sandbox Commands for Local Service Checks

Wrong: try to hit the ClipNode local service from a sandboxed command.

Correct: use an out-of-sandbox request or the MCP tools.
