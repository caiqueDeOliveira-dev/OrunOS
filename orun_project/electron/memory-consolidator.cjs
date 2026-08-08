// electron/memory-consolidator.cjs
//
// Módulo 2 — consolidação automática de memórias (Fase 2).
//
// Agenda um cron diário que chama `memoryEngine.consolidate` para cada escopo
// de agente presente no store (mais o escopo global). Converte memórias de
// curto prazo maduras (>24h) em fatos de longo prazo sem apagar as originais.
//
// `consolidateAll` também é exportado para execução manual/testes.

const cron = require("node-cron");

const DEFAULT_MIN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Agenda a consolidação diária.
 * @param {{ memoryEngine: any, logger?: any, hour?: number, minute?: number, runOnStart?: boolean }} opts
 */
function init({ memoryEngine, logger, hour = 3, minute = 0, runOnStart = false } = {}) {
  if (!memoryEngine) return { ok: false, reason: "memoryEngine não configurado" };
  const task = cron.schedule(`${minute} ${hour} * * *`, () => {
    consolidateAll({ memoryEngine, logger }).catch(() => {});
  });
  if (runOnStart) {
    setTimeout(() => consolidateAll({ memoryEngine, logger }).catch(() => {}), 60_000);
  }
  return { ok: true, task };
}

/**
 * Consolida memórias maduras de todos os escopos presentes no store.
 * @param {{ memoryEngine: any, logger?: any, minAgeMs?: number }} opts
 */
async function consolidateAll({ memoryEngine, logger, minAgeMs } = {}) {
  if (!memoryEngine) return { ok: false, reason: "memoryEngine não configurado" };
  const log = logger || { info: () => {}, warn: () => {}, error: () => {} };
  const scopes = [...new Set(memoryEngine.load().map((r) => r.scopeAgent || null))];
  const consolidated = [];

  for (const agent of scopes) {
    try {
      const res = await memoryEngine.consolidate({
        scopeAgent: agent,
        minAgeMs: minAgeMs || DEFAULT_MIN_AGE_MS,
      });
      if (res.ok) {
        consolidated.push({ scope: agent || "global", candidates: res.candidates, chars: res.summarized.length });
        log.info(`[memory-consolidator] escopo ${agent || "global"}: ${res.candidates} memórias → ${res.summarized.length} chars`);
      } else {
        log.info(`[memory-consolidator] escopo ${agent || "global"}: ${res.reason}`);
      }
    } catch (e) {
      log.warn(`[memory-consolidator] falha no escopo ${agent || "global"}: ${e.message}`);
    }
  }

  return { ok: true, consolidated };
}

module.exports = { init, consolidateAll };
