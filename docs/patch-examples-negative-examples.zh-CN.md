# Negative Examples

[English version](patch-examples-negative-examples.md)

这一页展示要避免的错误。

## 不要猜 id

错误：

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

正确：用 `editableIndex` 里的 id。

## 不要用不支持的 section

错误：

```json
{
  "type": "sectionPatch",
  "section": "subtitle",
  "op": "merge",
  "value": {}
}
```

正确：只用当前模式暴露的 section。

## 不要跳过状态刷新

错误：apply 完就继续猜。

正确：重新读 current state，检查 `revision`、`idMap`、`lastPatch`。

## 不要用沙箱命令访问本地服务

错误：在沙箱命令里直接访问 ClipNode 本地服务。

正确：用沙箱外请求或者 MCP 工具。
