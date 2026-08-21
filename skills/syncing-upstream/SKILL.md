---
name: syncing-upstream
description: Use when checking Git/GitHub skill sources for new upstream changes, reviewing a sync report, or selectively updating a local skill without losing personal adaptations.
disable-model-invocation: true
---

# Syncing Upstream Skills

This skill is manual-only. Load it with `/skill:syncing-upstream` when you explicitly want to inspect or absorb upstream changes; do not invoke it for ordinary coding tasks.

## Core Rule

同步先产生证据，再由人选择吸收。默认只比较和报告，不覆盖本地 skill，不自动推进 baseline。

## Source Of Truth

读取 `sources/manifest.json`。每个 source 至少有 Git URL、ref、baseline commit 和 mappings。每个 mapping 说明 upstream 文件、local 文件以及 `absorbed`、`adapted`、`rejected` 记录。

## Check Flow

运行：

```bash
node scripts/sync-skills.mjs
```

报告应区分：

- 已映射文件的新增、修改、删除。
- 未映射的上游 skill 候选。
- 当前 baseline、当前 ref 和当前 commit。
- 对应本地文件，以及本地与上游的差异摘要。

网络、Git 或 ref 失败时停止该 source，显示可行动的错误，不伪造“无变化”。

## Selective Absorption

对每个变化选择：

- `吸收`：将原则改写进现有 local skill。
- `新建`：上游能力独立且确实有需要时新增本地 skill。
- `拒绝`：记录原因，例如流程成本过高、与个人偏好冲突或 Pi 已有更简单实现。
- `暂缓`：不改变代码，但在报告或 issue 中留下后续判断点。

使用 [absorbing-skills](../absorbing-skills/SKILL.md) 更新 manifest 的映射记录。不能把上游 diff 直接当作本地 patch 应用，因为本地 skill 有意偏离上游。

## Advance Baseline

完成选择性吸收、验证和提交后，才运行：

```bash
node scripts/sync-skills.mjs --mark-baseline <source-id> --yes
```

该命令只更新指定 source 的 baseline commit。若没有 `--yes`，拒绝修改。baseline 代表“已检查到这里”，不代表“所有上游内容都已吸收”。

## Safety

同步脚本只能写 `reports/`（显式要求时）和用户明确指定的 manifest baseline；不能写 `skills/`。运行前后用 `git diff -- skills sources/manifest.json` 检查本地意外变化。
