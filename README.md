# Personal Pi Skills

一套为 Pi 定制的个人开发工作流：保留 superpowers 的需求理解和 skill 编写方法，吸收 ponytail 的复用与最小化原则，并把大需求变成可分段审查的交付物。当前包含 7 个 skills，另有 Pi 状态扩展。

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
- `调试` 或 `/debug`：从日志和复现证据开始排查，未完成原始复现验证时不声称修复。

默认不要求 TDD。认证、权限、金额、迁移、并发、数据丢失风险或明确回归问题，才会提高测试和验证强度。

默认回答先给核心结论：纯问答、确认或状态查询保持 1-3 句，需要枚举时使用紧凑列表；实际改动时才简短说明变更、验证和必要风险。最终答复额外用两行 `不确定：...`、`遗漏：...` 暴露真实缺口，每行一句；用户要求精确字符串、机器可读格式或仅输出命令结果时除外。只有用户要求细节、存在阻塞，或任务本身属于深度设计、审查、调试时才展开。

## 状态

Pi 底部状态会显示唯一 skill 数和总使用次数：

```text
🐂🐎 2 skills / 4 uses
```

编辑器上方显示当前 Pi 会话累计观测到的 skill 及每个 skill 的使用次数：

```text
adaptive-workflow*3, debugging-with-evidence*1
```

同一个请求内通过原始命令、展开的 skill block 和读取 `SKILL.md` 等多个途径观测到同一个 skill，只计一次；下一次请求再次使用才增加计数。观测到不等于模型一定遵守了 skill。

可用命令：

```text
/skills
/debug <日志或问题>
/sync-skills
```

`/debug` 会显式加载证据调试 skill；普通日志、报错和异常任务也会按 skill 描述自动匹配。

## 上游同步

来源和吸收记录在 `sources/manifest.json`。`syncing-upstream` 是手动 skill，不会被模型自动调用；需要时显式使用 `/skill:syncing-upstream`，或直接使用 `/sync-skills` 命令。先分析：

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
npm run validate
npm run test:sync
npm run test:extension
git diff --check
```

`docs/superpowers/specs/` 记录设计边界，`evaluations/scenarios.md` 记录工作流验收场景。
