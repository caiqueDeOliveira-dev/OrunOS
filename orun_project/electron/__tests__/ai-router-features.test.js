import { describe, it, expect } from "vitest";
import {
  toProviderRequest,
  toOpenAiChunk,
  BRIDGE_FORMATS,
  ModelRouter,
  QuotaTracker,
  InMemoryQuotaHeaderCache,
  InMemoryComboStore,
  InMemoryProviderConfigStore,
  InMemorySecretStore,
  InMemoryUsageLogStore,
  InMemorySkillStore,
} from "@orun/ai-router-core";

describe("format-bridge — toProviderRequest (prio 3)", () => {
  const messages = [
    { role: "system", content: "você é o assistente" },
    { role: "user", content: "olá" },
  ];

  it("detecta formato pelo providerId (anthropic → claude)", () => {
    const { format, body, headers } = toProviderRequest({
      providerId: "anthropic",
      messages,
      model: "claude-sonnet-4",
      maxTokens: 2048,
    });
    expect(format).toBe("claude");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(body.model).toBe("claude-sonnet-4");
    expect(body.max_tokens).toBe(2048);
    expect(body.system).toContain("você é o assistente");
    expect(body.messages).toEqual([{ role: "user", content: "olá" }]);
  });

  it("detecta formato pela baseUrl (generativelanguage → gemini) com generationConfig", () => {
    const { format, body } = toProviderRequest({
      providerId: "custom-openai-compatible",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      messages,
      model: "gemini-2.0-flash",
      maxTokens: 1024,
      temperature: 0.7,
    });
    expect(format).toBe("gemini");
    expect(body.model).toBe("gemini-2.0-flash");
    expect(body.generationConfig).toEqual({ maxOutputTokens: 1024, temperature: 0.7 });
    expect(body.systemInstruction).toEqual({ parts: [{ text: "você é o assistente" }] });
    expect(body.contents[0].role).toBe("user");
  });

  it("openai nativo passa sem headers e com temperature/max_tokens", () => {
    const { format, body, headers } = toProviderRequest({
      format: "openai",
      providerId: "openai",
      messages,
      model: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 512,
    });
    expect(format).toBe("openai");
    expect(headers).toEqual({});
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(512);
  });

  it("BRIDGE_FORMATS lista os formatos suportados", () => {
    expect(BRIDGE_FORMATS).toEqual(["openai", "claude", "gemini", "ollama"]);
  });
});

describe("format-bridge — toOpenAiChunk (prio 3)", () => {
  it("converte chunk Claude content_block_delta", () => {
    const chunk = toOpenAiChunk(
      { type: "content_block_delta", delta: { type: "text_delta", text: "oi" } },
      "claude",
    );
    expect(chunk).toMatchObject({
      object: "chat.completion.chunk",
      choices: [{ delta: { content: "oi" }, index: 0 }],
    });
  });

  it("converte chunk Gemini candidates", () => {
    const chunk = toOpenAiChunk(
      { candidates: [{ content: { parts: [{ text: "resposta" }] } }] },
      "gemini",
    );
    expect(chunk).toMatchObject({
      choices: [{ delta: { content: "resposta" }, index: 0 }],
    });
  });

  it("retorna null para chunks sem texto (ex.: content_block_stop)", () => {
    expect(toOpenAiChunk({ type: "content_block_stop", index: 0 }, "claude")).toBeNull();
  });

  it("passa chunks OpenAI nativos sem re-tradução", () => {
    const raw = { id: "x", choices: [{ delta: { content: "ab" }, index: 0 }] };
    expect(toOpenAiChunk(raw, "openai")).toBe(raw);
  });
});

describe("ModelRouter — quota-aware fallback (prio 5)", () => {
  function makeRouter() {
    const cfgStore = new InMemoryProviderConfigStore();
    cfgStore.saveConfig({ providerId: "groq", accountLabel: "acctA", enabled: true });
    const usageStore = new InMemoryUsageLogStore();
    const quota = new QuotaTracker(usageStore, new InMemoryQuotaHeaderCache());
    const router = new ModelRouter(
      new InMemoryComboStore(),
      cfgStore,
      new InMemorySecretStore(),
      new InMemorySkillStore(),
      usageStore,
      { quotaTracker: quota },
    );
    return { router, quota };
  }

  const combo = { id: "combo-test", kind: "text", steps: [], rtkEnabled: false, cacheEnabled: false };

  it("pula o step quando a quota da conta está em 0 (header real)", async () => {
    const { router, quota } = makeRouter();
    quota.headerCache.set("groq", "acctA", { remaining: 0, limit: 100 });
    const attempts = [];
    const result = await router.tryStep(
      combo,
      { providerId: "groq", model: "llama-3.3-70b-versatile", accountLabel: "acctA" },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    expect(attempts[0].error).toBe("quota esgotada (sem chamada à API)");
  });

  it("segue para a chamada quando ainda há quota", async () => {
    const { router, quota } = makeRouter();
    quota.headerCache.set("groq", "acctA", { remaining: 5, limit: 100 });
    const attempts = [];
    const result = await router.tryStep(
      combo,
      { providerId: "groq", model: "llama-3.3-70b-versatile", accountLabel: "acctA" },
      0,
      [],
      {},
      attempts,
    );
    // passou da checagem de quota e seguiu até a credencial ausente
    expect(result).toBeNull();
    expect(attempts[0].error).toBe("sem credencial configurada");
  });

  it("permite opt-out por step (quotaAware: false) mesmo com quota esgotada", async () => {
    const { router, quota } = makeRouter();
    quota.headerCache.set("groq", "acctA", { remaining: 0, limit: 100 });
    const attempts = [];
    const result = await router.tryStep(
      combo,
      { providerId: "groq", model: "llama-3.3-70b-versatile", accountLabel: "acctA", quotaAware: false },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    expect(attempts[0].error).toBe("sem credencial configurada");
  });
});