const BASE = "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const body = text ? JSON.parse(text) : null;
      if (body?.error?.message) message = body.error.message;
    } catch (e) {
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

export const api = {
  health: () => request("/api/health"),
  healthDetailed: () => request("/api/health/detailed"),
  listCombos: () => request("/api/combos"),
  getCombo: (id) => request(`/api/combos/${encodeURIComponent(id)}`),
  saveCombo: (combo) => request("/api/combos", { method: "POST", body: JSON.stringify(combo) }),
  updateCombo: (id, combo) =>
    request(`/api/combos/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(combo) }),
  deleteCombo: (id) => request(`/api/combos/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listProviders: () => request("/api/providers"),
  createProvider: (provider) =>
    request("/api/providers", { method: "POST", body: JSON.stringify(provider) }),
  updateProvider: (id, provider) =>
    request(`/api/providers/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(provider) }),
  deleteProvider: (id) => request(`/api/providers/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getProviderCredential: (id) => request(`/api/providers/${encodeURIComponent(id)}/credentials`),
  setProviderCredential: (id, { apiKey, accountLabel }) =>
    request(`/api/providers/${encodeURIComponent(id)}/credentials`, {
      method: "PUT",
      body: JSON.stringify({ apiKey, accountLabel }),
    }),
  deleteProviderCredential: (id) =>
    request(`/api/providers/${encodeURIComponent(id)}/credentials`, { method: "DELETE" }),

  listModels: () => request("/api/models"),

  listUsage: ({ comboId, provider, limit = 50 } = {}) => {
    const p = new URLSearchParams();
    if (comboId) p.set("comboId", comboId);
    if (provider) p.set("provider", provider);
    p.set("limit", String(limit));
    return request(`/api/usage?${p}`);
  },
  testCombo: (comboId, message) =>
    request("/api/test", { method: "POST", body: JSON.stringify({ comboId, message }) }),
  getSavings: () => request("/api/savings"),

  connectLogs: () => new EventSource("/api/logs/stream"),
  getTokenSaver: () => request("/api/token-saver"),
  saveTokenSaver: (cfg) =>
    request("/api/token-saver", { method: "PUT", body: JSON.stringify(cfg) }),
  translate: (messages, system, targetFormat) =>
    request("/api/translate", {
      method: "POST",
      body: JSON.stringify({ messages, system, targetFormat }),
    }),
  getProxyPool: () => request("/api/proxy-pool"),
  saveProxyPool: (cfg) =>
    request("/api/proxy-pool", { method: "PUT", body: JSON.stringify(cfg) }),
  getTunnel: () => request("/api/tunnel"),
  tunnelAction: (action, body = {}) =>
    request("/api/tunnel", { method: "POST", body: JSON.stringify({ action, ...body }) }),
  getBudget: () => request("/api/budget"),
  saveBudget: (cfg) => request("/api/budget", { method: "PUT", body: JSON.stringify(cfg) }),
};

export const PROVIDER_META = {
  ollama: { label: "Ollama", tier: "local", color: "#6ee7b7", url: "https://ollama.com/" },
  kiro: { label: "Kiro AI", tier: "free", color: "#22c55e", url: "https://kairo.dev/" },
  "opencode-free": { label: "OpenCode Free", tier: "free", color: "#22c55e", url: "https://opencode.ai/" },
  "vertex-ai": { label: "Vertex AI", tier: "free", color: "#22c55e", url: "https://cloud.google.com/vertex-ai" },
  gemini: { label: "Gemini", tier: "free", color: "#22c55e", url: "https://aistudio.google.com/apikey" },
  cerebras: { label: "Cerebras", tier: "free", color: "#22c55e", url: "https://cloud.cerebras.ai/" },
  mistral: { label: "Mistral", tier: "free", color: "#22c55e", url: "https://console.mistral.ai/api-keys/" },
  "nvidia-nim": { label: "NVIDIA NIM", tier: "free", color: "#22c55e", url: "https://build.nvidia.com/" },
  "cloudflare-workers-ai": { label: "Cloudflare", tier: "free", color: "#22c55e", url: "https://dash.cloudflare.com/" },
  "huggingface-inference": { label: "HuggingFace", tier: "free", color: "#22c55e", url: "https://huggingface.co/settings/tokens" },
  "github-models": { label: "GitHub Models", tier: "free", color: "#22c55e", url: "https://github.com/settings/tokens" },
  siliconflow: { label: "SiliconFlow", tier: "free", color: "#22c55e", url: "https://cloud.siliconflow.cn/" },
  chutes: { label: "Chutes", tier: "free", color: "#22c55e", url: "https://chutes.ai/" },
  anthropic: { label: "Claude", tier: "paid", color: "#ef4444", url: "https://console.anthropic.com/settings/keys" },
  openai: { label: "OpenAI", tier: "paid", color: "#ef4444", url: "https://platform.openai.com/api-keys" },
  openrouter: { label: "OpenRouter", tier: "freemium", color: "#3b82f6", url: "https://openrouter.ai/keys" },
  groq: { label: "Groq", tier: "freemium", color: "#3b82f6", url: "https://console.groq.com/keys" },
  deepseek: { label: "DeepSeek", tier: "paid", color: "#ef4444", url: "https://platform.deepseek.com/api_keys" },
  xai: { label: "xAI", tier: "paid", color: "#ef4444", url: "https://console.x.ai/" },
  perplexity: { label: "Perplexity", tier: "paid", color: "#ef4444", url: "https://www.perplexity.ai/settings/api" },
  together: { label: "Together AI", tier: "paid", color: "#ef4444", url: "https://api.together.xyz/settings/api-keys" },
  fireworks: { label: "Fireworks", tier: "paid", color: "#ef4444", url: "https://fireworks.ai/api-keys" },
  nebius: { label: "Nebius", tier: "paid", color: "#ef4444", url: "https://studio.nebius.ai/" },
  hyperbolic: { label: "Hyperbolic", tier: "paid", color: "#ef4444", url: "https://app.hyperbolic.xyz/settings" },
  cohere: { label: "Cohere", tier: "paid", color: "#ef4444", url: "https://dashboard.cohere.com/" },
  "claude-code": { label: "Claude Code", tier: "paid", color: "#ef4444", url: "https://console.anthropic.com/settings/keys" },
  codex: { label: "Codex", tier: "paid", color: "#ef4444", url: "https://openai.com/codex/" },
  "github-copilot": { label: "GitHub Copilot", tier: "paid", color: "#ef4444", url: "https://github.com/features/copilot" },
  cursor: { label: "Cursor", tier: "paid", color: "#ef4444", url: "https://cursor.com/" },
  antigravity: { label: "Antigravity", tier: "paid", color: "#ef4444", url: "https://antigravity.ai/" },
  kimchi: { label: "Kimchi", tier: "paid", color: "#ef4444", url: "https://kimchigit.com/" },
  "custom-openai-compatible": { label: "Custom OpenAI", tier: "paid", color: "#a78bfa", url: "" },
  "custom-anthropic-compatible": { label: "Custom Anthropic", tier: "paid", color: "#a78bfa", url: "" },
};

export function providerMeta(id) {
  return PROVIDER_META[id] ?? { label: id, tier: "paid", color: "#98989e" };
}

export function tierColor(tier) {
  switch (tier) {
    case "free":
    case "local":
      return "text-orun-success";
    case "freemium":
      return "text-orun-info";
    default:
      return "text-orun-warning";
  }
}
