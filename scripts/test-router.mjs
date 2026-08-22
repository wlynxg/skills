#!/usr/bin/env node
import extension from "../extensions/model-router.js";

const handlers = new Map();
const commands = new Map();
const modelChanges = [];
const thinkingChanges = [];
let currentModel = {
  provider: "gpt-eco",
  id: "gpt-5.6-terra",
  reasoning: true,
};
let currentThinking = "medium";
let judgeCalls = 0;
let judgeResult = JSON.stringify({
  tier: "fast",
  confidence: 0.98,
  reason: "explicitly small local change",
});

const models = [
  { provider: "gpt-eco", id: "gpt-5.4-mini", reasoning: true },
  { provider: "gpt-eco", id: "gpt-5.5", reasoning: true },
  { provider: "gpt-eco", id: "gpt-5.6-terra", reasoning: true },
];

const pi = {
  on(name, handler) {
    handlers.set(name, handler);
  },
  registerCommand(name, options) {
    commands.set(name, options);
  },
  async setModel(model) {
    currentModel = model;
    modelChanges.push(`${model.provider}/${model.id}`);
    return true;
  },
  setThinkingLevel(level) {
    currentThinking = level;
    thinkingChanges.push(level);
  },
};

extension(pi);

const ctx = {
  get model() {
    return currentModel;
  },
  get thinkingLevel() {
    return currentThinking;
  },
  ui: { setStatus() {}, notify() {} },
  modelRegistry: {
    getAvailable() {
      return models;
    },
    find(provider, id) {
      return models.find(model => model.provider === provider && model.id === id);
    },
    async complete() {
      judgeCalls += 1;
      if (judgeResult instanceof Error) throw judgeResult;
      return { stopReason: "stop", content: [{ type: "text", text: judgeResult }] };
    },
  },
};

async function run(prompt, systemPrompt = "<!-- personal-pi-mode:auto -->") {
  return handlers.get("before_agent_start")({ prompt, systemPrompt }, ctx);
}

const first = await run("简单地修改 src/foo.ts，直接实现，不要重构");
if (judgeCalls !== 1) throw new Error(`automatic router did not call judge once: ${judgeCalls}`);
if (currentModel.id !== "gpt-5.4-mini" || currentThinking !== "low") {
  throw new Error(`fast route not applied: ${currentModel.id}/${currentThinking}`);
}
if (!first.systemPrompt.includes("FAST MODE ACTIVE")) throw new Error("fast policy missing");
await handlers.get("agent_settled")({}, ctx);
if (currentModel.id !== "gpt-5.6-terra" || currentThinking !== "medium") {
  throw new Error(`original route not restored: ${currentModel.id}/${currentThinking}`);
}

await commands.get("route").handler("deep", ctx);
const manual = await run("实现已确认的功能");
if (judgeCalls !== 1) throw new Error("manual route unexpectedly called judge");
if (currentModel.id !== "gpt-5.6-terra" || currentThinking !== "high") {
  throw new Error(`manual deep route not applied: ${currentModel.id}/${currentThinking}`);
}
if (!manual.systemPrompt.includes("DEEP MODE ACTIVE")) throw new Error("deep policy missing");
await handlers.get("agent_settled")({}, ctx);

judgeResult = new Error("judge unavailable");
const fallback = await run("简单修改一个局部配置，直接完成");
if (!fallback.systemPrompt.includes("FAST MODE ACTIVE")) throw new Error("heuristic fallback did not choose fast");
await handlers.get("agent_settled")({}, ctx);

await commands.get("router").handler("off", ctx);
judgeResult = JSON.stringify({ tier: "deep", confidence: 1, reason: "should not be used" });
await run("普通局部修改");
if (judgeCalls !== 2) throw new Error(`router off still called judge: ${judgeCalls}`);
await handlers.get("agent_settled")({}, ctx);

console.log("router smoke passed");
console.log(`judgeCalls=${judgeCalls}; modelChanges=${modelChanges.join(" -> ")}; thinkingChanges=${thinkingChanges.join(" -> ")}`);
