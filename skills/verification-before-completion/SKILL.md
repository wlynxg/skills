---
name: verification-before-completion
description: Use when about to claim a task, bug fix, feature, or refactoring is complete, passing, or ready, to ensure evidence precedes assertions.
---

# Verification Before Completion

## Iron Law（铁律）

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**
**（严禁在没有最新运行验证证据的前提下声称任务已完成、Bug 已修复或代码没毛病。）**

宣称“搞定了”、“测过了没问题”、“逻辑看过了没毛病”却拿不出当前会话的最新实际运行命令和结果，不是效率高，是欺骗。

## The Verification Gate Function（三步硬门禁）

在对用户说出任何“已完成”、“已修复”、“测试通过”之前，**必须且只能**执行以下三步：

1. **IDENTIFY（识别验证手段）**：
   - 确定哪条确切的命令、测试用例或调用脚本能从结果层面（Outcome-based）证明功能符合预期。
   - 严禁依赖“静态阅读代码觉得没问题”或“上一轮运行成功”作为证据。
2. **RUN（新鲜执行）**：
   - 在当前会话中完整执行该验证命令（例如：单元测试、接口 curl 请求、构建命令、数据一致性检查脚本）。
   - 必须全量执行，不能臆想执行结果。
3. **READ & INSPECT（检查实际输出）**：
   - 检查命令的真实退出码（Exit Code）、输出内容中的具体字段与返回体。
   - **结果级校验（Outcome Verification）**：不仅看接口是否返回 HTTP 200，还要检查返回的内容、字段值、数据库写入或缓存变更是否确实生效。

## Hard Constraints（硬性约束与禁用话术）

- **严禁使用模糊推测词**：
  - 严禁说：“应该没问题了”、“看起来改好了”、“代码逻辑我看过了没毛病”、“理论上已经生效”。
  - 如果执行了验证命令但环境受限无法端到端运行，必须明确使用 `unverified` 或 `blocked`，直说“改动已完成，但在当前环境无法实际运行验证（原因：...），需注意验证风险”。
- **汇报完成时必须带证据**：
  - 声称完成时，必须在回复中明确附带**执行的命令与核心输出片段**。

## Anti-Patterns

- **静态脑补**：以为自己代码写得规范，就跳过运行测试/接口，直接告诉用户“搞定了”。
- **假通过**：接口只测了 status=200，但返回体里其实是空对象或报错信息，却没有逐字段检查。
- **只顾 Happy Path**：测试时只测了一个最简单的成功用例，边界、空值、异常路径完全没测，就声称功能完整完成。
