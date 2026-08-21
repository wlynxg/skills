# Debug Report Template

```markdown
# Debug Report: <short title>

## Status
- State: reproduced | not-reproduced | blocked | verified-fixed | unverified
- Environment: <runtime, OS, version, config, commit>
- Scope: <command, endpoint, test, user flow>

## Symptom
- Actual:
- Expected:
- First observed:
- Input / IDs / ordering:

## Reproduction
### Before Fix
- Command or exact steps:
- Result:
- Evidence:

### After Fix
- Same command or steps:
- Result:
- Evidence:

## Root Cause
- File and line:
- Observed facts:
- Causal chain:
- Confidence: high | medium | low

## Hypotheses Not Confirmed
| Hypothesis | Supporting evidence | Missing/falsifying evidence | Next experiment |
|---|---|---|---|
| ... | ... | ... | ... |

## Change
- Files:
- Root-cause change:
- Intentionally not changed:

## Verification
| Check | Command / steps | Result | Evidence |
|---|---|---|---|
| Original reproduction | `...` | pass/fail/blocked | ... |
| Focused test | `...` | pass/fail/not-run | ... |
| Build/integration | `...` | pass/fail/not-run | ... |

## Remaining Risk
- ...

## User Action Needed
- <missing access, data, decision, or confirmation; write "none" when empty>
```

`verified-fixed` 只有在 Before Fix 确实失败、After Fix 使用同一场景通过时才允许使用。代码检查通过或测试未覆盖原始症状时只能是 `unverified`。
