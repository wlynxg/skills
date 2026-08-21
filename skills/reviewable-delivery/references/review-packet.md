# Review Packet Template

```markdown
# <Feature> Review Packet

## Goal
- User outcome:
- Success criteria:

## Non-goals
- Not included:

## Boundaries and Invariants
- Boundary:
- Invariant:
- Compatibility requirement:

## Data Flow
<短文字或 Mermaid 图；只画影响本次变更的路径>

## Risks
| Risk | Likelihood | Impact | Mitigation | Residual risk |
|---|---:|---:|---|---|
| ... | low/medium/high | low/medium/high | ... | ... |

## Decisions
- Decision:
- Reason:
- Alternatives rejected:

## Vertical Slices
| Slice | User-visible result | Main files | Verify | Status |
|---|---|---|---|---|
| 1 | ... | ... | `...` | pending |

## Stop Points
- [ ] Confirm before changing ...

## Evidence Log
| Slice | Command | Result | Evidence |
|---|---|---|---|
| 1 | `...` | pass/fail | ... |

## Remaining Risks
- ...
```

状态只使用 `pending`、`in-progress`、`verified`、`blocked`。不要把“代码写完”当作 `verified`。
