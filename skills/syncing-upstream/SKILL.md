---
name: syncing-upstream
description: Use when explicitly asked to inspect Git/GitHub skill-source changes, review a sync report, or update the source baseline of this personal skill library.
disable-model-invocation: true
---

# 检查上游技能变化

只在用户显式要求同步检查或使用 `/skill:syncing-upstream`、`/sync-skills` 时使用，不因普通编码任务或发现上游链接就发起全量同步。默认只读比较，不覆盖个人规则、不自动发布或推进 baseline。

## 入口与范围

先读本包 `sources/manifest.json`，确认来源、ref、baseline 与 mappings。下列命令必须在本包根目录运行；根目录由本 skill 的位置向上两级确定，不猜当前业务仓就是包根。

已指定来源时只检查该来源，避免为一项变化拉取全部仓库：

```bash
node scripts/sync-skills.mjs --source <source-id>
```

用户明确要求所有来源时才省略 `--source`。需要留档可加 `--write-report`；自定义 `--report` 只能是 `reports/` 内普通文件路径，不能指向 skill、manifest 或经过符号链接。

## 报告必须覆盖

- 原 baseline、实际当前 ref/commit。
- 上游 `SKILL.md` 的新增、修改、删除和未映射候选。
- manifest 已映射的 reference、command 等文件变化及对应 local；不能只检查文件名为 `SKILL.md` 的项。
- 映射变化的实际 diff、未检查范围与失败原因。

脚本摘要会截断长 diff；有截断时先取得相关完整源文件和必要上下文，再判断是否吸收，不能把省略内容当无变化。网络、Git、ref 或读取失败时报告该来源阻塞，不说“全部无变化”。

## 选择性吸收

对变化给推荐：吸收进现有规则、新建确有独立用途的技能、拒绝重复/冲突/高流程成本的机制，或暂缓并说明缺失证据。

实际吸收使用 [absorbing-skills](../absorbing-skills/SKILL.md)，验证由 `creating-skills` 负责；同步检查本身不再建一套 authoring 流程。不能将上游 diff 直接当个人规则 patch，也不修改第三方安装包。

## 推进 baseline 的单独授权

baseline 表示“该来源已检查到这里”，不代表内容都已吸收。只有用户明确同意推进指定来源、相关映射变化已审查且拟吸收部分已验证后，才执行：

```bash
node scripts/sync-skills.mjs --source <source-id> --mark-baseline <source-id> --yes
```

`--yes` 是执行确认，不是替代用户同意；检查或吸收授权不自动包含推进 baseline、commit 或 push。无需为了记录检查结果强制创建提交。

## 收尾

运行前后核对 `git diff -- skills sources/manifest.json`，区分本来已有改动与本次新增。汇报具体来源、检查到的 commit、推荐和真实限制；不贴全量无关 diff，不隐藏漏检或失败。
