# Personal Pi Skills

一套为 Pi 定制的个人开发工作流：保留 superpowers 的需求理解和 skill 编写方法，吸收 ponytail 的复用与最小化原则，并把大需求变成可分段审查的交付物。当前包含 8 个 skills，另有 Pi 状态扩展；工作流底线以 `adaptive-workflow/SKILL.md` 为唯一来源，每轮实际注入，其他 skills 按需读取。

## 安装

推荐从 GitHub 安装，方便在其他设备上使用和更新：

```bash
pi install git:github.com/wlynxg/skills@main
```

更新到最新版本：

```bash
pi update git:github.com/wlynxg/skills@main
```

安装或更新后运行 `/reload`，或者重启 Pi。确认当前安装来源：

```bash
pi list
```

本地仓库路径只用于开发和调试：

```bash
pi install /root/skills
```

同一环境只保留 GitHub 或本地其中一种来源，避免同一套 skills 被重复加载。若同时使用上游 Superpowers，建议在 `pi config` 中关闭它的自动 bootstrap 扩展，只保留需要时显式调用的 skills。

## 工作模式

默认自动分级，也可以用前缀或命令覆盖当前请求：

- `快修` 或 `/fast`：恢复既定行为或精确配置/文案调整，没有新的重要设计决策；不绕过确认和安全边界。
- `澄清` 或 `/clarify`：只澄清需求并给出短设计，不实现。
- `深度设计` 或 `/deep`：新子系统、稳定公共契约、跨域所有权、安全/金额/迁移/并发一致性等高影响任务；不只按文件数或耗时判断。
- `只做方案` 或 `/design`：只生成方案或 review packet。
- `审查` 或 `/review`：检查当前差异和验证证据。
- `调试` 或 `/debug`：从日志和复现证据开始排查，未完成原始复现验证时不声称修复。

默认不要求 TDD。认证、权限、金额、迁移、并发、数据丢失风险或明确回归问题，才会提高测试和验证强度。

### 职责分层

| 层级 | Skills | 使用边界 |
|---|---|---|
| 日常开发 | `adaptive-workflow`、`clarifying-requirements`、`debugging-with-evidence`、`verification-before-completion` | 分别负责流程、设计、故障和验收；只有 adaptive 正文每轮注入，其余按任务匹配。 |
| 复杂交付 | `reviewable-delivery` | 大需求/高影响任务的切片与审查，不要求每个小修改建 packet。 |
| 技能维护 | `creating-skills`、`absorbing-skills`、`syncing-upstream` | 只维护本库；编写负责评估，吸收负责来源与取舍，同步只在明确要求时检查。 |

8 个入口都保留，不按使用次数删除低频维护能力；没有新增技能。引用外部 API 文档不是技能吸收，普通功能开发不是技能编写；维护完成也不自动提交或推送。

### 决策底线

- 助手负责内部技术取舍，给推荐和理由；新功能与重要业务设计先对齐批准。已有完整批准或审阅方案后的明确委托不重复请示，部分回答不批准其他重要决策。
- 已确认未上线、未承诺旧契约且调用方可同步更新时，默认干净替换；不能仅凭 `dev`/版本号或仓内零引用推断。必要兼容先确认，放边界薄适配并记录删除条件。
- 未上线不代表能删数据；一次性迁移优先受控离线处理，不自动形成正式命令、常驻双写或新框架。安全、真实失败保护和明确要求的扩展不缩水。
- 检查边界不等于自动加缓存、重试、幂等和配置；优先复用框架与已有能力，减少长期概念和运行分支，而不只是缩短 diff。
- 完成前回到已批准验收项，核对实现、真实接入和实际证据；构建、局部单测、mock 或 skip 不证明整体完成。

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

同一个请求内通过原始命令、展开的 skill block、完整正文注入或成功读取 `SKILL.md` 等途径观测到同一个 skill，只计一次；下一次请求再次使用才增加计数。读取失败不增加计数。`adaptive-workflow` 自动计数来自完整正文实际注入，不是只注入简化提示就标成使用；观测到仍不等于模型遵守。

