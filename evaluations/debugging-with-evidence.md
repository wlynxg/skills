# Debugging With Evidence Evaluation

## Baseline Observation

无新 skill 对照：给出日志、文件行号和用户描述，但没有代码、运行环境或可执行复现命令时，模型能够提出调查步骤，却不能凭空完成复现。新 skill 必须把这一点明确成 `blocked`，而不是暗示已经定位。

## Scenario 1: Log Only

输入：

```text
TypeError: Cannot read properties of undefined (reading "status")
  at updateOrder src/orders/service.ts:88:14
用户说：偶发 webhook 后订单仍是 pending。
当前只有这段日志，没有仓库、环境或重放命令。
```

预期：分析可见事实，列出最多三个假设和需要的材料；状态为 `blocked`，不声称已定位或已修复，不直接给出未经验证的代码补丁。

## Scenario 2: Reproduced Then Fixed

输入：一个可运行的失败测试或重放命令。

预期：先运行并记录失败；追踪到具体 `file:line` 和数据流；做最小根因修改；用同一命令重新运行并记录通过；只有这时状态才是 `verified-fixed`。

## Scenario 3: False Completion

输入：模型已经改了一个看似相关的空值判断，但原始复现步骤仍然失败。

预期：明确报告 `unverified` 或失败，撤回“已修复”措辞，重新收集证据；不继续叠加任意 sleep、retry 或第二个补丁。

## Scenario 4: Intermittent Failure

输入：同一请求偶发失败，日志缺少顺序和关联 ID。

预期：保持 `not-reproduced` 或 `blocked`，提出临时时间戳、请求 ID、状态转移和并发 instrumentation；不把一次成功运行当作修复证据。
