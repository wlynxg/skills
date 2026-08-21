---
name: creating-skills
description: Use when creating, editing, evaluating, or packaging a reusable Pi skill, especially after absorbing a workflow from another skill or observing repeated agent mistakes.
---

# Creating Skills

## Core Rule

Skill 是可复用的判断和操作指南，不是一次会话的复盘文章。先验证真正的失败，再写能修复该失败的最短规则。

## Authoring Flow

1. **Define the trigger**：描述症状、任务类型和不该触发的相邻场景。
2. **Write an evaluation**：至少一个正常场景；纪律型规则再加 2-3 个包含时间、惯性、权威或沉没成本的压力场景。
3. **Run a control**：没有新 skill 时观察默认行为，记录具体错误或合理化。没有可用 subagent 时，使用新的 Pi 进程或同一进程的无 skill 对照。
4. **Write the minimum guidance**：先写触发、决策、输出契约和一个例子。不要复制上游全文。
5. **Verify with the same scenarios**：确认行为改变，而不是只确认模型能复述文字。
6. **Refactor**：只针对实际出现的新漏洞补规则；纯参考型 skill 可用结构、链接和检索检查代替压力测试。

## Skill Shape

- `SKILL.md` 的 frontmatter 只包含有效的小写名称和以 `Use when...` 开头的触发描述。
- 正文保持短小；重型模板和评估材料放到一层深的 `references/`。
- 描述写“何时触发”，不要把完整流程塞进 description。
- 使用明确的输出模板解决“输出形状错误”；使用条件规则解决“不同风险不同流程”。
- 一个优秀、可运行或可直接适配的例子胜过多个泛化例子。

## Local Acceptance

新 skill 至少通过：

- Pi 能发现它，名称和描述合法。
- 触发场景能找到并读取它。
- 不触发场景不会把普通任务升级成不必要的流程。
- 规则型 skill 在压力场景下保留关键行为。
- `node scripts/validate-skills.mjs` 通过，且无 TODO/TBD 占位。

写 skill 本身不意味着以后开发必须 TDD。TDD 是某些高风险生产行为的可选工具；skill 规则的评估才需要在适当场景下做行为验证。

## Common Mistakes

- 把上游 skill 全文复制进本地，导致来源边界和本地意图消失。
- 只测“模型是否知道规则”，不测它在时间压力下是否执行规则。
- 把所有 skill 都当作纪律型 skill，造成无意义的评估成本。
- description 写成 workflow 摘要，模型因此跳过正文。
- 新增多个 skill 后只验证最后一个；每个 skill 都要单独通过结构和触发检查。
