# Personal Pi Skills Design

## Goal

为 Pi 建立一套个人开发工作流：保留 superpowers 的需求理解和 skill 编写能力，吸收 ponytail 的复用与最小化理念；小任务快速完成，大需求提供可审查的中间产物，并支持从 Git 上游选择性同步。

## Scope

包含：

- 混合工作模式：自动分级，支持显式覆盖。
- 条件式需求澄清，不为明确的小改动生成 PRD。
- 大需求的 review packet、垂直切片、验证证据和高风险暂停点。
- 日志驱动的证据调试：复现、根因定位、修复前后对照和诚实状态报告。
- 个人 skill 的创建、评估、吸收和来源记录。
- Git/GitHub 上游 skill 的差异报告；默认不覆盖本地文件。
- Pi 扩展：`🐂🐎` 状态、会话累计观测到的 skill，以及默认高级模型 Router。

不包含：

- 默认 TDD。
- 自动修改或覆盖本地 skill。
- 自动把所有上游内容同步进本地。
- 独立 AI reviewer 作为唯一质量保障。
- 复杂的任务队列、数据库或额外运行时依赖。

## Workflow Modes

### Automatic

扩展每轮注入一段轻量策略，模型根据任务判断：

- `fast`：需求明确、影响局部、低风险；读取必要上下文，直接修改，运行最小验证。
- `normal`：存在有限歧义或跨多个文件；只澄清影响实现的问题，给出短设计后执行。
- `deep`：新子系统、公共接口、认证/权限、数据迁移、并发、金额、数据丢失风险，或明显超过 30 分钟；使用完整澄清、review packet、垂直切片和验证。

默认不使用 TDD。只有高风险、稳定回归问题或用户明确要求时，才加载 `test-driven-development`。

### Explicit Overrides

支持以下前缀和 Pi 命令：

- `快修` / `/fast`：强制 `fast`。
- `澄清` / `/clarify`：只澄清和给出短设计，不实现。
- `深度设计` / `/deep`：强制 `deep`。
- `只做方案` / `/design`：只输出方案或 review packet。
- `审查` / `/review`：针对当前差异或交付物生成审查摘要。
- `调试` / `/debug`：强制使用证据调试流程，先复现再修复。
- `/route fast|normal|deep|debug|auto`：手动覆盖模型档位并跳过自动 Router。

显式模式只覆盖当前请求，不改变后续请求的默认分级。

## Reviewable Delivery

深度任务开始时生成 `docs/reviews/<slug>-packet.md`，至少包含：

- 目标和非目标。
- 成功标准与不变量。
- 变更边界和架构图（文字即可）。
- 风险清单及风险等级。
- 垂直切片表：用户可见结果、文件边界、验证命令、状态。
- 关键决策、未决问题和验证证据。

每个切片必须有可独立验证的结果。普通切片可连续执行；涉及安全、数据、公共 API、迁移、并发或不可逆操作时暂停等待确认。交付摘要必须给出变更文件、diff 检查结果、实际运行的验证命令和未验证风险。

## Skill Library

本地 skills 分为：

- `adaptive-workflow`：分级和显式覆盖。
- `clarifying-requirements`：需求澄清的短流程。
- `reviewable-delivery`：大需求可审查交付。
- `creating-skills`：创建和评估个人 skill。
- `absorbing-skills`：选择性吸收上游 skill。
- `syncing-upstream`：上游差异分析（手动调用）。
- `debugging-with-evidence`：日志和运行时证据驱动的调试。

Skill 的 `SKILL.md` 保持短小；重型模板或评估说明放在同目录的 references 文件中。核心 skill 不复制上游全文，避免后续同步时无法判断本地意图。

## Upstream Sync

`sources/manifest.json` 是唯一来源登记表。每个来源记录：

- Git URL、分支或 ref、上次确认的 commit。
- 上游 skill 路径与本地 skill 路径映射。
- `absorbed`：已吸收的原则或章节。
- `adapted`：本地改写点。
- `rejected`：明确不采用的上游机制及原因。

`scripts/sync-skills.mjs`：

1. 拉取或更新临时上游 checkout。
2. 比较 manifest 基线 commit 与当前 commit。
3. 报告上游 skill 的新增、修改、删除和未映射候选。
4. 对已映射文件输出 diff 位置和本地文件。
5. 不写入 `skills/`，不更新基线。

人工吸收并验证后，才使用显式命令更新某个来源的 baseline。同步报告可选择写入 `reports/`，默认只输出到终端。

## Pi Extensions

`extensions/skills-status.js` 负责 skill 统计和工作流模式；`extensions/model-router.js` 负责默认模型调度。Router 在主 agent 开始前用高级 judge 做隔离判断，按档位切换执行模型，agent settle 后恢复原模型；手动档位优先，调度失败回退当前模型。

`extensions/skills-status.js`：

- 注入自动分级的短策略和当前显式模式。
- 注册 `/fast`、`/clarify`、`/deep`、`/design`、`/review`、`/skills`、`/sync-skills`，并将 `/debug` 作为 input 别名处理以避免非交互模式的会话生命周期冲突。
- 将 `调试 ...` 和 `/debug ...` 展开为 `debugging-with-evidence` skill。
- 通过已展开的 `<skill name="...">`、原始 `/skill:name` 和对 `SKILL.md` 的 `read` 调用观测 skill 使用。
- 不把“已发现”误报为“已使用”。自动策略使用 `adaptive-workflow` 时标记为 active。
- 在底部显示 `🐂🐎 N skills / M uses`，在编辑器上方显示单行的 `skill*count` 累计列表。
- 同一请求内重复观测同一个 skill 只计一次。
- 通过隐藏的 custom session entry 保存计数，不把统计写进模型上下文，并兼容旧的 skills 数组记录。

## Acceptance Criteria

- `pi -e ./extensions/skills-status.js` 能加载且无 TypeScript/JavaScript 语法错误。
- `pi install /root/skills` 后能发现 7 个本地 skills 和模型路由扩展。
- 明确的小改动不会被规则要求生成计划、PRD 或测试套件。
- 深度任务规则要求 review packet、垂直切片和验证证据。
- 没有显式用户要求时，TDD 不是默认步骤。
- 同步脚本在没有网络时给出可读错误，不改动本地 skills 或 manifest。
- 同步脚本能识别上游新增/修改/删除的 `skills/**` 文件，并区分已映射与未映射。
- 状态扩展至少能记录显式 `/skill:name` 和读取对应 `SKILL.md` 的情况。
- 日志或异常调试在无法复现时报告 `blocked`/`not-reproduced`/`unverified`，不声称已修复。
- 修复后只有原始复现同条件通过时才报告 `verified-fixed`。
- `🐂🐎` 图标不会修改第三方 ponytail 包。

## Decisions

- 运行范围：Pi 专用。
- 来源范围：Git/GitHub 仓库。
- 工作模式：自动分级 + 显式覆盖。
- 大需求辅助：总体 review packet + 垂直切片 + 高风险边界暂停。
- 统计语义：观测到的 skill，而不是模型是否真正遵守了 skill；按请求去重并累计每个 skill 的使用次数。
- 默认测试策略：风险驱动；TDD 按需。
- 默认模型策略：高级模型低思考做路由；执行模型按 fast/normal/deep/debug 档位切换；手动入口覆盖自动路由。
