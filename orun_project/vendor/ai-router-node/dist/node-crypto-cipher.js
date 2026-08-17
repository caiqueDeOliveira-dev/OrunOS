"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteApiKeySecretStore = exports.NodeAesGcmCipher = void 0;
exports.getOrCreateCipherSalt = getOrCreateCipherSalt;
const node_crypto_1 = require("node:crypto");
/**
 * Lê (ou gera na primeira vez) um salt aleatório de 16 bytes, persistido
 * na própria base — nunca hardcoded. Cada instalação do Orun tem o seu.
 */
function getOrCreateCipherSalt(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS cipher_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    const row = db.prepare(`SELECT value FROM cipher_meta WHERE key = 'salt'`).get();
    if (row)
        return Buffer.from(row.value, "base64");
    const salt = (0, node_crypto_1.randomBytes)(16);
    db.prepare(`INSERT INTO cipher_meta (key, value) VALUES ('salt', ?)`).run(salt.toString("base64"));
    return salt;
}
/**
 * ⚠️ Stand-in de DEV/teste. Em produção real:
 * - Electron: use `safeStorage.encryptString()` / `decryptString()` (já é o
 *   padrão que você usa no resto do monorepo — chave gerenciada pelo SO).
 * - Expo: use `expo-secure-store` diretamente (Keychain/Keystore nativo),
 *   nem precisa desse cipher manual.
 * Esta classe existe só pra rodar/testar o pacote fora do Electron/Expo.
 *
 * O salt NUNCA é fixo no código — vem de `getOrCreateCipherSalt(db)`, que
 * gera um valor aleatório na primeira execução e persiste. Duas instalações
 * do Orun nunca compartilham o mesmo salt.
 */
class NodeAesGcmCipher {
    key;
    constructor(passphrase, salt) {
        if (salt.length < 16) {
            throw new Error("Salt precisa ter pelo menos 16 bytes — use getOrCreateCipherSalt(db).");
        }
        this.key = (0, node_crypto_1.scryptSync)(passphrase, salt, 32);
    }
    encrypt(plain) {
        const iv = (0, node_crypto_1.randomBytes)(12);
        const cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", this.key, iv);
        const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]).toString("base64");
    }
    decrypt(cipherText) {
        const raw = Buffer.from(cipherText, "base64");
        const iv = raw.subarray(0, 12);
        const authTag = raw.subarray(12, 28);
        const encrypted = raw.subarray(28);
        const decipher = (0, node_crypto_1.createDecipheriv)("aes-256-gcm", this.key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    }
}
exports.NodeAesGcmCipher = NodeAesGcmCipher;
/** API keys estáticas cifradas em SQLite — mesmo padrão de tabela do oauth_tokens. */
class SqliteApiKeySecretStore {
    db;
    cipher;
    constructor(db, cipher) {
        this.db = db;
        this.cipher = cipher;
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_key_secrets (
        provider_id TEXT NOT NULL,
        account_label TEXT NOT NULL DEFAULT 'default',
        encrypted_blob TEXT NOT NULL,
        PRIMARY KEY (provider_id, account_label)
      );
    `);
    }
    async getCredential(providerId, accountLabel = "default") {
        const row = this.db
            .prepare(`SELECT encrypted_blob FROM api_key_secrets WHERE provider_id = ? AND account_label = ?`)
            .get(providerId, accountLabel);
        if (!row)
            return null;
        return JSON.parse(this.cipher.decrypt(row.encrypted_blob));
    }
    async setCredential(providerId, credential, accountLabel = "default") {
        const blob = this.cipher.encrypt(JSON.stringify(credential));
        this.db
            .prepare(`INSERT INTO api_key_secrets (provider_id, account_label, encrypted_blob) VALUES (?, ?, ?)
         ON CONFLICT(provider_id, account_label) DO UPDATE SET encrypted_blob = excluded.encrypted_blob`)
            .run(providerId, accountLabel, blob);
    }
}
exports.SqliteApiKeySecretStore = SqliteApiKeySecretStore;
//# sourceMappingURL=node-crypto-cipher.js.map