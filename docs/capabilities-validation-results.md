# Validation Results

[中文版本](capabilities-validation-results.zh-CN.md)

Read this page when validation or apply returns output that the AI needs to interpret quickly.

## When To Read Me

- You already ran validate or apply.
- You want to know what to do next without re-deriving the failure.
- You want to explain the result to the user.

## Common Outputs

| Output | Meaning | What To Do |
|---|---|---|
| `suggestedFix` | The app already knows a safer patch shape. | Apply the fix and validate again. |
| `needConfirmation` | The user must confirm before create/export. | Explain the plan and wait for confirmation. |
| `revision_conflict` | The draft changed after you built the patch. | Re-read current state and rebuild against the new revision. |
| `pendingSections` | Some sections are still settling or projecting. | Wait briefly and re-read instead of overwriting the stable spec. |
| `runtimeVerifiedSections` | These sections have runtime coverage for the current result. | Use them to trust what the App actually accepted. |
| `idMap` | Canonical ids for newly created objects. | Store the returned ids and stop guessing. |

## Short Examples

### suggestedFix

If validation returns a fix, apply that shape and validate again instead of inventing a new patch.
Action: copy the suggested shape, rebuild the request, and run validate again.

### needConfirmation

If the response says confirmation is needed, do not create yet. Explain the plan in plain language and wait.
Action: ask the user to confirm before calling create.

### revision_conflict

If apply conflicts, re-read `clipnode_edit_get_current_state`, update `baseRevision`, rebuild the patch, and apply again.
Action: refresh state first, then re-run the same intent against the new revision.

### pendingSections

If the state is temporarily pending, do not rewrite the data from a stale read. Wait briefly, re-read, and only then decide whether to apply.
Action: pause, read again, and avoid overwriting stable spec with transient runtime values.

### idMap

If `idMap` is returned, store the canonical ids immediately and use them for any later patch or selection.
Action: replace every temporary id with the canonical id before the next step.

## Action Table

| Result | Next move |
|---|---|
| `suggestedFix` | Copy it, rebuild the request, validate again. |
| `needConfirmation` | Ask the user before create/export. |
| `revision_conflict` | Re-read current state and rebuild against the new revision. |
| `pendingSections` | Wait briefly and re-read before touching data. |
| `idMap` | Replace all temporary ids with canonical ids immediately. |

## Rule Of Thumb

- Validation output is guidance, not noise.
- Prefer the app's suggested fix over a fresh guess.
- Use the returned revision and canonical ids after apply.

## Next Pages

- [capabilities-live-session-patching-core.md](capabilities-live-session-patching-core.md)
- [capabilities-live-session-patching.md](capabilities-live-session-patching.md)
- [capabilities-validation-and-rules.md](capabilities-validation-and-rules.md)
