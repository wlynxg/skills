import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONFIG_PATH = join(PACKAGE_ROOT, "config", "model-router.json");
const USER_CONFIG_PATH = process.env.PI_MODEL_ROUTER_CONFIG || join(
  process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"),
  "model-router.json",
);
const VALID_TIERS = new Set(["fast", "normal", "deep", "debug", "clarify", "design", "review"]);
const MANUAL_PREFIXES = [
  ["深度设计", "deep"],
  ["只做方案", "design"],
  ["调试", "debug"],
  ["审查", "review"],
  ["澄清", "clarify"],
  ["快修", "fast"],
  ["普通", "normal"],
];
const JUDGE_SYSTEM_PROMPT = `你是 coding agent 的任务路由器，不负责实现任务。
只返回一个 JSON 对象，不要 Markdown、解释或代码块：
{"tier":"fast|normal|deep|debug|clarify|design|review","confidence":0.0,"reason":"一句话"}

分级规则：
- fast：需求明确、局部、可逆，通常只改 1-2 个文件；用户说“简单”“直接做”“只改某模块”是强烈 fast 信号。CLI 增加局部参数或统计，即使包含请求并发，也不自动视为系统级并发风险。
- normal：涉及几个文件或有有限歧义，但没有高影响边界。
- deep：新子系统、公共 API、认证/权限、金额、迁移、数据一致性、基础设施并发、删除/不可逆操作，或明显超过 30 分钟。
- debug：日志、堆栈、崩溃、测试失败、偶发异常，尤其是“上次修复仍然复现”。
- clarify/design/review：用户明确要求只澄清、只做方案或审查。

优先遵守用户明确的范围和速度要求；不要因为“代码任务”本身自动升级。`;

const DEFAULT_CONFIG = {
  enabled: true,
  alwaysJudge: true,
  judge: { provider: "gpt-eco", model: "gpt-5.6-terra", thinking: "low", timeoutMs: 20000 },
  routes: {},
};

function readJson(path) {
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mergeConfig(base, override) {
  return {
    ...base,
    ...override,
    judge: { ...base.judge, ...(override.judge || {}) },
    routes: { ...base.routes, ...(override.routes || {}) },
  };
}

function loadConfig() {
  return mergeConfig(
    mergeConfig(DEFAULT_CONFIG, readJson(DEFAULT_CONFIG_PATH)),
    readJson(USER_CONFIG_PATH),
  );
}

function validTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  return VALID_TIERS.has(tier) ? tier : undefined;
}

function extractText(content) {
  if (!Array.isArray(content)) return String(content || "");
  return content.filter(block => block?.type === "text").map(block => block.text || "").join("\n");
}

function parseDecision(text) {
  const raw = String(text || "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const value = JSON.parse(raw.slice(start, end + 1));
    const tier = validTier(value.tier || value.route);
    if (!tier) return undefined;
    const confidence = Number(value.confidence);
    return {
      tier,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
      reason: String(value.reason || ""),
    };
  } catch {
    return undefined;
  }
}

function explicitTier(prompt, systemPrompt, pendingTier) {
  if (pendingTier) return { tier: pendingTier, source: "manual" };
  const combined = `${String(prompt || "").trim()}\n${String(systemPrompt || "")}`;
  const marker = combined.match(/personal-pi-mode:([a-z-]+)/i);
  const marked = validTier(marker?.[1]);
  if (marked) return { tier: marked, source: "workflow-override" };
  if (combined.includes('<skill name="debugging-with-evidence"')) return { tier: "debug", source: "skill" };
  for (const [prefix, tier] of MANUAL_PREFIXES) {
    if (String(prompt || "").trim() === prefix || String(prompt || "").trim().startsWith(`${prefix} `)) {
      return { tier, source: "explicit-prefix" };
    }
  }
  const slash = String(prompt || "").trim().match(/^\/(fast|normal|deep|debug|clarify|design|review)(?:\s|$)/i);
  if (slash) return { tier: slash[1].toLowerCase(), source: "explicit-slash" };
  return undefined;
}

