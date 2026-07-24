// electron/db-encryption.cjs
//
// Database encryption at rest.
// Encrypts/decrypts the SQLite DB file using AES-256-GCM.
// Key is stored encrypted via Electron safeStorage.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const logger = require("./logger.cjs");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class DBEncryption {
  constructor() {
    this.key = null;
    this.initialized = false;
    this.weakMode = false;
  }

  // Initialize with app name for safeStorage
  init(app) {
    if (this.initialized) return;
    
    this.userDataPath = app.getPath("userData");
    this.keyPath = path.join(this.userDataPath, ".db-key.enc");
    this.initialized = true;
  }

  // Generate a new random key
  generateKey() {
    return crypto.randomBytes(32);
  }

  // Get or create the encryption key
  async getOrCreateKey(safeStorage) {
    if (this.key) return this.key;

    // Try to load existing key
    if (fs.existsSync(this.keyPath)) {
      try {
        const encryptedKey = fs.readFileSync(this.keyPath);
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          this.key = Buffer.from(safeStorage.decryptString(encryptedKey), "hex");
        } else {
          // Fallback: key stored as hex (less secure)
          this.key = Buffer.from(encryptedKey.toString(), "hex");
          this.weakMode = true;
          logger.security.warn("[DB ENCRYPTION] safeStorage unavailable — key stored as plaintext hex");
          logger.security.warn("╔══════════════════════════════════════════════════════════════╗");
          logger.security.warn("║  ⚠ WEAK MODE: DB encryption key stored as plaintext hex    ║");
          logger.security.warn("║  Data is at risk if an attacker gains file system access.  ║");
          logger.security.warn("║  Enable OS keychain (safeStorage) for secure encryption.   ║");
          logger.security.warn("╚══════════════════════════════════════════════════════════════╝");
        }
        return this.key;
      } catch (err) {
        logger.security.warn("[DB ENCRYPTION] Failed to load key, generating new one:", err.message);
      }
    }

    // Generate new key
    this.key = this.generateKey();

    // Save encrypted key
    await this.saveKey(safeStorage);

    return this.key;
  }

  // Save the key encrypted
  async saveKey(safeStorage) {
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(this.key.toString("hex"));
        fs.writeFileSync(this.keyPath, encrypted);
      } else {
        // Fallback: store as hex (less secure)
        fs.writeFileSync(this.keyPath, this.key.toString("hex"));
        this.weakMode = true;
        logger.security.warn("╔══════════════════════════════════════════════════════════════╗");
        logger.security.warn("║  ⚠ WEAK MODE: DB encryption key stored as plaintext hex    ║");
        logger.security.warn("║  Data is at risk if an attacker gains file system access.  ║");
        logger.security.warn("║  Enable OS keychain (safeStorage) for secure encryption.   ║");
        logger.security.warn("╚══════════════════════════════════════════════════════════════╝");
      }
    } catch (err) {
      logger.security.error("[DB ENCRYPTION] Failed to save key:", err.message);
    }
  }

  // Encrypt a buffer
  encrypt(buffer) {
    if (!this.key) throw new Error("Encryption key not initialized");

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: IV (16) + AuthTag (16) + Encrypted Data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // Decrypt a buffer
  decrypt(encryptedBuffer) {
    if (!this.key) throw new Error("Encryption key not initialized");

    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted data: too short");
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
    } catch (err) {
      throw new Error("Decryption failed (wrong key or corrupted data)");
    }
  }

  // Encrypt the database file
  encryptDB(dbPath) {
    if (!fs.existsSync(dbPath)) return false;

    const dbBuffer = fs.readFileSync(dbPath);
    const encryptedBuffer = this.encrypt(dbBuffer);
    
    // Write encrypted file
    fs.writeFileSync(dbPath + ".enc", encryptedBuffer);
    
    // Remove unencrypted file
    fs.unlinkSync(dbPath);
    
    return true;
  }

  // Decrypt the database file
  decryptDB(dbPath) {
    const encPath = dbPath + ".enc";
    if (!fs.existsSync(encPath)) return false;

    const encryptedBuffer = fs.readFileSync(encPath);
    const dbBuffer = this.decrypt(encryptedBuffer);
    
    // Write decrypted file
    fs.writeFileSync(dbPath, dbBuffer);
    
    // Remove encrypted file
    fs.unlinkSync(encPath);
    
    return true;
  }

  // Check if database is encrypted
  isEncrypted(dbPath) {
    return fs.existsSync(dbPath + ".enc");
  }
}

const dbEncryption = new DBEncryption();

module.exports = { DBEncryption, dbEncryption };
