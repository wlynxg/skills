# Personal Pi Skills

一套为 Pi 定制的个人开发工作流：保留 superpowers 的需求理解和 skill 编写方法，吸收 ponytail 的复用与最小化原则，并把大需求变成可分段审查的交付物。

## 安装

```bash
pi install /root/skills
```

安装后运行 `/reload`。如果同时使用上游 Superpowers，建议在 `pi config` 中关闭它的自动 bootstrap 扩展，只保留需要时显式调用的 skills。

## 工作模式

默认自动分级，也可以用前缀或命令覆盖当前请求：

- `快修` 或 `/fast`：明确、局部、低风险的小改动。
- `澄清` 或 `/clarify`：只澄清需求并给出短设计，不实现。
- `深度设计` 或 `/deep`：高风险、多模块或大于约 30 分钟的任务。
- `只做方案` 或 `/design`：只生成方案或 review packet。
- `审查` 或 `/review`：检查当前差异和验证证据。

默认不要求 TDD。认证、权限、金额、迁移、并发、数据丢失风险或明确回归问题，才会提高测试和验证强度。

## 状态

Pi 底部状态会显示：

```text
🐂🐎 2 skills
```

编辑器上方会列出当前轮次和当前会话中**观测到**的 skills。观测到不等于模型一定遵守了 skill；统计会尽量记录原始 `/skill:name`、展开的 skill block，以及读取 `SKILL.md` 的行为。

可用命令：

```text
/skills
/sync-skills
```

## 上游同步

来源和吸收记录在 `sources/manifest.json`。先分析：

```bash
node scripts/sync-skills.mjs
```

输出只报告 upstream 与 baseline 的差异，不覆盖本地 `skills/`，也不自动推进 baseline。需要时可以写报告：

```bash
node scripts/sync-skills.mjs --write-report
```

吸收并验证后，才显式确认某个来源的 baseline：

```bash
node scripts/sync-skills.mjs --mark-baseline superpowers --yes
```

## 验证

```bash
node scripts/validate-skills.mjs
git diff --check
```

`docs/superpowers/specs/` 记录设计边界，`evaluations/scenarios.md` 记录工作流验收场景。
