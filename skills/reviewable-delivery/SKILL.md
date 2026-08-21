---
name: reviewable-delivery
description: Use when a change spans multiple modules, is difficult for one person to review, introduces high-impact behavior, or needs a clear audit trail from decisions to verification evidence.
---

# Reviewable Delivery

## Core Rule

把大任务切成用户能理解、能运行、能验证的垂直切片。review packet 是导航，不是替代代码审查；每个结论都要绑定实际 diff 或命令证据。

## Start With A Review Packet

深度任务开始时创建 `docs/reviews/<slug>-packet.md`。使用 [review-packet.md](references/review-packet.md) 的结构，先写：

- 目标、非目标和成功标准。
- 系统边界、数据流、不变量和关键决策。
- 风险：可能性、影响、缓解方式和剩余风险。
- 垂直切片：用户结果、文件边界、验证命令、状态。
- 需要用户确认的不可逆或高影响决策。

不确定的内容标成假设或未决问题，不伪装成已确认设计。

## Slice Rules

每个切片必须交付一个可独立验证的结果，例如一条端到端路径、一个完整接口行为或一个可运行的迁移前检查。避免按“先改类型、再改工具、最后改 UI”这种无法单独验收的技术层切片。

普通切片可以连续执行。涉及认证、权限、金额、迁移、并发、公共 API、数据删除或不可逆操作时暂停，先展示：

```text
边界：...
影响：...
方案：...
验证：...
需要确认：...
```

## Evidence Checkpoint

每个切片完成后记录：

- 修改的文件和行为变化。
- 实际运行的命令及结果。
- 与成功标准对应的证据。
- 未验证的边界和后续风险。

验证强度按风险选择。不要为了满足形式批量增加测试；但高风险行为不能只靠“看起来正确”。稳定 bug、接口契约和数据一致性问题优先留下可重复的回归检查。TDD 只在风险或用户要求支持它时启用。

## Human Review Surface

交付给用户的顺序固定为：

1. 一段总体结论和风险。
2. review packet 的变化摘要。
3. 每个切片的 diff、验证证据和未决点。
4. 最后才是完整文件清单和测试总结果。

用户不需要一次性审阅整个实现；优先审查目标、不变量、公共边界和每个切片的实际行为。

## Completion Gate

没有运行验证命令，不声称“完成”或“全部通过”。发现切片之间的假设不一致时，回到 packet 修正边界，再继续实现。
