import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ICON = "🐂🐎";
const ENTRY_TYPE = "personal-pi-skills";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SYNC_SCRIPT = join(PACKAGE_ROOT, "scripts", "sync-skills.mjs");
const ADAPTIVE_SKILL = "adaptive-workflow";
const SKILL_FILENAME = "SKILL.md";
const ADAPTIVE_SKILL_PATH = join(PACKAGE_ROOT, "skills", ADAPTIVE_SKILL, SKILL_FILENAME);
const DESIGN_ONLY_POLICY = "当前请求只做澄清或方案：允许只读探索与方案记录，不实施业务改动。";
const MODE_POLICIES = {
  clarify: DESIGN_ONLY_POLICY,
  design: DESIGN_ONLY_POLICY,
  review: "当前请求默认只读审查；没有修正授权，不自动实施审查建议。",
  deep: "当前请求使用可审查记录与垂直切片，按已批准范围推进。",
  debug: "当前请求遵循 debugging-with-evidence：区分未复现、未验证与修复后仍失败，不给无证据的修复声明。",
};

const MODE_PREFIXES = [
  ["深度设计", "deep"],
  ["只做方案", "design"],
  ["调试", "debug"],
  ["审查", "review"],
  ["澄清", "clarify"],
  ["快修", "fast"],
  ["普通", "normal"],
];
const SLASH_MODES = new Map([
  ["fast", "fast"],
  ["clarify", "clarify"],
  ["deep", "deep"],
  ["design", "design"],
  ["review", "review"],
  ["debug", "debug"],
  ["normal", "normal"],
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
  const slash = text.match(/^\/(fast|clarify|deep|design|review|debug|normal)(?:\s|$)/);
  return slash ? SLASH_MODES.get(slash[1]) : undefined;
}

function compactNames(names, empty = "-") {
  const list = [...names].sort();
  return list.length > 0 ? list.join(", ") : empty;
}

function formatSkillCounts(counts, empty = "-") {
  const list = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name}*${count}`);
  return list.length > 0 ? list.join(", ") : empty;
}

function totalSkillUses(counts) {
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
}

function addSkillCount(counts, name, amount = 1) {
  if (!name || !Number.isInteger(amount) || amount <= 0) return;
  counts.set(name, (counts.get(name) || 0) + amount);
}

function buildPolicy(mode) {
  const selected = mode === "auto" ? "自动判断 fast / normal / deep" : MODE_LABELS[mode] || mode;
  // 每轮读取同一份正文，避免入口提示与 skill 的确认、兼容和验收规则漂移。
  const guide = readFileSync(ADAPTIVE_SKILL_PATH, "utf8")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .trim();
  return `<!-- personal-pi-mode:${mode} -->\n<skill name="${ADAPTIVE_SKILL}" location="${ADAPTIVE_SKILL_PATH}">\n${guide}\n</skill>\n当前请求模式：${selected}。${MODE_POLICIES[mode] || ""}`;
}

function skillNameFromPath(filePath, knownSkills) {
  const normalized = normalizedPath(filePath);
  for (const [name, skill] of knownSkills) {
    if (normalized === normalizedPath(skill.filePath)) return name;
  }
  if (!normalized.endsWith(`/${SKILL_FILENAME}`)) return undefined;
  const parent = normalized.split("/").at(-2);
  return parent && /^[a-z0-9-]+$/.test(parent) ? parent : undefined;
}

export default function personalPiSkillsExtension(pi) {
  let nextOverride;
  let activeMode = "auto";
  let lastPrompt;
  let currentSkills = new Set();
  let sessionSkillCounts = new Map();
  let knownSkills = new Map();
  let lastCtx;

  function render(ctx = lastCtx) {
    if (!ctx?.ui) return;
    lastCtx = ctx;
    const uniqueSkills = sessionSkillCounts.size;
    const uses = totalSkillUses(sessionSkillCounts);
    const status = `${ICON} ${uniqueSkills} skill${uniqueSkills === 1 ? "" : "s"} / ${uses} use${uses === 1 ? "" : "s"}`;
    ctx.ui.setStatus("personal-pi-skills", status);
    ctx.ui.setWidget("personal-pi-skills", [formatSkillCounts(sessionSkillCounts)]);
  }

  function markSkill(name, ctx = lastCtx) {
    if (!name) return;
    currentSkills.add(name);
    render(ctx);
  }

  function restoreSession(ctx) {
    currentSkills = new Set();
    sessionSkillCounts = new Map();
    const entries = ctx?.sessionManager?.getBranch?.() || [];
    for (const entry of entries) {
      if (entry?.type !== "custom" || entry.customType !== ENTRY_TYPE) continue;
      const counts = entry.data?.counts;
      if (counts && typeof counts === "object" && !Array.isArray(counts)) {
        for (const [name, amount] of Object.entries(counts)) addSkillCount(sessionSkillCounts, name, amount);
      } else {
        for (const name of entry.data?.skills || []) addSkillCount(sessionSkillCounts, name);
      }
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
      `观测: ${formatSkillCounts(sessionSkillCounts)}`,
      `总使用次数: ${totalSkillUses(sessionSkillCounts)}`,
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
  pi.registerCommand("normal", {
    description: "Use normal workflow for the next request or provided task",
    handler: (args, ctx) => modeCommand("普通", "normal", args, ctx),
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
    const policy = buildPolicy(activeMode);
    markSkill(ADAPTIVE_SKILL, ctx);
    return { systemPrompt: `${event.systemPrompt}\n\n${policy}` };
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "read" || event.isError) return;
    const name = skillNameFromPath(event.input?.path, knownSkills);
    if (name && (knownSkills.has(name) || name === ADAPTIVE_SKILL || name === "syncing-upstream")) markSkill(name, ctx);
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (currentSkills.size > 0) {
      const skills = [...currentSkills].sort();
      const counts = Object.fromEntries(skills.map(name => [name, 1]));
      for (const name of skills) addSkillCount(sessionSkillCounts, name);
      pi.appendEntry(ENTRY_TYPE, {
        skills,
        counts,
        mode: activeMode,
        timestamp: Date.now(),
      });
    }
    render(ctx);
  });
}
