---
name: clarifying-requirements
description: Use when a request is ambiguous, underspecified, spans multiple modules, or has unclear success criteria, boundaries, permissions, or failure behavior.
---

# Clarifying Requirements

需求澄清的目标是消除会导致返工的歧义，不是把每个任务变成 PRD。

## First Check

先读现有项目结构、相关入口和已有约定。若请求已经指明文件、函数、输入输出和验收方式，直接执行，不启动澄清流程。

## Ask Only High-Impact Questions

优先询问会改变实现方向的问题：

1. **结果**：用户最终要看到或得到什么？成功如何判断？
2. **边界**：哪些输入、角色、状态或数据范围包含/不包含？
3. **约束**：现有 API、兼容性、安全、性能或不可逆操作有什么限制？

一次最多问 1-3 个最高影响问题。能从代码、仓库约定或低风险默认值确定的内容不要问。明确记录假设，并让用户只修正真正重要的假设。

## Short Design Contract

信息足够后，在实现前给出一段短契约：

```text
目标：...
范围：包含 ...；不包含 ...
实现：修改 ...，沿用 ...
验证：运行 ...；检查 ...
风险/假设：...
```

普通任务停在聊天中的短契约，不创建 PRD 或 spec 文件。只有新子系统、跨边界接口或用户明确要求时才写长期设计文档，并交给 `reviewable-delivery` 组织后续交付。

## Stop Conditions

- 用户说 `澄清` 或 `/clarify`：只澄清并输出契约，不写代码。
- 需求已明确：停止提问并执行。
- 发现认证、权限、金额、迁移、并发、数据丢失或不可逆行为：升级到 deep，并使用 `reviewable-delivery`。
- 仍有多个互斥方案：列出最多 2-3 个方案，给出推荐和取舍，让用户选择影响最大的决策。

## Anti-Patterns

- 不生成 clarity score，不追求 90/100。
- 不为了形式补齐“用户故事、风险矩阵、四阶段 PRD”。
- 不问已经能从代码确认的问题。
- 不在澄清阶段偷偷实现一半。
