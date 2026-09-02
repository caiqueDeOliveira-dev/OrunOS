// electron/ai-router-keystore.cjs
//
// Cofre de credenciais do Orun Router.
// As API keys de providers passam a morar AQUI (dentro do ai-router.sqlite,
// cifradas com AES-256-GCM usando uma chave mestre própria do router), e não
// mais no cofre do desktop (slots `ai-router.<provider>`).
//
// - tabela `provider_credentials`: provider_id + account_label + bloco cifrado
// - chave mestre: userData/ai-router-keystore.key (32 bytes aleatórios, criada
//   na primeira execução, escrita com permissão restrita)
// - migração idempotente dos slots legados `ai-router.*` do desktop
// - fallback de leitura mantido no adapter do router (slots antigos ainda
//   funcionam até serem migrados/apagados)

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const log = require("electron-log");

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const MIGRATED_MARKER = "legacy_secrets_migrated_at";

class AiRouterKeystore {
  constructor(db, keyFilePath) {
    this.db = db;
    this.keyFilePath = keyFilePath;
    db.exec(`
      CREATE TABLE IF NOT EXISTS provider_credentials (
        provider_id TEXT NOT NULL,
        account_label TEXT NOT NULL DEFAULT 'default',
        api_key_enc TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (provider_id, account_label)
      );
      CREATE TABLE IF NOT EXISTS router_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    this.masterKey = this._loadOrCreateKey();
  }

  _loadOrCreateKey() {
    try {
      const existing = fs.readFileSync(this.keyFilePath);
      if (existing.length === KEY_BYTES) return existing;
    } catch (e) { /* primeiro uso: ainda não existe */ }
    const key = crypto.randomBytes(KEY_BYTES);
    fs.mkdirSync(path.dirname(this.keyFilePath), { recursive: true });
    fs.writeFileSync(this.keyFilePath, key, { mode: 0o600 });
    return key;
  }

  _encrypt(plain) {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
  }

  _decrypt(payload) {
    const [ivB64, tagB64, dataB64] = String(payload).split(":");
    if (!ivB64 || !tagB64 || !dataB64) throw new Error("payload inválido");
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  async get(providerId, accountLabel = "default") {
    const row = this.db
      .prepare("SELECT api_key_enc FROM provider_credentials WHERE provider_id = ? AND account_label = ?")
      .get(providerId, accountLabel);
    if (!row) return null;
    try {
      const key = this._decrypt(row.api_key_enc);
      return typeof key === "string" && key.trim() ? key.trim() : null;
    } catch (err) {
      log.warn(`[ai-router-keystore] falha ao decifrar ${providerId}@${accountLabel}: ${err.message}`);
      return null;
    }
  }

  async set(providerId, apiKey, accountLabel = "default") {
    const value = String(apiKey || "").trim();
    if (!value) return false;
    const enc = this._encrypt(value);
    this.db
      .prepare(`
        INSERT INTO provider_credentials (provider_id, account_label, api_key_enc, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(provider_id, account_label)
        DO UPDATE SET api_key_enc = excluded.api_key_enc, updated_at = excluded.updated_at
      `)
      .run(providerId, accountLabel, enc);
    return true;
  }

  async delete(providerId, accountLabel = "default") {
    this.db
      .prepare("DELETE FROM provider_credentials WHERE provider_id = ? AND account_label = ?")
      .run(providerId, accountLabel);
    return true;
  }

  async has(providerId, accountLabel = "default") {
    const key = await this.get(providerId, accountLabel);
    return key !== null;
  }

  async list() {
    return this.db
      .prepare("SELECT provider_id, account_label, updated_at FROM provider_credentials")
      .all()
      .map((r) => ({ providerId: r.provider_id, accountLabel: r.account_label, updatedAt: r.updated_at }));
  }

  async count() {
    return this.db.prepare("SELECT COUNT(*) AS n FROM provider_credentials").get().n;
  }

  _metaGet(key) {
    return this.db.prepare("SELECT value FROM router_meta WHERE key = ?").get(key)?.value ?? null;
  }

  _metaSet(key, value) {
    this.db
      .prepare("INSERT INTO router_meta (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .run(key, value);
  }

  wasLegacyMigrated() {
    return this._metaGet(MIGRATED_MARKER) !== null;
  }

  markLegacyMigrated() {
    this._metaSet(MIGRATED_MARKER, new Date().toISOString());
  }
}

function openAiRouterKeystore(db, keyFilePath) {
  return new AiRouterKeystore(db, keyFilePath);
}

/**
 * Migra slots legados do cofre do desktop para o keystore do router.
 * Copia TODOS os `ai-router.*` para provider_credentials e remove os slots
 * do cofre do desktop (a fonte de verdade passa a ser o router).
 * As chaves "bare" de provider (slots `openai`, `openai:2`, etc.) NÃO são
 * tocadas — continuam servindo o resto do app (ai-relay, agents).
 * Idempotente: roda uma única vez (marcador em router_meta).
 */
async function migrateLegacyRouterSecrets(keystore, secretStore) {
  if (!secretStore) return { migrated: 0, skipped: true };
  if (keystore.wasLegacyMigrated()) return { migrated: 0, skipped: true };

  let migrated = 0;
  let removed = 0;
  try {
    const all = (await secretStore.readSecretStore?.()) || {};
    for (const [slot, value] of Object.entries(all)) {
      if (!slot.startsWith("ai-router.")) continue;
      const rest = slot.slice("ai-router.".length);
      const [providerId, accountLabel] = rest.includes(".")
        ? [rest.slice(0, rest.indexOf(".")), rest.slice(rest.indexOf(".") + 1)]
        : [rest, "default"];
      if (typeof value === "string" && value.trim()) {
        const had = await keystore.has(providerId, accountLabel);
        if (!had) {
          await keystore.set(providerId, value, accountLabel);
          migrated++;
        }
        try { await secretStore.delete?.(slot); removed++; log.info(`[ai-router-keystore] slot legado removido do desktop: ${slot}`); }
        catch (e) { log.warn(`[ai-router-keystore] não consegui remover ${slot}: ${e.message}`); }
      }
    }
    keystore.markLegacyMigrated();
  } catch (err) {
    log.warn(`[ai-router-keystore] migração de segredos falhou: ${err.message}`);
  }
  return { migrated, removed };
}

module.exports = { openAiRouterKeystore, migrateLegacyRouterSecrets, AiRouterKeystore };