#!/usr/bin/env node
import { readFileSync } from "node:fs";
import extension from "../extensions/skills-status.js";

const TOOL_RESULT = "tool_result";
const ADAPTIVE_BODY = readFileSync("skills/adaptive-workflow/SKILL.md", "utf8")
  .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
  .trim();

const handlers = new Map();
const commands = new Map();
const entries = [];
const statuses = [];
const widgets = [];
const sent = [];

const pi = {
  on(name, handler) {
    handlers.set(name, handler);
  },
  registerCommand(name, options) {
    commands.set(name, options);
  },
  appendEntry(type, data) {
    entries.push({ type, data });
  },
  sendUserMessage(text) {
    sent.push(text);
  },
};

extension(pi);

const skills = [
  { name: "adaptive-workflow", filePath: `${process.cwd()}/skills/adaptive-workflow/SKILL.md` },
  { name: "reviewable-delivery", filePath: `${process.cwd()}/skills/reviewable-delivery/SKILL.md` },
  { name: "debugging-with-evidence", filePath: `${process.cwd()}/skills/debugging-with-evidence/SKILL.md` },
  { name: "clarifying-requirements", filePath: `${process.cwd()}/skills/clarifying-requirements/SKILL.md` },
];
const ctx = {
  mode: "tui",
  hasUI: true,
  isIdle: () => true,
  ui: {
    setStatus(key, text) {
      statuses.push([key, text]);
    },
    setWidget(key, content) {
      widgets.push([key, content]);
    },
    notify() {},
  },
  sessionManager: { getBranch: () => [] },
  getSystemPromptOptions: () => ({ skills }),
  exec: async () => ({ stdout: "ok", stderr: "", code: 0 }),
};

await handlers.get("session_start")({}, ctx);
await handlers.get("input")({ source: "interactive", text: "/skill:reviewable-delivery" }, ctx);
const before = await handlers.get("before_agent_start")({
  prompt: "<skill name=\"reviewable-delivery\" location=\"/tmp/reviewable-delivery/SKILL.md\">\nbody\n</skill>",
  systemPrompt: "base",
  systemPromptOptions: { skills },
}, ctx);
if (!before.systemPrompt.includes("当前请求模式：自动判断")) throw new Error("automatic policy missing");
if (!before.systemPrompt.includes(ADAPTIVE_BODY)) throw new Error("full authoritative guide was not injected");
if (!before.systemPrompt.includes("先回答用户当前问题")) throw new Error("concise reply policy missing");
if (!before.systemPrompt.includes("用 1-3 句")) throw new Error("concise reply budget missing");
if (!before.systemPrompt.includes("不确定：...") || !before.systemPrompt.includes("遗漏：...")) throw new Error("uncertainty footer policy missing");
if (!before.systemPrompt.includes("用户要求精确字符串")) throw new Error("strict output exemption missing");
// 读取失败不记使用；完整注入的 adaptive-workflow 才能自动计数。
await handlers.get(TOOL_RESULT)({
  toolName: "read",
  input: { path: `${process.cwd()}/skills/clarifying-requirements/SKILL.md` },
  isError: true,
}, ctx);
for (let count = 0; count < 2; count++) {
  await handlers.get(TOOL_RESULT)({
    toolName: "read",
    input: { path: `${process.cwd()}/skills/reviewable-delivery/SKILL.md` },
    isError: false,
  }, ctx);
}
await handlers.get("agent_settled")({}, ctx);

if (entries.length !== 1) throw new Error(`expected one persisted entry, got ${entries.length}`);
if (entries[0].data.skills.join(",") !== "adaptive-workflow,reviewable-delivery") {
  throw new Error(JSON.stringify(entries));
}
if (entries[0].data.counts["adaptive-workflow"] !== 1 || entries[0].data.counts["reviewable-delivery"] !== 1) {
  throw new Error(`per-request counts missing: ${JSON.stringify(entries[0].data)}`);
}
if (!statuses.at(-1)?.[1].startsWith("🐂🐎 2 skills / 2 uses")) throw new Error("status icon/count missing");
if (widgets.at(-1)?.[1]?.[0] !== "adaptive-workflow*1, reviewable-delivery*1") {
  throw new Error(`unexpected single-line widget: ${JSON.stringify(widgets.at(-1))}`);
}

