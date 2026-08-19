"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteSemanticCacheStore = exports.SqliteOAuthTokenStore = exports.SqliteUsageLogStore = exports.SqliteProviderConfigStore = exports.SqliteComboStore = void 0;
exports.openAiRouterDatabase = openAiRouterDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const ai_router_core_1 = require("@orun/ai-router-core");
/**
 * Camada SQLite compartilhada. Em produção: `better-sqlite3` no Electron,
 * troque por `expo-sqlite` no Expo (mesma forma, driver diferente) — igual
 * ao padrão já usado no @orun/settings.
 */
function openAiRouterDatabase(path) {
    const db = new better_sqlite3_1.default(path);
    db.pragma("journal_mode = WAL");
    db.exec(`
    CREATE TABLE IF NOT EXISTS combos (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS provider_configs (
      provider_id TEXT NOT NULL,
      account_label TEXT NOT NULL DEFAULT 'default',
      data TEXT NOT NULL,
      PRIMARY KEY (provider_id, account_label)
    );
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_combo ON usage_events(combo_id, timestamp DESC);

    -- tokens OAuth ficam em tabela separada porque são account-scope e
    -- sensíveis; o valor gravado aqui já deve vir cifrado pelo caller
    -- (o SqliteOAuthTokenStore abaixo recebe um cipher injetado).
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      provider_id TEXT NOT NULL,
      account_label TEXT NOT NULL DEFAULT 'default',
      encrypted_blob TEXT NOT NULL,
      PRIMARY KEY (provider_id, account_label)
    );

    -- cache semântico: só é consultado se combo.cacheEnabled=true (opt-in).
    -- embedding fica como JSON (array de floats) — dataset pequeno o
    -- suficiente (centenas de entradas por combo) pra não precisar de
    -- índice vetorial dedicado, a busca por similaridade roda em memória.
    CREATE TABLE IF NOT EXISTS semantic_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      response_content TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_semantic_cache_combo ON semantic_cache(combo_id, created_at DESC);
  `);
    // seed dos combos free builtin na primeira execução
    const insertCombo = db.prepare(`INSERT OR IGNORE INTO combos (id, data) VALUES (?, ?)`);
    const seedTx = db.transaction((combos) => {
        for (const combo of combos)
            insertCombo.run(combo.id, JSON.stringify(combo));
    });
    seedTx(ai_router_core_1.BUILTIN_FREE_COMBOS);
    return db;
}
class SqliteComboStore {
    db;
    constructor(db) {
        this.db = db;
    }
    async getCombo(comboId) {
        const row = this.db.prepare(`SELECT data FROM combos WHERE id = ?`).get(comboId);
        if (!row)
            return null;
        return ai_router_core_1.ComboSchema.parse(JSON.parse(row.data));
    }
    async listCombos() {
        const rows = this.db.prepare(`SELECT data FROM combos`).all();
        return rows.map((r) => ai_router_core_1.ComboSchema.parse(JSON.parse(r.data)));
    }
    async saveCombo(combo) {
        const validated = ai_router_core_1.ComboSchema.parse(combo);
        this.db
            .prepare(`INSERT INTO combos (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`)
            .run(validated.id, JSON.stringify(validated));
    }
    async deleteCombo(comboId) {
        this.db.prepare(`DELETE FROM combos WHERE id = ?`).run(comboId);
    }
}
exports.SqliteComboStore = SqliteComboStore;
class SqliteProviderConfigStore {
    db;
    constructor(db) {
        this.db = db;
    }
    async getConfig(providerId, accountLabel = "default") {
        const row = this.db
            .prepare(`SELECT data FROM provider_configs WHERE provider_id = ? AND account_label = ?`)
            .get(providerId, accountLabel);
        if (!row)
            return null;
        return ai_router_core_1.ProviderConfigSchema.parse(JSON.parse(row.data));
    }
    async listConfigs() {
        const rows = this.db.prepare(`SELECT data FROM provider_configs`).all();
        return rows.map((r) => ai_router_core_1.ProviderConfigSchema.parse(JSON.parse(r.data)));
    }
    async saveConfig(config) {
        const validated = ai_router_core_1.ProviderConfigSchema.parse(config);
        const accountLabel = validated.accountLabel ?? "default";
        this.db
            .prepare(`INSERT INTO provider_configs (provider_id, account_label, data) VALUES (?, ?, ?)
         ON CONFLICT(provider_id, account_label) DO UPDATE SET data = excluded.data`)
            .run(validated.providerId, accountLabel, JSON.stringify(validated));
    }
    async deleteConfig(providerId) {
        this.db.prepare(`DELETE FROM provider_configs WHERE provider_id = ?`).run(providerId);
    }
}
exports.SqliteProviderConfigStore = SqliteProviderConfigStore;
class SqliteUsageLogStore {
    db;
    constructor(db) {
        this.db = db;
    }
    async record(event) {
        const validated = ai_router_core_1.UsageEventSchema.parse(event);
        this.db
            .prepare(`INSERT INTO usage_events (combo_id, timestamp, data) VALUES (?, ?, ?)`)
            .run(validated.comboId, validated.timestamp, JSON.stringify(validated));
    }
    async listRecent(comboId, limit = 50) {
        const rows = comboId
            ? this.db
                .prepare(`SELECT data FROM usage_events WHERE combo_id = ? ORDER BY timestamp DESC LIMIT ?`)
                .all(comboId, limit)
            : this.db.prepare(`SELECT data FROM usage_events ORDER BY timestamp DESC LIMIT ?`).all(limit);
        return rows.map((r) => ai_router_core_1.UsageEventSchema.parse(JSON.parse(r.data)));
    }
}
exports.SqliteUsageLogStore = SqliteUsageLogStore;
class SqliteOAuthTokenStore {
    db;
    cipher;
    constructor(db, cipher) {
        this.db = db;
        this.cipher = cipher;
    }
    async getTokenSet(providerId, accountLabel = "default") {
        const row = this.db
            .prepare(`SELECT encrypted_blob FROM oauth_tokens WHERE provider_id = ? AND account_label = ?`)
            .get(providerId, accountLabel);
        if (!row)
            return null;
        return JSON.parse(this.cipher.decrypt(row.encrypted_blob));
    }
    async saveTokenSet(providerId, tokens, accountLabel = "default") {
        const blob = this.cipher.encrypt(JSON.stringify(tokens));
        this.db
            .prepare(`INSERT INTO oauth_tokens (provider_id, account_label, encrypted_blob) VALUES (?, ?, ?)
         ON CONFLICT(provider_id, account_label) DO UPDATE SET encrypted_blob = excluded.encrypted_blob`)
            .run(providerId, accountLabel, blob);
    }
}
exports.SqliteOAuthTokenStore = SqliteOAuthTokenStore;
/** Persistência real do cache semântico — só é usada se combo.cacheEnabled=true. */
class SqliteSemanticCacheStore {
    db;
    constructor(db) {
        this.db = db;
    }
    async listByCombo(comboId) {
        const rows = this.db
            .prepare(`SELECT combo_id, prompt_text, embedding, response_content, provider_id, model, created_at
         FROM semantic_cache WHERE combo_id = ? ORDER BY created_at DESC`)
            .all(comboId);
        return rows.map((r) => ({
            comboId: r.combo_id,
            promptText: r.prompt_text,
            embedding: JSON.parse(r.embedding),
            responseContent: r.response_content,
            providerId: r.provider_id,
            model: r.model,
            createdAt: r.created_at,
        }));
    }
    async add(entry) {
        this.db
            .prepare(`INSERT INTO semantic_cache (combo_id, prompt_text, embedding, response_content, provider_id, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(entry.comboId, entry.promptText, JSON.stringify(entry.embedding), entry.responseContent, entry.providerId, entry.model, entry.createdAt);
    }
    async prune(comboId, maxEntries) {
        // mantém só as `maxEntries` mais recentes desse combo, apaga o resto
        this.db
            .prepare(`DELETE FROM semantic_cache WHERE combo_id = ? AND id NOT IN (
           SELECT id FROM semantic_cache WHERE combo_id = ? ORDER BY created_at DESC LIMIT ?
         )`)
            .run(comboId, comboId, maxEntries);
    }
}
exports.SqliteSemanticCacheStore = SqliteSemanticCacheStore;
//# sourceMappingURL=sqlite.js.map