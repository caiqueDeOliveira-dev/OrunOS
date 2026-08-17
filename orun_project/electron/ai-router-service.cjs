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
 * Secret-store adapter: resolves router credentials from the desktop's own
 * keychain store. Slot precedence:
 *   1. `ai-router.<providerId>` (or `ai-router.<providerId>.<accountLabel>`)
 *   2. the bare provider slot used by Settings (e.g. "groq", "openai", "ollama")
 */
function createSecretAdapter(secretStore) {
  const slotFor = (providerId, accountLabel) =>
    accountLabel && accountLabel !== "default"
      ? `ai-router.${providerId}.${accountLabel}`
      : `ai-router.${providerId}`;

  return {
    async getCredential(providerId, accountLabel) {
      const explicit = await secretStore.get(slotFor(providerId, accountLabel));
      if (typeof explicit === "string" && explicit.trim()) return { apiKey: explicit.trim() };
      const keys = secretStore.getProviderApiKeys(providerId);
      if (keys.length) return { apiKey: keys[0] };
      return null;
    },
    async setCredential(providerId, credential, accountLabel) {
      if (credential.apiKey) return secretStore.set(slotFor(providerId, accountLabel), credential.apiKey.trim());
      return false;
    },
  };
}

function getAiRouterService(app, secretStore) {
  if (_state) return _state;

  const dbPath = path.join(app.getPath("userData"), "ai-router.sqlite");
  const db = openAiRouterDatabase(dbPath);
  const comboStore = new SqliteComboStore(db);
  const providerConfigStore = new SqliteProviderConfigStore(db);
  const usageLogStore = new SqliteUsageLogStore(db);

  const skillStore = new InMemorySkillStore();
  for (const skill of HAMPTON_CIRCLE_SEED) skillStore.seed(skill);

  const router = new ModelRouter(
    comboStore,
    providerConfigStore,
    createSecretAdapter(secretStore),
    skillStore,
    usageLogStore,
  );

  _state = { router, comboStore, providerConfigStore, usageLogStore, db, dbPath };
  log.info(`[ai-router] service ready db=${dbPath} combos=${BUILTIN_FREE_COMBOS.length}`);
  return _state;
}

function getDefaultComboId() {
  return FREE_FOREVER_COMBO.id;
}

/** Opt-in HTTP server (OpenAI/Anthropic-compatible) on 127.0.0.1. */
function startHttpServer(app, secretStore) {
  if (_httpServer) return { ok: true, alreadyRunning: true, url: _httpUrl };

  const { router, comboStore, providerConfigStore, usageLogStore, dbPath } = getAiRouterService(app, secretStore);
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
  const dashboardDir = candidateDirs.find((d) => fs.existsSync(path.join(d, "index.html"))) || undefined;

  const server = createAiRouterServer({
    router,
    comboStore,
    providerConfigStore,
    usageLogStore,
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