const transformed = await handlers.get("input")({ source: "interactive", text: "调试 webhook 偶发失败" }, ctx);
if (transformed?.action !== "transform" || transformed.text !== "/skill:debugging-with-evidence webhook 偶发失败") {
  throw new Error(`debug prefix was not transformed: ${JSON.stringify(transformed)}`);
}
await handlers.get("before_agent_start")({
  prompt: "<skill name=\"debugging-with-evidence\" location=\"/tmp/debugging-with-evidence/SKILL.md\">\nbody\n</skill>",
  systemPrompt: "base",
  systemPromptOptions: { skills },
}, ctx);
for (let count = 0; count < 2; count++) {
  await handlers.get(TOOL_RESULT)({
    toolName: "read",
    input: { path: `${process.cwd()}/skills/debugging-with-evidence/SKILL.md` },
    isError: false,
  }, ctx);
}
await handlers.get("agent_settled")({}, ctx);
if (entries.length !== 2) throw new Error(`expected two persisted entries, got ${entries.length}`);
if (entries[1].data.skills.join(",") !== "adaptive-workflow,debugging-with-evidence") {
  throw new Error(JSON.stringify(entries[1]));
}
if (!statuses.at(-1)?.[1].startsWith("🐂🐎 3 skills / 4 uses")) throw new Error("debug skill was not counted");
if (widgets.at(-1)?.[1]?.[0] !== "adaptive-workflow*2, debugging-with-evidence*1, reviewable-delivery*1") {
  throw new Error(`unexpected cumulative widget: ${JSON.stringify(widgets.at(-1))}`);
}

await commands.get("fast").handler("change timeout", ctx);
if (sent[0] !== "快修 change timeout") throw new Error(`unexpected command message: ${sent[0]}`);
const debugAlias = await handlers.get("input")({ source: "interactive", text: "/debug investigate logs" }, ctx);
if (debugAlias?.action !== "transform" || debugAlias.text !== "/skill:debugging-with-evidence investigate logs") {
  throw new Error(`debug alias was not transformed: ${JSON.stringify(debugAlias)}`);
}
ctx.sessionManager = {
  getBranch: () => [
    { type: "custom", customType: "personal-pi-skills", data: { skills: ["reviewable-delivery"] } },
    { type: "custom", customType: "personal-pi-skills", data: { counts: { "adaptive-workflow": 2, "debugging-with-evidence": 1 } } },
  ],
};
await handlers.get("session_start")({}, ctx);
if (widgets.at(-1)?.[1]?.[0] !== "adaptive-workflow*2, debugging-with-evidence*1, reviewable-delivery*1") {
  throw new Error(`session count restore failed: ${JSON.stringify(widgets.at(-1))}`);
}
// 所有模式都带同一份底线，快修不能绕过确认、阶段判断与验收。
const modePrompts = new Map([
  ["auto", "新增一个功能"], ["fast", "快修 修改超时"], ["normal", "普通 修改接口"],
  ["deep", "深度设计 修改跨域数据流"], ["clarify", "澄清 导出范围"],
  ["design", "只做方案 新功能"], ["review", "审查 当前差异"], ["debug", "/debug 错误日志"],
]);
for (const [mode, prompt] of modePrompts) {
  const policy = await handlers.get("before_agent_start")({ prompt, systemPrompt: "base", systemPromptOptions: { skills } }, ctx);
  if (!policy.systemPrompt.includes(`personal-pi-mode:${mode}`)) throw new Error(`incorrect mode: ${mode}`);
  if (!policy.systemPrompt.includes(ADAPTIVE_BODY)) throw new Error(`guide missing in ${mode}`);
  for (const rule of ["等待明确批准", "默认直接替换", "一次性操作", "不静默替换系统实现", "未实现、未验证和环境阻塞分别报告"]) {
    if (!policy.systemPrompt.includes(rule)) throw new Error(`rule missing in ${mode}: ${rule}`);
  }
  if (policy.systemPrompt.includes("明确、局部、低风险的小改动直接完成")) throw new Error("obsolete shortcut still injected");
  if (["clarify", "design"].includes(mode) && !policy.systemPrompt.includes("不实施业务改动")) throw new Error("design-only boundary missing");
  if (mode === "review" && !policy.systemPrompt.includes("不自动实施审查建议")) throw new Error("review-only boundary missing");
  if (mode === "debug" && !policy.systemPrompt.includes("区分未复现、未验证与修复后仍失败")) throw new Error("debug status distinction missing");
}

// 无 UI 的 JSON/print 模式仍能注入规则、读取及持久化观测计数。
const headless = { isIdle: () => true, sessionManager: { getBranch: () => [] } };
await handlers.get("session_start")({}, headless);
const headlessPolicy = await handlers.get("before_agent_start")({ prompt: "新增接口", systemPrompt: "base" }, headless);
if (!headlessPolicy.systemPrompt.includes(ADAPTIVE_BODY)) throw new Error("headless policy missing");
await handlers.get(TOOL_RESULT)({ toolName: "read", input: { path: `${process.cwd()}/skills/adaptive-workflow/SKILL.md` }, isError: false }, headless);
await handlers.get("agent_settled")({}, headless);
if (entries.at(-1).data.counts["adaptive-workflow"] !== 1) throw new Error("headless injection/read deduplication failed");
console.log("extension smoke passed (authoritative policy, all modes, failed reads, headless and counts)");
