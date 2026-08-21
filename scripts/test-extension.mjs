#!/usr/bin/env node
import extension from "../extensions/skills-status.js";

const handlers = new Map();
const commands = new Map();
const entries = [];
const statuses = [];
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
];
const ctx = {
  mode: "tui",
  hasUI: true,
  isIdle: () => true,
  ui: {
    setStatus(key, text) {
      statuses.push([key, text]);
    },
    setWidget() {},
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
await handlers.get("tool_call")({
  toolName: "read",
  input: { path: `${process.cwd()}/skills/reviewable-delivery/SKILL.md` },
}, ctx);
await handlers.get("agent_settled")({}, ctx);

if (entries.length !== 1) throw new Error(`expected one persisted entry, got ${entries.length}`);
if (entries[0].data.skills.join(",") !== "adaptive-workflow,reviewable-delivery") {
  throw new Error(JSON.stringify(entries));
}
if (!statuses.at(-1)?.[1].startsWith("🐂🐎 2 skills")) throw new Error("status icon/count missing");

const transformed = await handlers.get("input")({ source: "interactive", text: "调试 webhook 偶发失败" }, ctx);
if (transformed?.action !== "transform" || transformed.text !== "/skill:debugging-with-evidence webhook 偶发失败") {
  throw new Error(`debug prefix was not transformed: ${JSON.stringify(transformed)}`);
}
await handlers.get("before_agent_start")({
  prompt: "<skill name=\"debugging-with-evidence\" location=\"/tmp/debugging-with-evidence/SKILL.md\">\nbody\n</skill>",
  systemPrompt: "base",
  systemPromptOptions: { skills },
}, ctx);
await handlers.get("tool_call")({
  toolName: "read",
  input: { path: `${process.cwd()}/skills/debugging-with-evidence/SKILL.md` },
}, ctx);
await handlers.get("agent_settled")({}, ctx);
if (entries.length !== 2) throw new Error(`expected two persisted entries, got ${entries.length}`);
if (entries[1].data.skills.join(",") !== "adaptive-workflow,debugging-with-evidence") {
  throw new Error(JSON.stringify(entries[1]));
}
if (!statuses.at(-1)?.[1].startsWith("🐂🐎 3 skills")) throw new Error("debug skill was not counted");

await commands.get("fast").handler("change timeout", ctx);
if (sent[0] !== "快修 change timeout") throw new Error(`unexpected command message: ${sent[0]}`);
const debugAlias = await handlers.get("input")({ source: "interactive", text: "/debug investigate logs" }, ctx);
if (debugAlias?.action !== "transform" || debugAlias.text !== "/skill:debugging-with-evidence investigate logs") {
  throw new Error(`debug alias was not transformed: ${JSON.stringify(debugAlias)}`);
}
console.log("extension smoke passed");
