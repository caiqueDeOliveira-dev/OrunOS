// electron/agent-hub.cjs
//
// Módulo 5 — Agent Hub (colaboração serial).
//
// 1) Schema único de agente: (persona, ferramentas, escopo de memória,
//    permissões) — os 17 agentes viram instâncias desse schema.
// 2) Delegação serial: Central decide → especialista executa → resultado
//    volta (e escada de escalação quando o especialista falha).
//
// Engine puro e testável: `route`/`execute`/`escalate` são injetáveis (o
// main.cjs liga no LLM/aiRouter). Não mantém estado próprio — os agentes já
// são instâncias do DEFAULT_PROMPTS + AGENT_TOOL_PERMISSIONS.

function createAgentHub(opts = {}) {
  const registry = opts.registry || [];
  const routeWith = opts.route || null;       // (request, context) => { agent, reason }
  const executeWith = opts.execute || null;   // (agent, request, context) => { ok, result?, error? }
  const escalateWith = opts.escalate || null; // (request, context, error) => { ok, result? }

  function getSchema(id) {
    return registry.find((a) => a.id === id) || null;
  }

  function listSchemas() {
    return registry.map((a) => ({ ...a }));
  }

  function listNames() {
    return registry.map((a) => a.id);
  }

  /**
   * Delegação serial: roteia para o especialista (ou responde central),
   * executa com a persona dele e escala em caso de falha.
   * Retorna um trace dos passos para a UI mostrar o fluxo.
   */
  async function delegate({ request, context = "", agentHint = null } = {}) {
    if (typeof request !== "string" || !request.trim()) {
      return { ok: false, error: "request é obrigatório", steps: [] };
    }
    const steps = [];

    // Passo 1 — Central decide o especialista.
    let decision = { agent: null, reason: "" };
    if (agentHint) {
      if (!getSchema(agentHint)) {
        return { ok: false, error: `agente desconhecido: ${agentHint}`, steps: [] };
      }
      decision = { agent: agentHint, reason: "delegação direta" };
    } else if (routeWith) {
      decision = await Promise.resolve(routeWith(request, context)).catch((e) => ({
        agent: null,
        reason: `falha ao rotear: ${e.message}`,
      }));
    } else {
      return { ok: false, error: "route não configurado", steps: [] };
    }
    steps.push({ step: "route", agent: decision.agent || null, reason: decision.reason || "" });

    const target = decision.agent ? getSchema(decision.agent) : null;
    if (decision.agent && !target) {
      return {
        ok: false,
        error: `roteou para agente desconhecido: ${decision.agent}`,
        steps,
      };
    }

    // Passo 2 — Especialista (ou central) executa.
    if (!executeWith) {
      return { ok: false, error: "execute não configurado", steps };
    }
    let res;
    try {
      res = await Promise.resolve(executeWith(decision.agent, request, context));
    } catch (e) {
      res = { ok: false, error: e.message };
    }
    steps.push({
      step: "execute",
      agent: decision.agent || null,
      ok: Boolean(res?.ok),
      error: res?.error || null,
    });

    if (res && res.ok) {
      return { ok: true, agent: decision.agent || null, reason: decision.reason || "", result: res.result, steps };
    }

    // Passo 3 — Escalação (central assume com aviso).
    const err = (res && res.error) || "execução falhou";
    steps.push({ step: "escalate", agent: null, error: err });
    if (escalateWith) {
      const fallback = await Promise.resolve(escalateWith(request, context, err)).catch((e) => ({
        ok: false,
        error: e.message,
      }));
      if (fallback && fallback.ok) {
        return { ok: true, agent: null, reason: decision.reason || "", result: fallback.result, escalated: true, steps };
      }
      return { ok: false, agent: decision.agent || null, error: fallback?.error || err, escalated: true, steps };
    }
    return { ok: false, agent: decision.agent || null, error: err, escalated: false, steps };
  }

  /** Roteamento direto (passo 1 isolado) — útil para teste/UI. */
  async function route(request, context = "") {
    if (!routeWith) return { agent: null, reason: "route não configurado" };
    return Promise.resolve(routeWith(request, context)).catch((e) => ({ agent: null, reason: e.message }));
  }

  /** Execução isolada (passo 2) — útil para teste/UI. */
  async function execute(agent, request, context = "") {
    if (!executeWith) return { ok: false, error: "execute não configurado" };
    return Promise.resolve(executeWith(agent, request, context)).catch((e) => ({ ok: false, error: e.message }));
  }

  return { getSchema, listSchemas, listNames, delegate, route, execute };
}

module.exports = { createAgentHub };
