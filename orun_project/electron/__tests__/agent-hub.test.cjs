// electron/__tests__/agent-hub.test.cjs
// Testes do Agent Hub (Módulo 5 — delegação serial + schema único de agente).

const { createAgentHub } = require("../agent-hub.cjs");

const REGISTRY = [
  { id: "Developer", name: "Developer", persona: "voce e o developer", tools: ["write_file", "read_file"], memoryScope: "Developer", permissions: ["write_file"] },
  { id: "Finance", name: "Finance", persona: "voce e o finance", tools: ["web_search"], memoryScope: "Finance", permissions: ["web_search"] },
  { id: "Hampton", name: "Hampton", persona: "central", tools: null, memoryScope: "Hampton", permissions: null },
];

describe("schema único de agente", () => {
  it("lista os schemas com persona/ferramentas/escopo/permissões", () => {
    const hub = createAgentHub({ registry: REGISTRY });
    const list = hub.listSchemas();
    expect(list).toHaveLength(3);
    const dev = hub.getSchema("Developer");
    expect(dev.persona).toContain("developer");
    expect(dev.tools).toEqual(["write_file", "read_file"]);
    expect(dev.memoryScope).toBe("Developer");
    expect(dev.permissions).toEqual(["write_file"]);
  });

  it("retorna null para agente desconhecido", () => {
    const hub = createAgentHub({ registry: REGISTRY });
    expect(hub.getSchema("NaoExiste")).toBeNull();
  });

  it("listNames retorna os ids", () => {
    const hub = createAgentHub({ registry: REGISTRY });
    expect(hub.listNames()).toContain("Finance");
  });
});

describe("delegação serial", () => {
  it("rota para o especialista, executa e retorna o resultado com trace", async () => {
    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: "Developer", reason: "pedido de código" }),
      execute: async (agent, req) => ({ ok: true, result: `feito por ${agent}: ${req}` }),
    });
    const res = await hub.delegate({ request: "crie um hello world" });
    expect(res.ok).toBe(true);
    expect(res.agent).toBe("Developer");
    expect(res.result).toBe("feito por Developer: crie um hello world");
    expect(res.steps.map((s) => s.step)).toEqual(["route", "execute"]);
    expect(res.steps[0].reason).toBe("pedido de código");
  });

  it("responde direto na central quando o roteador decide null", async () => {
    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: null, reason: "simples" }),
      execute: async (agent) => ({ ok: true, result: agent ? `especialista:${agent}` : "resposta central" }),
    });
    const res = await hub.delegate({ request: "qual a capital do Brasil?" });
    expect(res.ok).toBe(true);
    expect(res.agent).toBeNull();
    expect(res.result).toBe("resposta central");
  });

  it("usa agentHint para delegação direta, pulando o roteador", async () => {
    const routed = vi.fn();
    const hub = createAgentHub({
      registry: REGISTRY,
      route: routed,
      execute: async (agent) => ({ ok: true, result: agent }),
    });
    const res = await hub.delegate({ request: "x", agentHint: "Finance" });
    expect(routed).not.toHaveBeenCalled();
    expect(res.agent).toBe("Finance");
    expect(res.steps[0].reason).toBe("delegação direta");
  });

  it("valida request vazio e agente desconhecido no hint", async () => {
    const hub = createAgentHub({ registry: REGISTRY, route: async () => ({ agent: null, reason: "" }) });
    expect(await hub.delegate({ request: "  " })).toMatchObject({ ok: false, error: "request é obrigatório" });
    expect(await hub.delegate({ request: "x", agentHint: "Ghost" })).toMatchObject({ ok: false });
  });

  it("escala para a central quando o especialista falha", async () => {
    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: "Developer", reason: "r" }),
      execute: async () => ({ ok: false, error: "provider offline" }),
      escalate: async (req, ctx, err) => ({ ok: true, result: `central resolveu (${err})` }),
    });
    const res = await hub.delegate({ request: "x" });
    expect(res.ok).toBe(true);
    expect(res.escalated).toBe(true);
    expect(res.agent).toBeNull();
    expect(res.result).toBe("central resolveu (provider offline)");
    expect(res.steps.map((s) => s.step)).toEqual(["route", "execute", "escalate"]);
  });

  it("retorna erro final quando a escalação também falha", async () => {
    const hub = createAgentHub({
      registry: REGISTRY,
      route: async () => ({ agent: "Developer", reason: "r" }),
      execute: async () => ({ ok: false, error: "boom" }),
      escalate: async () => ({ ok: false, error: "central fora" }),
    });
    const res = await hub.delegate({ request: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("central fora");
    expect(res.escalated).toBe(true);
  });

  it("sem route configurado falha com mensagem clara", async () => {
    const hub = createAgentHub({ registry: REGISTRY, execute: async () => ({ ok: true, result: "x" }) });
    expect(await hub.delegate({ request: "x" })).toMatchObject({ ok: false, error: "route não configurado" });
  });

  it("sem execute configurado falha após o roteamento", async () => {
    const hub = createAgentHub({ registry: REGISTRY, route: async () => ({ agent: null, reason: "" }) });
    const res = await hub.delegate({ request: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("execute não configurado");
    expect(res.steps).toHaveLength(1);
  });
});

describe("route e execute isolados", () => {
  it("route expõe a decisão isolada", async () => {
    const hub = createAgentHub({ registry: REGISTRY, route: async () => ({ agent: "Finance", reason: "r" }) });
    expect(await hub.route("x")).toEqual({ agent: "Finance", reason: "r" });
  });

  it("execute expõe a execução isolada", async () => {
    const hub = createAgentHub({ registry: REGISTRY, execute: async () => ({ ok: true, result: "ok" }) });
    expect(await hub.execute("Developer", "x")).toEqual({ ok: true, result: "ok" });
  });
});