扩展不是工具审批或操作系统沙箱，不能保证阻止所有违规操作；没有默认引入新的审批状态机。

可用命令：

```text
/skills
/debug <日志或问题>
/sync-skills
```

`/debug` 会显式加载证据调试 skill；普通日志、报错和异常任务也会按 skill 描述自动匹配。

## Skill 来源

这些 skills 是针对 Pi 的本地改写和组合，不是对上游仓库的整套复制：

| 本地 skill | 主要来源 | 本地处理 |
|---|---|---|
| `adaptive-workflow` | [Ponytail](https://github.com/DietrichGebert/ponytail)、[Anthropic 官方指引](https://github.com/anthropics/claude-code) | 复用与最小维护负担；按阶段和真实消费者决定兼容，保留确认与数据安全。 |
| `clarifying-requirements` | [Superpowers](https://github.com/obra/superpowers) 的 `brainstorming`、Anthropic 的 `feature-dev` | 高影响澄清与批准；区分部分批准和既有授权，不强制小任务 PRD/spec。 |
| `creating-skills` | [Superpowers](https://github.com/obra/superpowers) 的 `writing-skills` 及其 skill 测试方法 | 保留渐进披露、压力场景和行为评估，按规则风险裁剪。 |
| `reviewable-delivery` | [Superpowers](https://github.com/obra/superpowers) 的验证与审查原则 | 可审查切片、复杂度检查与验收覆盖，复用记录而不堆多份产物。 |
| `verification-before-completion` | Superpowers 的 `verification-before-completion` | 逐项核对实现、接入与证据，不把局部通过当完整完成。 |
| `debugging-with-evidence` | [Superpowers](https://github.com/obra/superpowers)、[Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills)、[Wshobson agents](https://github.com/wshobson/agents)、[Warp common-skills](https://github.com/warpdotdev/common-skills) | 融合复现、根因追踪、差分实验和 `blocked`/`unverified` 等证据状态，适配本地代码调试。 |
| `absorbing-skills` | 本地工作流 | 记录吸收、改写、拒绝和验证理由。 |
| `syncing-upstream` | 本地工作流 | 根据来源 manifest 生成上游差异报告，不自动覆盖本地 skills。 |

完整的 Git URL、baseline commit、文件映射、吸收内容、改写内容和拒绝内容见 [`sources/manifest.json`](sources/manifest.json)。[Fowler 的 YAGNI](https://martinfowler.com/bliki/Yagni.html) 与 [Parallel Change](https://martinfowler.com/bliki/ParallelChange.html) 是原则参考，不作为 Git skill 上游自动同步。

## 上游同步

来源和吸收记录在 `sources/manifest.json`。`syncing-upstream` 是手动 skill，不会被模型自动调用；需要时显式使用 `/skill:syncing-upstream`，或直接使用 `/sync-skills` 命令。先分析：

```bash
node scripts/sync-skills.mjs
```

输出报告技能及 manifest 已映射 reference/command 相对 baseline 的差异，不覆盖本地 `skills/`，也不自动推进 baseline。报告摘要可能截断；吸收前另读相关完整源文件。需要时可以写报告（自定义路径只能位于 `reports/`，不能经过符号链接）：

```bash
node scripts/sync-skills.mjs --write-report
```

已检查相关变化、吸收部分验证完成，并获得推进该来源 baseline 的明确授权后再执行；无需为了记录检查强制创建提交：

```bash
node scripts/sync-skills.mjs --source superpowers --mark-baseline superpowers --yes
```

## 验证

```bash
npm run validate
npm run test:sync
npm run test:extension
git diff --check
```

`docs/superpowers/specs/` 是历史设计记录，当前生效规则以 skills 正文和扩展为准。`evaluations/scenarios.md` 记录工作流场景；[开发阶段行为评估](evaluations/development-stage.md) 覆盖兼容、一次性迁移、部分批准、额外机制与假完成。

上述命令只验证结构和扩展/sync 行为，不会自动调用模型，也不证明实际任务已正确完成。修改纪律性规则时另做隔离模型行为对照，按真实结果报告，不用规则复述或选择评估代替业务端到端验证。
