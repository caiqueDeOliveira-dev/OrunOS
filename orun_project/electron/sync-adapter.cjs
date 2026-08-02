// electron/sync-adapter.cjs
//
// Camada de integração com o @orun/core (Orun-Core).
//
// Design: o Orun OS continua usando electron/supabase.cjs como engine de sync
// das tabelas locais (cobre as 11 tabelas do app; o SyncService do core cobre
// o ecossistema). Este adapter ADICIONA o ecossistema POR CIMA, sem substituir
// nada — por isso espelha 1:1 a interface do supabase.cjs (delegação pura).
//
//  - Se @orun/core estiver instalado E as credenciais Supabase estiverem no
//    keychain (slots "orun.supabase.url" + "orun.supabase.serviceRoleKey"),
//    ativa o SatelliteController: heartbeat de `devices` + fila de comandos.
//  - Caso contrário, o app roda exatamente como antes (fallback silencioso).
//
// service_role é lida SOMENTE aqui, no processo principal — nunca no renderer.

let core = null;
try {
  core = require("@orun/core");
} catch {
  // @orun/core ausente → rodamos apenas com o sync legado (supabase.cjs).
}

const legacySync = require("./supabase.cjs");
const logger = require("./logger.cjs");

const HEARTBEAT_INTERVAL_MS = 30_000;

let controller = null;
let ecosystemEnabled = false;
let deviceId = null;
let heartbeatTimer = null;

function appVersion() {
  try {
    const { app } = require("electron");
    return app.getVersion() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// ── Ecossistema (Orun-Core) ───────────────────────────────────────────────

/**
 * Ativa o ecossistema. Retorna true apenas se @orun/core estiver disponível
 * E as credenciais Supabase existirem no keychain. Não lança em nenhum caso.
 */
function initEcosystem(secretStore, appVersion) {
  if (!core) return false;
  try {
    const secrets = secretStore.readSecretStore();
    const url = secrets["orun.supabase.url"];
    const serviceRoleKey = secrets["orun.supabase.serviceRoleKey"];
    if (!url || !serviceRoleKey) return false;

    const supabase = core.getSupabaseClient({ url, serviceRoleKey });

    deviceId = secrets["orun.device.id"];
    if (!deviceId) {
      deviceId = core.newUuid();
      try { secretStore.writeSecret("orun.device.id", deviceId); } catch { /* best effort */ }
    }

    controller = new core.SatelliteController(supabase, {
      deviceId,
      deviceType: "desktop",
    });

    ecosystemEnabled = true;
    logger.info(`[ecosystem] Orun-Core ativo — deviceId=${deviceId} versao=${appVersion}`);
    return true;
  } catch (err) {
    logger.error("[ecosystem] initEcosystem falhou:", err.message);
    return false;
  }
}

function isEcosystemEnabled() {
  return ecosystemEnabled;
}

/** Devolve o SatelliteController ativo (ou null se o ecossistema estiver inativo). */
function getController() {
  return controller;
}

/** Publica heartbeat de `devices` a cada intervalo (30s) enquanto ativo. */
function startHeartbeat(intervalMs = HEARTBEAT_INTERVAL_MS) {
  if (!controller || heartbeatTimer) return;

  const beat = async () => {
    try {
      await controller.heartbeat({ nome: "Orun OS (desktop)", versao: appVersion() });
    } catch (err) {
      logger.warn(`[ecosystem] heartbeat falhou: ${err.message}`);
    }
  };

  beat();
  heartbeatTimer = setInterval(beat, intervalMs);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ── Delegação para o sync legado (supabase.cjs) ──────────────────────────
// Mesma assinatura do módulo anterior: main.cjs e data-handlers não mudam.

module.exports = {
  SYNC_TABLES: legacySync.SYNC_TABLES,
  init: (...args) => legacySync.init(...args),
  isConnected: (...args) => legacySync.isConnected(...args),
  testConnection: (...args) => legacySync.testConnection(...args),
  push: (...args) => legacySync.push(...args),
  pull: (...args) => legacySync.pull(...args),
  sync: (...args) => legacySync.sync(...args),
  enqueue: (...args) => legacySync.enqueue(...args),
  close: (...args) => legacySync.close(...args),
  // Ecossistema
  initEcosystem,
  isEcosystemEnabled,
  getController,
  startHeartbeat,
  stopHeartbeat,
};
