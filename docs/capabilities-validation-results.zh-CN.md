# 校验结果

[English version](capabilities-validation-results.md)

当 validate 或 apply 返回结果后，先读这一页，帮助 AI 快速判断下一步。

## 什么时候读我

- 你已经跑完 validate 或 apply。
- 你想快速知道下一步怎么做。
- 你想把结果解释给用户听。

## 常见输出

| 输出 | 含义 | 下一步 |
|---|---|---|
| `suggestedFix` | App 已经给出了更安全的 patch 形状。 | 先应用修正，再重新 validate。 |
| `needConfirmation` | 创建或导出前需要用户确认。 | 先解释方案，等用户确认。 |
| `revision_conflict` | 你构建 patch 后草稿已经变了。 | 重新读取当前状态，并按新 revision 重建 patch。 |
| `pendingSections` | 某些 section 还在投影或稳定中。 | 先等一下，再读状态，不要覆盖稳定 spec。 |
| `runtimeVerifiedSections` | 这些 section 具备当前结果的 runtime 校验。 | 以它们为准判断 App 真正接受了什么。 |
| `idMap` | 新对象的 canonical id 映射。 | 保存返回的 id，不要再猜。 |

## 简短例子

### suggestedFix

如果 validation 返回修正建议，先按建议改，再 validate 一次，不要自己另起一版。
动作：直接抄建议形状，重建请求，再跑一次 validate。

### needConfirmation

如果响应要求确认，先不要 create。用自然语言把方案说清楚，再等确认。
动作：先让用户确认，再调用 create。

### revision_conflict

如果 apply 冲突，重新调用 `clipnode_edit_get_current_state`，更新 `baseRevision`，重建 patch，再 apply 一次。
动作：先刷新 state，再按新的 revision 重跑同一个意图。

### pendingSections

如果状态暂时 pending，不要把旧读数写回去。先等一小会，再读一次，确认稳定后再决定是否 apply。
动作：先暂停，等再次读取稳定后，再决定是否写入。

### idMap

如果返回了 `idMap`，立刻保存 canonical id，后续所有 patch 或选择都用这个 id。
动作：下一步前把所有临时 id 替换成 canonical id。

## 动作表

| 结果 | 下一步 |
|---|---|
| `suggestedFix` | 直接照抄修正形状，重建请求，再 validate 一次。 |
| `needConfirmation` | 在 create/export 前先问用户确认。 |
| `revision_conflict` | 重新读当前状态，再按新 revision 重建。 |
| `pendingSections` | 先等一下再读，不要马上动数据。 |
| `idMap` | 立刻把所有临时 id 换成 canonical id。 |

## 规则

- 校验结果是提示，不是噪音。
- 优先使用 App 给出的 suggested fix，而不是重新猜。
- apply 之后用返回的 revision 和 canonical id。

## 下一页

- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [capabilities-validation-and-rules.md](capabilities-validation-and-rules.md)
