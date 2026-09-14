import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import {
  ModelRouter,
  InMemoryComboStore,
  InMemoryProviderConfigStore,
  InMemorySecretStore,
  InMemoryUsageLogStore,
  InMemorySkillStore,
} from "@orun/ai-router-core";

async function makeRouter(status, bodyText) {
  let hits = 0;
  const server = http.createServer((req, res) => {
    hits += 1;
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: { message: bodyText } }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const cfgStore = new InMemoryProviderConfigStore();
  cfgStore.saveConfig({
    providerId: "groq",
    accountLabel: "default",
    enabled: true,
    customBaseUrl: baseUrl,
  });
  const secretStore = new InMemorySecretStore();
  secretStore.setCredential("groq", { apiKey: "test-key" }, "default");
  const router = new ModelRouter(
    new InMemoryComboStore(),
    cfgStore,
    secretStore,
    new InMemorySkillStore(),
    new InMemoryUsageLogStore(),
  );
  return { router, server, getHits: () => hits };
}

const combo = { id: "combo-ban", kind: "text", steps: [], rtkEnabled: false, cacheEnabled: false };

describe("ModelBan — modelo morto (404 not found) não derruba o provider", () => {
  let ctx;
  afterEach(async () => {
    await new Promise((resolve) => ctx.server.close(resolve));
  });

  it("404 not found ⇒ bane SÓ o modelo; circuit breaker do provider continua fechado", async () => {
    ctx = await makeRouter(404, "model not found");
    const attempts = [];
    const result = await ctx.router.tryStep(
      combo,
      { providerId: "groq", model: "modelo-morto-01", maxRetries: 0 },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    expect(attempts[0].error).toContain("404");
    const banned = ctx.router.getBannedModels();
    expect(banned).toEqual([
      expect.objectContaining({ providerId: "groq", accountLabel: "default", model: "modelo-morto-01" }),
    ]);
    expect(ctx.router.getModelBanStatus("groq", "default", "modelo-morto-01").banned).toBe(true);
    // provider NÃO abriu circuito: outros modelos/contas deste provider seguem
    expect(ctx.router.circuitBreaker.getState("groq", "default")).toBe("closed");
    expect(ctx.router.circuitBreaker.getStates().filter((s) => (s.errors ?? 0) > 0)).toEqual([]);
  });

  it("modelo banido é pulado sem bater na API até o cooldown expirar", async () => {
    ctx = await makeRouter(404, "model not found");
    const step = { providerId: "groq", model: "modelo-morto-01", maxRetries: 0 };
    await ctx.router.tryStep(combo, step, 0, [], {}, []);
    expect(ctx.getHits()).toBe(1);

    const attempts = [];
    const result = await ctx.router.tryStep(combo, step, 0, [], {}, attempts);
    expect(result).toBeNull();
    expect(attempts[0].error).toBe("modelo em cooldown (not found anterior — morto)");
    expect(ctx.getHits()).toBe(1);
  });

  it("outro modelo do MESMO provider segue sendo tentado mesmo com um irmão banido", async () => {
    ctx = await makeRouter(404, "model not found");
    const attempts = [];
    const result = await ctx.router.tryStep(
      combo,
      { providerId: "groq", models: ["modelo-morto-01", "modelo-vivo-02"], maxRetries: 0 },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    // os dois modelos batem no mock (404) — o irmão morto bane mas a cascata
    // segue tentando os demais modelos do PRÓXIMO step não é afetada
    expect(ctx.getHits()).toBe(2);
    expect(attempts[0].error).toContain("404");
    expect(attempts[1].error).toContain("404");
    expect(ctx.router.getBannedModels().map((b) => b.model)).toEqual(["modelo-morto-01", "modelo-vivo-02"]);
  });
});

describe("ModelBan — só not found bane; erros reais seguem o circuit breaker normal", () => {
  let ctx;
  afterEach(async () => {
    await new Promise((resolve) => ctx.server.close(resolve));
  });

  it("500 server error NÃO bane o modelo e conta falha no circuit breaker", async () => {
    ctx = await makeRouter(500, "internal error");
    const attempts = [];
    const result = await ctx.router.tryStep(
      combo,
      { providerId: "groq", model: "modelo-lento", maxRetries: 0 },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    expect(ctx.router.getBannedModels()).toEqual([]);
    const states = ctx.router.circuitBreaker.getStates().filter((s) => s.providerId === "groq:default");
    expect(states).toEqual([expect.objectContaining({ state: "closed", errors: 1 })]);
  });

  it("429 rate limit NÃO bane modelo; rotator pausa a conta (cooldown de quota)", async () => {
    ctx = await makeRouter(429, "rate limited");
    const attempts = [];
    const result = await ctx.router.tryStep(
      combo,
      { providerId: "groq", model: "modelo-quente", maxRetries: 0 },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    expect(ctx.router.getBannedModels().map((b) => b.model)).toEqual([]);
    expect(ctx.router.accountRotator.isExhausted("groq", "default")).toBe(true);
  });
});