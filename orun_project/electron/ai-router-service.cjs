// electron/ai-router-service.cjs
//
// Orun Router service for the Orun OS main process.
// Wires @orun/ai-router into the desktop:
//   - SQLite stores (combos, provider configs, usage log) at userData/ai-router.sqlite
//   - API keys come from the existing secret-store.cjs (keychain/safeStorage)
//     through an IAiSecretStore adapter (reuses keys already configured in Settings)
//   - ModelRouter seeded with the free-forever combo
//   - Optional local OpenAI/Anthropic-compatible HTTP server (opt-in, 127.0.0.1 only)
//
// Lazy: nothing is touched until the first IPC call touches the router.

const path = require("path");
const log = require("electron-log");

const {
  openAiRouterDatabase,
  SqliteComboStore,
  SqliteProviderConfigStore,
  SqliteUsageLogStore,
} = require("@orun/ai-router-node");
const {
  openAiRouterKeystore,
  migrateLegacyRouterSecrets,
} = require("./ai-router-keystore.cjs");
const {
  ModelRouter,
  InMemorySkillStore,
  FREE_FOREVER_COMBO,
  BUILTIN_FREE_COMBOS,
  HAMPTON_CIRCLE_SEED,
} = require("@orun/ai-router-core");

let _state = null;
let _httpServer = null;
let _httpUrl = null;

/**
 * Secret-store adapter: resolve credenciais do router. Precedência:
 *   1. keystore do próprio router (provider_credentials, cifrado AES-256-GCM)
 *   2. slots legados do cofre do desktop (`ai-router.<provider>`) — até migrar
 *   3. slots "bare" de provider usados pelo app ({"openai", "groq", ...})
 * O set grava SEMPRE no keystore do router (o cofre do desktop deixa de ser a
 * fonte de verdade para o router).
 */
function createSecretAdapter(keystore, secretStore) {
  return {
    async getCredential(providerId, accountLabel) {
      const label = accountLabel && accountLabel !== "default" ? accountLabel : "default";
      const inRouter = await keystore.get(providerId, label);
      if (inRouter) return { apiKey: inRouter };
      const slotFor = accountLabel && accountLabel !== "default"
        ? `ai-router.${providerId}.${accountLabel}`
        : `ai-router.${providerId}`;
      const explicit = await secretStore.get(slotFor);
      if (typeof explicit === "string" && explicit.trim()) return { apiKey: explicit.trim() };
      const keys = secretStore.getProviderApiKeys(providerId);
      if (keys.length) return { apiKey: keys[0] };
      return null;
    },
    async setCredential(providerId, credential, accountLabel) {
      if (credential && credential.apiKey) {
        return keystore.set(providerId, credential.apiKey, accountLabel && accountLabel !== "default" ? accountLabel : "default");
      }
      return false;
    },
    async deleteCredential(providerId, accountLabel) {
      const label = accountLabel && accountLabel !== "default" ? accountLabel : "default";
      await keystore.delete(providerId, label);
      return true;
    },
  };
}

function getAiRouterService(app, secretStore) {
  if (_state) return _state;

  const dbPath = path.join(app.getPath("userData"), "ai-router.sqlite");
  const db = openAiRouterDatabase(dbPath);
  const keyPath = path.join(app.getPath("userData"), "ai-router-keystore.key");
  const keystore = openAiRouterKeystore(db, keyPath);
  const comboStore = new SqliteComboStore(db);
  const providerConfigStore = new SqliteProviderConfigStore(db);
  const usageLogStore = new SqliteUsageLogStore(db);

  const skillStore = new InMemorySkillStore();
  for (const skill of HAMPTON_CIRCLE_SEED) skillStore.seed(skill);

  const router = new ModelRouter(
    comboStore,
    providerConfigStore,
    createSecretAdapter(keystore, secretStore),
    skillStore,
    usageLogStore,
  );

  _state = { router, keystore, comboStore, providerConfigStore, usageLogStore, db, dbPath };
  log.info(`[ai-router] service ready db=${dbPath} combos=${BUILTIN_FREE_COMBOS.length}`);

  // Migra os slots legados `ai-router.*` do cofre do desktop para o keystore
  // do router (roda uma única vez; depois o router é a fonte de verdade).
  migrateLegacyRouterSecrets(keystore, secretStore).then((res) => {
    log.info(`[ai-router] credenciais legadas migradas=${res.migrated} removidas=${res.removed} skipped=${res.skipped}`);
  }).catch((e) => log.warn("[ai-router] migração de credenciais falhou:", e.message));

  // Auto-start HTTP server so dashboard is always accessible.
  try { startHttpServer(app, secretStore); } catch (e) { log.warn("[ai-router] auto-start http failed:", e); console.error("[ai-router] auto-start http FAILED:", e); }

  return _state;
}

function getDefaultComboId() {
  return FREE_FOREVER_COMBO.id;
}

/** Opt-in HTTP server (OpenAI/Anthropic-compatible) on 127.0.0.1. */
function startHttpServer(app, secretStore) {
  if (_httpServer) return { ok: true, alreadyRunning: true, url: _httpUrl };

  const { router, comboStore, providerConfigStore, usageLogStore, keystore, dbPath } = getAiRouterService(app, secretStore);
  const { createAiRouterServer } = require("@orun/ai-router-server");

  const port = Number(process.env.ORUN_AI_ROUTER_PORT) || 4321;
  const apiKey = process.env.ORUN_AI_ROUTER_API_KEY || undefined;

  // Resolve dashboard dist path: try ../router-dashboard/dist (monorepo) first,
  // then ../vendor/router-dashboard/dist (vendored), then null (no dashboard).
  const fs = require("fs");
  const candidateDirs = [
    path.join(__dirname, "..", "router-dashboard", "dist"),
    path.join(__dirname, "..", "vendor", "router-dashboard", "dist"),
  ];
  const dashboardDir = candidateDirs.find((d) => {
    const hasIndex = fs.existsSync(path.join(d, "index.html"));
    log.info(`[ai-router] dashboard check ${d} => ${hasIndex}`);
    console.log(`[ai-router] dashboard check ${d} => ${hasIndex}`);
    return hasIndex;
  }) || undefined;
  log.info(`[ai-router] resolved dashboardDir=${dashboardDir ?? "null"}`);
  console.log(`[ai-router] resolved dashboardDir=${dashboardDir ?? "null"}`);

  const server = createAiRouterServer({
    router,
    comboStore,
    providerConfigStore,
    credentialStore: keystore,
    usageStore: usageLogStore,
    apiKey,
    meta: { dbPath, defaultComboId: FREE_FOREVER_COMBO.id },
    dashboardDir,
  });

  _httpServer = server;
  _httpUrl = `http://127.0.0.1:${port}`;
  server.listen(port, "127.0.0.1");
  log.info(`[ai-router] http server listening on ${_httpUrl}${apiKey ? " (auth: Bearer)" : ""}`);
  return { ok: true, url: _httpUrl };
}

function stopHttpServer() {
  if (!_httpServer) return { ok: true };
  _httpServer.close();
  _httpServer = null;
  _httpUrl = null;
  return { ok: true };
}

function httpServerStatus() {
  return { running: !!_httpServer, url: _httpUrl };
}

/** Resets the singleton (tests only). */
function reset() {
  _state = null;
  _httpServer = null;
  _httpUrl = null;
}

module.exports = {
  getAiRouterService,
  getDefaultComboId,
  startHttpServer,
  stopHttpServer,
  httpServerStatus,
  reset,
};
