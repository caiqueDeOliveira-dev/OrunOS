import { describe, it, expect } from "vitest";
import {
  AccountRotator,
  ModelRouter,
  InMemoryComboStore,
  InMemoryProviderConfigStore,
  InMemorySecretStore,
  InMemoryUsageLogStore,
  InMemorySkillStore,
} from "@orun/ai-router-core";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeConfigStore(accounts) {
  const store = new InMemoryProviderConfigStore();
  for (const acc of accounts) store.saveConfig(acc);
  return store;
}

describe("AccountRotator — exaustão por conta (cooldown de quota)", () => {
  it("markExhausted pausa só a conta marcada e expira após o cooldown", () => {
    const rotator = new AccountRotator();
    expect(rotator.isExhausted("groq", "acctA")).toBe(false);
    rotator.markExhausted("groq", "acctA", { cooldownMs: 60_000 });
    expect(rotator.isExhausted("groq", "acctA")).toBe(true);
    expect(rotator.isExhausted("groq", "acctB")).toBe(false);
    expect(rotator.isExhausted("groq", "default")).toBe(false);
    rotator.clearExhausted("groq", "acctA");
    expect(rotator.isExhausted("groq", "acctA")).toBe(false);
  });

  it("expira sozinha depois do cooldown", async () => {
    const rotator = new AccountRotator(undefined, { cooldownMs: 5 });
    rotator.markExhausted("openai", "acctZ");
    expect(rotator.isExhausted("openai", "acctZ")).toBe(true);
    await sleep(20);
    expect(rotator.isExhausted("openai", "acctZ")).toBe(false);
  });

  it("pickAccount priority ignora contas exaustas e escolhe a ativa de maior prioridade", async () => {
    const rotator = new AccountRotator();
    rotator.markExhausted("groq", "acctC", { cooldownMs: 60_000 });
    const accounts = [
      { accountLabel: "acctC", enabled: true, priority: 0 },
      { accountLabel: "acctB", enabled: true, priority: 5 },
      { accountLabel: "acctA", enabled: true, priority: 1 },
    ];
    const picked = await rotator.pickAccount("groq", accounts, "priority");
    expect(picked.accountLabel).toBe("acctA");
  });

  it("pickAccount round-robin pula contas exaustas na rotação", async () => {
    const rotator = new AccountRotator();
    rotator.markExhausted("groq", "acctB", { cooldownMs: 60_000 });
    const accounts = [
      { accountLabel: "acctA", enabled: true },
      { accountLabel: "acctB", enabled: true },
      { accountLabel: "acctC", enabled: true },
    ];
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
      seen.add((await rotator.pickAccount("groq", accounts, "round-robin")).accountLabel);
    }
    expect(seen.has("acctB")).toBe(false);
    expect(seen.has("acctA")).toBe(true);
    expect(seen.has("acctC")).toBe(true);
  });

  it("pickAccount retorna null quando todas as contas do provider estão exaustas", async () => {
    const rotator = new AccountRotator();
    rotator.markExhausted("groq", "acctA", { cooldownMs: 60_000 });
    rotator.markExhausted("groq", "acctB", { cooldownMs: 60_000 });
    const picked = await rotator.pickAccount("groq", [
      { accountLabel: "acctA", enabled: true },
      { accountLabel: "acctB", enabled: true },
    ], "priority");
    expect(picked).toBeNull();
  });

  it("listExhausted expõe as contas em cooldown para o dashboard", async () => {
    const rotator = new AccountRotator();
    rotator.markExhausted("groq", "acctA", { cooldownMs: 60_000 });
    const list = rotator.listExhausted();
    expect(list).toEqual([
      { providerId: "groq", accountLabel: "acctA", until: expect.any(Number) },
    ]);
  });
});

describe("ModelRouter — cascata de combo respeita exaustão por conta", () => {
  function makeRouter(accounts) {
    const router = new ModelRouter(
      new InMemoryComboStore(),
      makeConfigStore(accounts),
      new InMemorySecretStore(),
      new InMemorySkillStore(),
      new InMemoryUsageLogStore(),
    );
    return router;
  }

  const combo = { id: "combo-test", kind: "text", steps: [], rtkEnabled: false, cacheEnabled: false };

  it("step com accountLabel de conta exausta é pulado antes da chamada", async () => {
    const router = makeRouter([{ providerId: "groq", accountLabel: "acctA", enabled: true }]);
    router.accountRotator.markExhausted("groq", "acctA", { cooldownMs: 60_000 });
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
    expect(attempts[0].error).toBe("conta exausta (cooldown de quota)");
  });

  it("todas as contas do provider exaustas ⇒ step falha com mensagem clara", async () => {
    const router = makeRouter([
      { providerId: "groq", accountLabel: "acctA", enabled: true, priority: 0 },
      { providerId: "groq", accountLabel: "acctB", enabled: true, priority: 1 },
    ]);
    router.accountRotator.markExhausted("groq", "acctA", { cooldownMs: 60_000 });
    router.accountRotator.markExhausted("groq", "acctB", { cooldownMs: 60_000 });
    const attempts = [];
    const result = await router.tryStep(
      combo,
      { providerId: "groq", model: "llama-3.3-70b-versatile" },
      0,
      [],
      {},
      attempts,
    );
    expect(result).toBeNull();
    expect(attempts[0].error).toBe("todas as contas exaustas (cooldown de quota)");
  });

  it("com uma conta exausta e outra disponível, a cascata segue para a ativa", async () => {
    const router = makeRouter([
      { providerId: "groq", accountLabel: "acctA", enabled: true, priority: 0 },
      { providerId: "groq", accountLabel: "acctB", enabled: true, priority: 1 },
    ]);
    // acctA (maior prioridade) exausta; acctB segue disponível mas sem credencial
    router.accountRotator.markExhausted("groq", "acctA", { cooldownMs: 60_000 });
    const attempts = [];
    const result = await router.tryStep(
      combo,
      { providerId: "groq", model: "llama-3.3-70b-versatile" },
      0,
      [],
      {},
      attempts,
    );
    // passou da filtragem de exaustão e tentou a conta B (falhou só por falta de credencial)
    expect(result).toBeNull();
    expect(attempts[0].error).toBe("sem credencial configurada");
    expect(router.accountRotator.isExhausted("groq", "acctA")).toBe(true);
    expect(router.accountRotator.isExhausted("groq", "acctB")).toBe(false);
  });
});