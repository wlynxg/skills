import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICON = "🐂🐎";
const ENTRY_TYPE = "personal-pi-skills";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SYNC_SCRIPT = join(PACKAGE_ROOT, "scripts", "sync-skills.mjs");

const MODE_PREFIXES = [
  ["深度设计", "deep"],
  ["只做方案", "design"],
  ["调试", "debug"],
  ["审查", "review"],
  ["澄清", "clarify"],
  ["快修", "fast"],
];
const SLASH_MODES = new Map([
  ["fast", "fast"],
  ["clarify", "clarify"],
  ["deep", "deep"],
  ["design", "design"],
  ["review", "review"],
  ["debug", "debug"],
]);

const MODE_LABELS = {
  auto: "自动分级",
  fast: "快修",
  normal: "普通",
  deep: "深度",
  clarify: "只澄清",
  design: "只做方案",
  review: "审查",
  debug: "证据调试",
};

function normalizedPath(path) {
  return resolve(String(path || ""));
}

function getModeFromPrompt(prompt) {
  const text = String(prompt || "").trim();
  for (const [prefix, mode] of MODE_PREFIXES) {
    if (text === prefix || text.startsWith(`${prefix} `) || text.startsWith(`${prefix}\n`)) return mode;
  }
  if (text.startsWith('<skill name="debugging-with-evidence"')) return "debug";
  const slash = text.match(/^\/(fast|clarify|deep|design|review|debug)(?:\s|$)/);
  return slash ? SLASH_MODES.get(slash[1]) : undefined;
}

function compactNames(names, empty = "-") {
  const list = [...names].sort();
  return list.length > 0 ? list.join(", ") : empty;
}

function buildPolicy(mode) {
  const selected = mode === "auto" ? "自动判断 fast / normal / deep" : MODE_LABELS[mode] || mode;
  const debugPolicy = mode === "debug"
    ? "当前请求是证据调试：先保存和解析日志，建立原始复现，区分 observed/inferred/unknown，追踪到 file:line；原始复现未在修复后重新通过时，只能报告 blocked/not-reproduced/unverified，禁止声称已修复。"
    : "";
  return `## Personal adaptive workflow\n当前请求模式：${selected}。先读受影响的真实流程，再选择覆盖风险的最短流程。明确、局部、低风险的小改动直接完成并做最小验证，不生成 PRD、计划文件或批量测试；有歧义时只问会改变实现方向的问题。新子系统、公共 API、认证/权限、金额、迁移、并发、数据写入或不可逆操作升级为 deep，先做 review packet 和可独立验证的垂直切片。默认不启用严格 TDD，只有高风险、稳定回归问题或用户明确要求时才使用。优先复用仓库已有代码、标准库和原生能力。${debugPolicy}`;
}

function skillNameFromPath(filePath, knownSkills) {
  const normalized = normalizedPath(filePath);
  for (const [name, skill] of knownSkills) {
    if (normalized === normalizedPath(skill.filePath)) return name;
  }
  if (!normalized.endsWith("/SKILL.md")) return undefined;
  const parent = normalized.split("/").at(-2);
  return parent && /^[a-z0-9-]+$/.test(parent) ? parent : undefined;
}

