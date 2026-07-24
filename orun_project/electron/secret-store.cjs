// electron/secret-store.cjs
//
// Encrypted secret storage for Orun OS.
// Manages API keys using safeStorage (OS keyring) with AES-256-GCM fallback.

const crypto = require("crypto");
const AES_ALGO = "aes-256-gcm";
const AES_PREFIX = "$v2$";
const SECRET_CACHE_TTL = 5000;

let _app = null;
let _fs = null;
let _secretCache = null;
let _secretCacheTime = 0;

function init(app, fs) {
  _app = app;
  _fs = fs;
}

function getKeysFile() {
  return _fs ? require("path").join(_app.getPath("userData"), "keys.enc.json") : "";
}

function getDBKeyFile() {
  return _fs ? require("path").join(_app.getPath("userData"), "db.key.enc") : "";
}

function getMachineKey() {
  const seed = `orun-os:${require("os").hostname()}:${_app.getPath("userData")}`;
  return crypto.createHash("sha256").update(seed).digest();
}

function aesEncrypt(plaintext) {
  const key = getMachineKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return AES_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function aesDecrypt(encoded) {
  const raw = Buffer.from(encoded.slice(AES_PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const key = getMachineKey();
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}

function getOrCreateDBKey() {
  const { safeStorage } = require("electron");
  const keyPath = getDBKeyFile();
  try {
    const encrypted = _fs.readFileSync(keyPath);
    const b64 = encrypted.toString();
    if (b64.startsWith(AES_PREFIX)) return aesDecrypt(b64);
    return safeStorage.decryptString(Buffer.from(b64, "base64"));
  } catch {
    const { randomUUID } = require("crypto");
    const key = `orun-${randomUUID()}-${Date.now()}`;
    try {
      _fs.writeFileSync(keyPath, safeStorage.encryptString(key).toString("base64"));
    } catch {
      try { _fs.writeFileSync(keyPath, aesEncrypt(key)); } catch (e) { /* failed */ }
    }
    return key;
  }
}

function readSecretStore() {
  if (_secretCache && (Date.now() - _secretCacheTime) < SECRET_CACHE_TTL) return _secretCache;
  const { safeStorage } = require("electron");
  try {
    const raw = _fs.readFileSync(getKeysFile());
    const parsed = JSON.parse(raw.toString());
    const out = {};
    let migrated = false;
    for (const [slot, encoded] of Object.entries(parsed)) {
      try {
        if (typeof encoded === "string" && encoded.startsWith(AES_PREFIX)) {
          out[slot] = aesDecrypt(encoded);
        } else {
          try {
            out[slot] = safeStorage.decryptString(Buffer.from(encoded, "base64"));
          } catch {
            try { out[slot] = aesDecrypt(encoded); } catch { continue; }
          }
        }
      } catch { /* skip slot */ }
    }
    for (const [slot, encoded] of Object.entries(parsed)) {
      if (typeof encoded === "string" && !encoded.startsWith(AES_PREFIX) && out[slot]) {
        try { parsed[slot] = aesEncrypt(out[slot]); migrated = true; } catch {}
      }
    }
    if (migrated) { try { _fs.writeFileSync(getKeysFile(), JSON.stringify(parsed, null, 2)); } catch {} }
    _secretCache = out;
    _secretCacheTime = Date.now();
    return out;
  } catch { return {}; }
}

function writeSecret(slot, value) {
  try {
    _secretCache = null;
    const store = _fs.existsSync(getKeysFile()) ? JSON.parse(_fs.readFileSync(getKeysFile()).toString()) : {};
    const { safeStorage } = require("electron");
    try { store[slot] = safeStorage.encryptString(value).toString("base64"); }
    catch { store[slot] = aesEncrypt(value); }
    _fs.writeFileSync(getKeysFile(), JSON.stringify(store, null, 2));
    return true;
  } catch { return false; }
}

// ── Convenience API for spotify/discord handlers ─────────────────────────

async function get(slot) {
  const store = readSecretStore();
  const raw = store[slot];
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

async function set(slot, value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return writeSecret(slot, serialized);
}

async function del(slot) {
  try {
    _secretCache = null;
    const keysFile = getKeysFile();
    if (!_fs.existsSync(keysFile)) return true;
    const store = JSON.parse(_fs.readFileSync(keysFile).toString());
    delete store[slot];
    _fs.writeFileSync(keysFile, JSON.stringify(store, null, 2));
    return true;
  } catch { return false; }
}

module.exports = { init, getOrCreateDBKey, readSecretStore, writeSecret, aesEncrypt, aesDecrypt, get, set, delete: del };