function heuristicTier(prompt) {
  const text = String(prompt || "");
  if (/日志|堆栈|崩溃|报错|异常|失败|bug|debug|仍然复现|复现/i.test(text)) return "debug";
  if (/认证|权限|支付|金额|迁移|数据库删除|并发控制|公共 API|新子系统|架构|不可逆/i.test(text)) return "deep";
  if (/简单|直接|只改|局部|一两个文件|小改|不要重构|quick|simple/i.test(text)) return "fast";
  return "normal";
}

function sameModel(left, right) {
  return Boolean(left && right && left.provider === right.provider && left.id === right.id);
}

function resolveAvailableModel(ctx, target) {
  if (!target?.provider || !target?.model) return undefined;
  const available = ctx.modelRegistry?.getAvailable?.() || [];
  return available.find(model => model.provider === target.provider && model.id === target.model)
    || ctx.modelRegistry?.find?.(target.provider, target.model);
}

function routePolicy(tier) {
  switch (tier) {
    case "fast":
      return "FAST MODE ACTIVE：把用户的简单/直接/只改某模块要求视为硬范围。只修改必要文件，不做架构重构或无关抽象；最多做一个聚焦验证，首次验证通过后停止。只有发现真实隐藏复杂度时才暂停并升级。";
    case "normal":
      return "NORMAL MODE ACTIVE：先给出简短实现契约，只处理会改变方向的歧义；保持改动局部，运行与风险匹配的验证，不自动生成完整计划。";
    case "deep":
      return "DEEP MODE ACTIVE：先澄清边界和不变量，建立 review packet 和可独立验证的垂直切片；在公共 API、权限、迁移、并发或不可逆边界暂停确认。";
    case "debug":
      return "DEBUG MODE ACTIVE：先保存证据并建立原始复现，区分 observed/inferred/unknown；修复后必须重新运行同一原始场景，未通过只能报告 blocked/not-reproduced/unverified。";
    case "clarify":
      return "CLARIFY MODE ACTIVE：只询问高影响问题并输出短设计契约，不实现代码。";
    case "design":
      return "DESIGN MODE ACTIVE：只输出方案或 review packet，不修改生产代码。";
    case "review":
      return "REVIEW MODE ACTIVE：优先报告真实风险、回归和验证缺口，结论绑定 diff 或命令证据。";
    default:
      return "";
  }
}

function routeLabel(tier, model, source) {
  return `route:${tier}${source === "automatic" ? "(auto)" : ""} ${model?.id || "current"}`;
}

