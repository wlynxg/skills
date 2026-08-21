---
name: absorbing-skills
description: Use when importing a useful idea from an upstream Git skill into the personal Pi library, when comparing two workflow skills, or when deciding what to keep, adapt, or reject.
---

# Absorbing Skills

## Core Rule

吸收原则，不复制文件。先理解上游为什么有效，再把对你有用的最小规则改写成本地工作流。

## Absorption Record

每次吸收都在 `sources/manifest.json` 对应 mapping 中更新：

- `upstream`：精确源文件路径。
- `local`：本地承载该原则的 skill 或 reference。
- `status`：`absorbed`、`adapted` 或 `rejected`。
- `absorbed`：采用了哪些原则/章节。
- `adapted`：为 Pi、你的节奏或当前工具做了什么改变。
- `rejected`：没有采用什么，为什么拒绝。

不要把“参考过”写成“已吸收”；要能指出本地哪一段规则承载了它。

## Selection Test

对每条候选内容问：

1. 它解决的是我反复遇到的问题吗？
2. 它是否与现有本地规则冲突？冲突点是什么？
3. 能否用一条短规则或一个脚本得到同样效果？
4. 它的流程成本是否匹配该风险，而不是无条件增加仪式？
5. 如何验证吸收后行为真的改善？

优先吸收判断标准、输出契约和可验证检查；谨慎吸收全局门禁、强制文档、自动代理编排和与运行器绑定的命令。

## Local Rewrite

1. 读取上游 skill 全文和直接引用的必要 reference。
2. 提炼可复用原则，去掉上游项目专属路径、身份和时间敏感内容。
3. 写入最合适的本地 skill；避免为了来源做一对一镜像。
4. 添加一个触发场景和一个不触发场景。
5. 运行 `node scripts/validate-skills.mjs`，再按规则风险做行为评估。
6. 更新 manifest 后提交本地变更和吸收理由。

吸收过程中不要直接覆盖当前 skill。需要大改时先写临时 diff 或新 reference，确认后再替换。

## Completion Record

最终记录必须能回答：吸收了什么、改了什么、拒绝了什么、在哪里验证、未来上游变化如何重新评估。
