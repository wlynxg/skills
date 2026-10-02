const SETTING_KEY = "fastMode";
const STATUS_KEY = "fast-mode";
const STATUS_LABEL = "⚡ Fast";
const TIER_FIELD = "service_tier";
const PRIORITY_TIER = "priority";
const AZURE_API = "azure-openai-responses";
const GOOGLE_API = "google-generative-ai";
// 支持 service_tier 的 OpenAI 系聊天协议（xAI/Gemini 兼容端点也走这些协议）。
const OPENAI_CHAT_APIS = new Set([
  "openai-responses",
  "openai-codex-responses",
  "openai-completions",
  AZURE_API,
]);
const FAST_APIS = new Set([...OPENAI_CHAT_APIS, GOOGLE_API]);
// 有官方 Fast/Priority 能力的模型家族；排除图像、语音等非文本推理变体。
const FAST_FAMILIES = /^(gpt-|gemini-|grok-)/i;
const NON_TEXT_VARIANTS = /image|imagen|tts|live|audio|veo|embedding|omni|robotics|computer-use|transcribe/i;

function isFastModel(id, api) {
  if (!FAST_APIS.has(api) || typeof id !== "string") return false;
  const name = id.split("/").at(-1);
  if (!FAST_FAMILIES.test(name) || NON_TEXT_VARIANTS.test(name)) return false;
  // Azure 只服务 OpenAI 模型，其他家族在 Azure 部署上没有 service_tier 语义。
  if (api === AZURE_API && !/^gpt-/i.test(name)) return false;
  return true;
}

export default function fastMode(pi) {
  if (typeof pi.getSettings !== "function") {
    throw new Error("Fast 模式需要支持 pi.getSettings() 的 Pi，当前实现验证于 Pi 1.0.0。");
  }

  function clearStatus(ctx) {
    if (ctx.hasUI) ctx.ui.setStatus(STATUS_KEY, undefined);
  }

  function isEnabled(ctx) {
    // 复用 Pi 的合并配置与项目信任，不另建配置读取或持久化机制。
    const configured = pi.getSettings()[SETTING_KEY];
    if (configured !== undefined && typeof configured !== "boolean") {
      clearStatus(ctx);
      throw new TypeError(`${SETTING_KEY} 必须是布尔值 true 或 false。`);
    }
    return configured ?? true;
  }

  function refreshStatus(_event, ctx) {
    const enabled = isEnabled(ctx);
    if (ctx.hasUI) {
      const active = enabled && isFastModel(ctx.model?.id, ctx.model?.api);
      ctx.ui.setStatus(STATUS_KEY, active ? STATUS_LABEL : undefined);
    }
  }

  pi.on("session_start", refreshStatus);
  pi.on("model_select", refreshStatus);
  pi.on("before_agent_start", refreshStatus);
  pi.on("session_shutdown", (_event, ctx) => clearStatus(ctx));

  pi.on("before_provider_request", (event, ctx) => {
    if (!isEnabled(ctx)) return;
    const payload = event.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
    const api = ctx.model?.api;
    // Azure 载荷中的 model 是部署名，模型身份以当前目录项为准。
    const modelId = api === AZURE_API ? ctx.model?.id : payload.model;
    if (!isFastModel(modelId, api)) return;

    // Fast 是请求默认值：保留显式服务等级，不改变模型、思考强度或原始载荷。
    if (api === GOOGLE_API) {
      const config = payload.config;
      if (!config || typeof config !== "object" || Array.isArray(config)) return;
      if (config.serviceTier !== undefined) return;
      return { ...payload, config: { ...config, serviceTier: PRIORITY_TIER } };
    }
    if (payload[TIER_FIELD] !== undefined) return;
    return { ...payload, [TIER_FIELD]: PRIORITY_TIER };
  });
}
