---
name: absorbing-skills
description: Use when researching or comparing upstream guidance to change this personal Pi skill library, deciding which principles to keep, adapt, or reject; not for routine API documentation or ordinary coding.
---

# 吸收上游经验

只在维护本技能库时使用，不因普通业务开发参考了外部文档就启动吸收流程。吸收原则而非复制文件，优先修复反复出现的具体问题。

## 选择标准

对候选经验判断：

1. 对应哪个实际痛点、用户约定或可证实缺口？不能仅凭流行度推荐。
2. 与已有规则是否重复、冲突？能否改一段现有规则而非新增 skill？
3. 有无更简单的原生能力或短规则？流程成本是否匹配风险？
4. 如何验证实际选择改变，而不仅是会复述新文字？

优先判断条件、输出契约与可验证检查；谨慎引入全局门禁、强制文档、自动代理编排和运行器专属命令。用户已有批准范围内可自主推荐和取舍，不把每个细节重新抛给用户。

## 最小吸收流程

1. 读取相关源文件全文及必要引用，分清源原则与个人改写；搜索摘要、排名和模型自述不是源证据。
2. 先指出本地承载位置、冲突和预期行为。重大流程或授权边界变化先确认；已有明确授权不重复批准。
3. 在最合适的现有 skill 中改最短规则，不做一对一镜像，不擅自改第三方安装包。
4. 验证统一交给 [creating-skills](../creating-skills/SKILL.md) 与其评估指南，不再重复建立第二套测试/报告。
5. 更新来源记录，简述实际验证与限制。仅保留建议时不写成“已经吸收”。

## 来源记录

实际吸收 Git skill 时更新 `sources/manifest.json` 的 mapping：

- `upstream`、`local`：精确源路径和本地承载位置。
- `status`：`absorbed`、`adapted` 或 `rejected`。
- `absorbed`、`adapted`、`rejected`：采用、个人调整与拒绝理由。

文章或非 Git 文档引用放在已有 reference/报告中，不伪造 Git 来源、baseline 或已验证效果。单纯调研无需新增正式依赖和技能。

提交、推送与推进 baseline 都是独立授权：吸收或验证完成不代表应自动 commit/push；没有明确发布要求就保留未提交改动。需要提交时先核对仓库身份与变更归属，不夹带其他任务或方案文档。

## 收尾

用一个现有记录回答：吸收了什么、拒绝了什么、在哪里改、实际验证到哪、还剩什么限制。后续上游变化通过 `syncing-upstream` 评估，不覆盖个人改写。