export default function personalPiSkillsExtension(pi) {
  let nextOverride;
  let activeMode = "auto";
  let lastPrompt;
  let currentSkills = new Set();
  let sessionSkills = new Set();
  let knownSkills = new Map();
  let lastCtx;

  function render(ctx = lastCtx) {
    if (!ctx?.ui) return;
    lastCtx = ctx;
    const status = `${ICON} ${sessionSkills.size} skill${sessionSkills.size === 1 ? "" : "s"}`;
    ctx.ui.setStatus("personal-pi-skills", status);
    ctx.ui.setWidget("personal-pi-skills", [
      `本轮: ${compactNames(currentSkills)}`,
      `会话: ${compactNames(sessionSkills)}`,
    ]);
  }

  function markSkill(name, ctx = lastCtx) {
    if (!name) return;
    currentSkills.add(name);
    sessionSkills.add(name);
    render(ctx);
  }

  function restoreSession(ctx) {
    currentSkills = new Set();
    sessionSkills = new Set();
    const entries = ctx?.sessionManager?.getBranch?.() || [];
    for (const entry of entries) {
      if (entry?.type !== "custom" || entry.customType !== ENTRY_TYPE) continue;
      for (const name of entry.data?.skills || []) sessionSkills.add(name);
    }
    render(ctx);
  }

  function beginRequest(ctx) {
    if (ctx?.isIdle?.() === false) return;
    currentSkills = new Set();
    activeMode = "auto";
    lastPrompt = undefined;
    render(ctx);
  }

  function observePrompt(prompt, options, ctx) {
    const skills = options?.skills || [];
    knownSkills = new Map(skills.map(skill => [skill.name, skill]));
    for (const match of String(prompt || "").matchAll(/<skill name="([^"]+)" location="([^"]+)">/g)) {
      if (knownSkills.size === 0 || knownSkills.has(match[1])) markSkill(match[1], ctx);
    }
  }

  function modeCommand(prefix, mode, args, ctx) {
    const request = args.trim();
    if (!request) {
      nextOverride = mode;
      ctx.ui.notify(`下一条请求使用：${MODE_LABELS[mode]}`, "info");
      return;
    }
    beginRequest(ctx);
    pi.sendUserMessage(`${prefix} ${request}`);
  }

  function showSkills(ctx) {
    const available = ctx.getSystemPromptOptions?.()?.skills || [];
    const availableNames = available.map(skill => skill.name).sort();
    const message = [
      `${ICON} 已发现: ${compactNames(availableNames)}`,
      `本轮观测: ${compactNames(currentSkills)}`,
      `会话观测: ${compactNames(sessionSkills)}`,
      "观测到不等于模型一定遵守。",
    ].join("\n");
    ctx.ui.notify(message, "info");
  }

  async function syncUpstream(ctx) {
    markSkill("syncing-upstream", ctx);
    if (!existsSync(SYNC_SCRIPT)) {
      ctx.ui.notify(`同步脚本不存在：${SYNC_SCRIPT}`, "error");
      return;
    }
    ctx.ui.notify("正在分析上游 skill 变化，不会覆盖本地文件...", "info");
    const result = await ctx.exec("node", [SYNC_SCRIPT], { cwd: PACKAGE_ROOT });
    const output = `${result.stdout || ""}${result.stderr ? `\n${result.stderr}` : ""}`.trim();
    const tail = output.length > 1800 ? `...\n${output.slice(-1800)}` : output;
    ctx.ui.notify(result.code === 0 ? `同步分析完成\n${tail}` : `同步分析失败（${result.code}）\n${tail}`, result.code === 0 ? "info" : "error");
  }

  pi.registerCommand("fast", {
    description: "Use fast workflow for the next request or provided task",
    handler: (args, ctx) => modeCommand("快修", "fast", args, ctx),
  });
  pi.registerCommand("clarify", {
    description: "Clarify a request without implementing it",
    handler: (args, ctx) => modeCommand("澄清", "clarify", args, ctx),
  });
  pi.registerCommand("deep", {
    description: "Use deep workflow for the next request or provided task",
    handler: (args, ctx) => modeCommand("深度设计", "deep", args, ctx),
  });
  pi.registerCommand("design", {
    description: "Produce a design or review packet without implementing",
    handler: (args, ctx) => modeCommand("只做方案", "design", args, ctx),
  });
  pi.registerCommand("review", {
    description: "Review current work using risk-first evidence",
    handler: (args, ctx) => modeCommand("审查", "review", args, ctx),
  });
  pi.registerCommand("skills", {
    description: "Show discovered and observed skills",
    handler: (_args, ctx) => showSkills(ctx),
  });
  pi.registerCommand("sync-skills", {
    description: "Analyze Git upstream skill changes without overwriting local skills",
    handler: (_args, ctx) => syncUpstream(ctx),
  });

  pi.on("session_start", async (_event, ctx) => {
    lastCtx = ctx;
    restoreSession(ctx);
  });

  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") return;
    const text = String(event.text || "");
    const pendingMode = nextOverride;
    beginRequest(ctx);
    const skillCommand = text.match(/^\/skill:([a-z0-9-]+)/);
    if (skillCommand) markSkill(skillCommand[1], ctx);
    if (text === "/debug" || text.startsWith("/debug ")) {
      return { action: "transform", text: `/skill:debugging-with-evidence ${text.slice(6).trim()}`.trim() };
    }
    if (text === "调试" || text.startsWith("调试 ")) {
      return { action: "transform", text: `/skill:debugging-with-evidence ${text.slice(2).trim()}`.trim() };
    }
    if (pendingMode === "debug" && text && !text.startsWith("/skill:")) {
      return { action: "transform", text: `/skill:debugging-with-evidence ${text}` };
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    lastCtx = ctx;
    if (lastPrompt !== event.prompt) {
      if (ctx.isIdle?.() !== false && currentSkills.size > 0) currentSkills = new Set();
      lastPrompt = event.prompt;
    }
    const promptMode = getModeFromPrompt(event.prompt);
    activeMode = promptMode || nextOverride || "auto";
    nextOverride = undefined;
    const options = event.systemPromptOptions || {};
    observePrompt(event.prompt, options, ctx);
    markSkill("adaptive-workflow", ctx);
    return { systemPrompt: `${event.systemPrompt}\n\n${buildPolicy(activeMode)}` };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "read") return;
    const name = skillNameFromPath(event.input?.path, knownSkills);
    if (name && (knownSkills.has(name) || name === "adaptive-workflow" || name === "syncing-upstream")) markSkill(name, ctx);
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (currentSkills.size > 0) {
      pi.appendEntry(ENTRY_TYPE, {
        skills: [...currentSkills].sort(),
        mode: activeMode,
        timestamp: Date.now(),
      });
    }
    render(ctx);
  });
}
