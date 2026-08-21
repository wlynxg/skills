# Evaluating Skills

## Scenario Format

每个压力场景都应让模型作出实际选择，而不是回答“规则是什么”：

```markdown
IMPORTANT: 这是一次行为评估，请选择并执行。

背景：<真实任务、路径和限制>
压力：<至少三种具体压力>
选择：A / B / C
成功标准：<可观察行为>
```

## RED / GREEN / REFACTOR

- **RED**：无 skill 对照，记录实际选择、遗漏和原话中的合理化。
- **GREEN**：写最短规则，重新运行同一场景。
- **REFACTOR**：若出现新绕过方式，只补对应反例或输出契约，然后重跑。

至少手工查看每个失败样本。模型复述 skill 文本不算通过；只有行为符合成功标准才算通过。

## Pressure Mix

纪律型 skill 的场景优先组合：

- 时间压力：部署窗口、生产故障、紧急交付。
- 沉没成本：已有大量代码或文档。
- 权威压力：用户或负责人要求跳过检查。
- 疲劳/社交压力：不想显得流程主义，或已经接近下班。

## No Subagent Fallback

Pi 没有内置 subagent 时，不伪造 `Task` 调用。可使用新的 Pi 进程、临时 `--no-skills` 对照，或记录人工控制组。对纯参考 skill，检查 frontmatter、路径、链接和一个检索应用场景即可。

## Minimum Record

```markdown
## Evaluation: <name>
- Control:
- Skill:
- Scenario:
- Expected:
- Observed:
- Decision: pass | revise
- Follow-up:
```
