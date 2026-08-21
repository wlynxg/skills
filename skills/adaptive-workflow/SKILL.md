---
name: adaptive-workflow
description: Use when deciding how much process a coding task needs, when a small change risks being over-planned, or when choosing between fast, normal, and deep execution.
---

# Adaptive Workflow

## Core Rule

先理解任务和受影响的真实流程，再选择能覆盖风险的最短工作流。流程成本必须随风险增长，不随“这是代码改动”自动增长。

## Mode Selection

| 模式 | 进入条件 | 必做 | 不做 |
|---|---|---|---|
| `fast` | 需求明确，影响局部，低风险，通常 1-2 个文件 | 读相关代码，最小修改，最小验证 | PRD、计划文件、批量测试、无关重构 |
| `normal` | 有有限歧义，跨几个文件，或存在可逆行为变化 | 澄清关键问题，短设计，针对性验证 | 完整 spec、逐步任务清单、无关测试 |
| `deep` | 新子系统、公共 API、认证/权限、金额、迁移、并发、数据丢失，或明显超过 30 分钟 | 需求澄清、review packet、垂直切片、风险匹配的验证 | 未经确认的不可逆操作 |

以下输入只覆盖当前请求：`快修`/`/fast`、`澄清`/`/clarify`、`深度设计`/`/deep`、`只做方案`/`/design`、`审查`/`/review`。

隐藏复杂度出现时立即升级模式；不要为了维持原计划继续用轻流程。

## Minimality Ladder

在确认需求后按顺序检查：

1. 这个需求是否真的需要存在？
2. 仓库里是否已有 helper、类型、模式或依赖可以复用？
3. 标准库是否已经解决？
4. 原生平台能力是否已经解决？
5. 已安装依赖是否已经解决？
6. 能否用更少的文件和更短的 diff 完成？

修 bug 时先追踪被修改函数的所有调用者，优先修共享根因，不在每个调用点堆补丁。

## Verification By Risk

- 文案、格式、CSS、简单配置：运行现有 lint/build 或做最小人工检查。
- 局部业务行为：复用已有测试；只有缺少保护且行为值得长期保留时才加一个聚焦测试。
- 稳定可复现的 bug：增加一个能复现并防止回归的检查。
- 安全、权限、金额、迁移、并发、数据写入：提高到 `deep`，使用集成验证；必要时才采用 TDD。

严格 TDD 不是默认步骤。用户明确要求、风险足够高，或测试先行能澄清接口时才加载 TDD skill。

## Completion Shape

完成时只报告：改了什么、实际运行了什么验证、仍有哪些未验证风险。不要用新增文档、测试数量或流程步骤替代真实证据。

## Red Flags

- 明确的小改动开始生成 PRD、spec 或 2-5 分钟任务清单。
- 为了“遵守 TDD”批量新增与风险无关的测试。
- 没有读代码就选择最小 diff。
- 已经发现权限、数据或不可逆操作风险，却仍按 `fast` 继续。