export default function modelRouterExtension(pi) {
  const config = loadConfig();
  let sessionEnabled = config.enabled !== false;
  let nextManualTier;
  let activeRoute;
  let lastDecision;

  function notify(ctx, message, type = "info") {
    if (ctx?.ui?.notify) ctx.ui.notify(message, type);
  }

  function setRouteStatus(ctx, tier, model, source) {
    ctx?.ui?.setStatus?.("model-router", routeLabel(tier, model, source));
  }

  async function judge(ctx, prompt) {
    const judgeModel = resolveAvailableModel(ctx, config.judge);
    if (!judgeModel || !ctx.modelRegistry?.complete) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(config.judge.timeoutMs) || 20000);
    const signal = ctx.signal ? AbortSignal.any([ctx.signal, controller.signal]) : controller.signal;
    try {
      const response = await ctx.modelRegistry.complete(judgeModel, {
        systemPrompt: JUDGE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: String(prompt || ""), timestamp: Date.now() }],
      }, {
        signal,
        reasoning: config.judge.thinking || "low",
        maxTokens: 220,
        temperature: 0,
        cacheRetention: "none",
        sessionId: `personal-router-${Date.now()}`,
      });
      if (response?.stopReason === "error" || response?.stopReason === "aborted") return undefined;
      return parseDecision(extractText(response?.content));
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function applyRoute(ctx, tier, source, decision) {
    const route = config.routes?.[tier] || {};
    const originalModel = ctx.model;
    const originalThinking = ctx.thinkingLevel || "medium";
    const targetModel = resolveAvailableModel(ctx, route) || originalModel;
    const targetThinking = route.thinking || originalThinking;
    activeRoute = { originalModel, originalThinking, targetModel, tier };

    try {
      if (targetModel && !sameModel(targetModel, originalModel)) {
        const changed = await pi.setModel(targetModel);
        if (!changed) activeRoute.targetModel = originalModel;
      }
      pi.setThinkingLevel(targetThinking);
    } catch {
      activeRoute.targetModel = originalModel;
      try { pi.setThinkingLevel(originalThinking); } catch { /* fallback only */ }
    }

    const effectiveModel = activeRoute.targetModel || originalModel;
    setRouteStatus(ctx, tier, effectiveModel, source);
    lastDecision = { tier, source, decision, model: effectiveModel?.id, thinking: targetThinking };
    return effectiveModel;
  }

  async function restoreRoute(ctx) {
    const route = activeRoute;
    if (!route) return;
    activeRoute = undefined;
    try {
      if (route.originalModel && !sameModel(ctx.model, route.originalModel)) await pi.setModel(route.originalModel);
      pi.setThinkingLevel(route.originalThinking);
    } catch {
      // A session may be shutting down; route restoration is best effort.
    }
    ctx?.ui?.setStatus?.("model-router", undefined);
  }

  pi.registerCommand("route", {
    description: "Choose the next model route: auto, fast, normal, deep, debug",
    handler: async (args, ctx) => {
      const value = String(args || "").trim().toLowerCase();
      if (!value || value === "status") {
        notify(ctx, `Router: ${sessionEnabled ? "on" : "off"}; next=${nextManualTier || "auto"}; last=${lastDecision?.tier || "-"}`);
        return;
      }
      if (value === "auto") {
        nextManualTier = undefined;
        notify(ctx, "下一条请求恢复自动模型调度");
        return;
      }
      const tier = validTier(value);
      if (!tier) {
        notify(ctx, "用法：/route auto|fast|normal|deep|debug|clarify|design|review", "warning");
        return;
      }
      nextManualTier = tier;
      notify(ctx, `下一条请求使用 ${tier} 路由`);
    },
  });

  pi.registerCommand("router", {
    description: "Control automatic model routing: on, off, status",
    handler: async (args, ctx) => {
      const value = String(args || "").trim().toLowerCase();
      if (value === "on") sessionEnabled = true;
      else if (value === "off") sessionEnabled = false;
      else {
        notify(ctx, `Router: ${sessionEnabled ? "on" : "off"}; judge=${config.judge.provider}/${config.judge.model}`);
        return;
      }
      notify(ctx, `自动模型调度已${sessionEnabled ? "开启" : "关闭"}`);
    },
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (activeRoute) await restoreRoute(ctx);
    const explicit = explicitTier(event.prompt, event.systemPrompt, nextManualTier);
    nextManualTier = undefined;
    let tier = explicit?.tier;
    let source = explicit?.source;
    let decision;

    if (!tier && sessionEnabled && config.alwaysJudge !== false) {
      decision = await judge(ctx, event.prompt);
      tier = decision?.tier;
      source = "automatic";
    }
    if (!tier) {
      tier = heuristicTier(event.prompt);
      source = source || "fallback";
    }

    const model = await applyRoute(ctx, tier, source, decision);
    const routeText = `<!-- personal-pi-route:${tier} -->\n## Personal model route\n${routePolicy(tier)}\n当前路由来源：${source}；执行模型：${model?.provider || "current"}/${model?.id || "current"}。`;
    return { systemPrompt: `${event.systemPrompt}\n\n${routeText}` };
  });

  pi.on("agent_settled", async (_event, ctx) => {
    await restoreRoute(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    await restoreRoute(ctx);
  });
}
