// electron/ipc/settings-handlers.cjs
// Settings, API keys, conversations, and app preference handlers.
// Novo: integração com @orun/settings bridge (schema validado, escopo, sync).

const { randomUUID } = require("crypto");
const { validateApiKey } = require("../api-key-validator.cjs");
const { dbEncryption } = require("../db-encryption.cjs");
const logger = require("../logger.cjs");

function register(ipcMain, ctx) {
  const { db, secretStore, syncEnqueue, getGlobalAISettings, agentRecommendedModels, settingsBridge } = ctx;

  ipcMain.handle("settings:get", (_event, key) => {
    if (typeof key !== "string" || !key.trim()) return null;
    if (key === "ai") return getGlobalAISettings();
    if (key === "agentModels" || key === "automationActions") return db.getSetting(key, key === "automationActions" ? [] : {});
    return db.getSetting(key);
  });
  ipcMain.handle("settings:set", (_event, key, value) => {
    if (typeof key !== "string" || !key.trim()) return false;
    db.setSetting(key, value);
    syncEnqueue("settings", { id: key, key, value: JSON.stringify(value), created_at: Date.now() });
    return true;
  });
  ipcMain.handle("settings:is-first-run", () => {
    const settingsPath = require("path").join(require("electron").app.getPath("userData"), "settings.json");
    return !require("fs").existsSync(settingsPath);
  });

  ipcMain.handle("settings:set-api-key", (_event, slot, value) => {
    if (typeof slot !== "string" || !slot.trim()) return false;
    if (typeof value !== "string") return false;
    return secretStore.writeSecret(slot, value);
  });
  ipcMain.handle("settings:has-api-key", (_event, slot) => Boolean(secretStore.readSecretStore()[slot]));
  ipcMain.handle("settings:set-provider-key", (_event, provider, index, value) => secretStore.setApiKeyAt(provider, index, value));
  ipcMain.handle("settings:delete-provider-key", (_event, provider, index) => secretStore.deleteApiKeyAt(provider, index));
  ipcMain.handle("settings:provider-key-count", (_event, provider) => (typeof provider === "string" ? secretStore.getApiKeyCount(provider) : 0));
  ipcMain.handle("settings:validate-api-key", async (_event, { provider, key }) => {
    if (!provider || !key) {
      return { valid: false, error: "Provider e key são obrigatórios" };
    }
    return validateApiKey(provider, key);
  });

  // Conversations (agent omitted → Hampton's main chat only; pass an agent name to scope to that agent)
  ipcMain.handle("conversations:list", (_event, agent) => db.listConversations(agent === undefined ? null : agent));
  ipcMain.handle("conversations:create", (_event, title, agent) => {
    if (typeof title !== "string") title = "New conversation";
    const conv = db.createConversation(randomUUID(), title.slice(0, 100), agent || null);
    syncEnqueue("conversations", conv);
    return conv;
  });
  ipcMain.handle("conversations:messages", (_event, conversationId) => db.getMessages(conversationId));
  ipcMain.handle("conversations:add-message", (_event, conversationId, message) => {
    db.addMessage(conversationId, message);
    syncEnqueue("messages", { id: message.id, conversation_id: conversationId, role: message.role, content: message.content, created_at: Date.now() });
    return true;
  });
  ipcMain.handle("conversations:delete", (_event, conversationId) => db.deleteConversation(conversationId));
  ipcMain.handle("conversations:truncate-from", (_event, conversationId, messageId) => { db.truncateFrom(conversationId, messageId); return true; });

  // App-level preferences
  ipcMain.handle("app:set-run-in-background", (_event, value) => { db.setSetting("runInBackground", value); return true; });

  // Auto-start with Windows
  ipcMain.handle("app:set-auto-start", (_event, value) => {
    db.setSetting("autoStart", value);
    const { app } = require("electron");
    app.setLoginItemSettings({ openAtLogin: value });
    return true;
  });

  // Auto-resume last conversation
  ipcMain.handle("app:set-last-conversation", (_event, id) => { db.setSetting("lastConversationId", id); return true; });
  ipcMain.handle("app:get-last-conversation", () => db.getSetting("lastConversationId", null));

  // Full-text search across conversations
  ipcMain.handle("conversations:search", (_event, query) => {
    try {
      const database = db.getDb();
      if (!database || !query || query.trim().length < 2) return [];
      // Wrap in double quotes for literal phrase matching (prevents FTS5 injection)
      const safeQuery = `"${query.trim().replace(/"/g, '""')}"`;
      const rows = database.prepare(`
        SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at,
          snippet(conversations_fts, 0, '>>>', '<<<', '...', 32) as snippet
        FROM conversations_fts
        JOIN conversations c ON c.id = conversations_fts.rowid
        WHERE conversations_fts MATCH ?
        ORDER BY rank
        LIMIT 20
      `).all(safeQuery);
      return rows;
    } catch (e) {
      logger.ipc.error("[search] FTS search failed, falling back:", e.message);
      return db.listConversations().filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20);
    }
  });

  // Database encryption
  ipcMain.handle("settings:encrypt-db", async () => {
    try {
      const dbPath = db.getDbPath();
      const database = db.getDb();
      if (database) {
        database.close();
      }
      dbEncryption.encryptDB(dbPath);
      // Re-open database after encryption
      const { secretStore } = ctx;
      db.init(require("electron").app.getPath("userData"), secretStore.getOrCreateDBKey());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("settings:decrypt-db", async () => {
    try {
      const dbPath = db.getDbPath();
      const database = db.getDb();
      if (database) {
        database.close();
      }
      dbEncryption.decryptDB(dbPath);
      // Re-open database after decryption
      const { secretStore } = ctx;
      db.init(require("electron").app.getPath("userData"), secretStore.getOrCreateDBKey());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("settings:db-encrypted", () => {
    const dbPath = db.getDbPath();
    return dbEncryption.isEncrypted(dbPath);
  });

  ipcMain.handle("settings:encryption-weak-mode", () => {
    return dbEncryption.weakMode;
  });

  ipcMain.handle("settings:agent-recommended-models", () => agentRecommendedModels || {});

  // ── @orun/settings bridge (schema validado, escopo, defaults) ────────────
  // Novos handlers que usam o SettingsStore do settings-bridge.cjs.
  // Compat: settings:get/set legados continuam funcionando (SQLite).

  ipcMain.handle("settings:schema-get", async (_event, pathStr) => {
    if (!settingsBridge) return null;
    const store = settingsBridge.getStore();
    if (!store) return null;
    try { return await store.get(pathStr); } catch { return null; }
  });

  ipcMain.handle("settings:schema-set", async (_event, pathStr, value) => {
    if (!settingsBridge) return false;
    const store = settingsBridge.getStore();
    if (!store) return false;
    try {
      await store.set(pathStr, value);
      return true;
    } catch (err) {
      logger.sync.warn("[settings-bridge] set falhou:", err.message);
      return false;
    }
  });

  ipcMain.handle("settings:schema-get-all", async () => {
    if (!settingsBridge) return null;
    const store = settingsBridge.getStore();
    if (!store) return null;
    try { return await store.getAll(); } catch { return null; }
  });

  ipcMain.handle("settings:schema-reset", async (_event, pathStr) => {
    if (!settingsBridge) return false;
    const store = settingsBridge.getStore();
    if (!store) return false;
    try { await store.reset(pathStr); return true; } catch { return false; }
  });

  ipcMain.handle("settings:schema-scope", async (_event, pathStr) => {
    if (!settingsBridge) return null;
    try { return settingsBridge.getStore()?.getScope(pathStr) ?? null; } catch { return null; }
  });

  ipcMain.handle("settings:schema-account-paths", () => {
    if (!settingsBridge) return [];
    return settingsBridge.getAccountScopedPaths();
  });
}

module.exports = { register };
