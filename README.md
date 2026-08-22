# Personal Pi Skills

一套为 Pi 定制的个人开发工作流：保留 superpowers 的需求理解和 skill 编写方法，吸收 ponytail 的复用与最小化原则，并把大需求变成可分段审查的交付物。当前包含 7 个 skills，另有 Pi 状态和模型路由扩展。

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
- `/route fast|normal|deep|debug|auto`：手动指定下一条请求的模型档位，跳过自动 Router。

默认不要求 TDD。认证、权限、金额、迁移、并发、数据丢失风险或明确回归问题，才会提高测试和验证强度。

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

默认启用模型 Router：每条普通请求先由高级 judge 做一次轻量分级，再按档位切换执行模型和思考等级；任务结束后恢复原模型。手动 `/route ...`、`/fast`、`/deep`、`/debug` 和中文模式优先于自动判断。`/router off` 可临时关闭，`/router on` 恢复。

## 模型路由配置

默认配置在 `config/model-router.json`。单台设备可以用 `~/.pi/agent/model-router.json` 覆盖其中的 judge、routes、超时和 enabled 设置；也可以通过 `PI_MODEL_ROUTER_CONFIG` 指定配置文件。

默认档位：

```text
fast   -> gpt-eco/gpt-5.4-mini   low
normal -> gpt-eco/gpt-5.5        medium
deep   -> gpt-eco/gpt-5.6-terra  high
debug  -> gpt-eco/gpt-5.6-terra  high
```

judge 默认使用 `gpt-eco/gpt-5.6-terra` + `low`，只返回结构化档位，不进入主会话上下文。目标模型不可用或 judge 失败时回退到当前模型/启发式分级。

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
npm run test:router
git diff --check
```

`docs/superpowers/specs/` 记录设计边界，`evaluations/scenarios.md` 记录工作流验收场景。
