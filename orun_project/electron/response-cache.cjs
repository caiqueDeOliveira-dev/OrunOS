// electron/response-cache.cjs
//
// Simple LRU response cache for Orun OS.
// Caches AI responses by content hash to avoid redundant API calls.

const crypto = require("crypto");

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 200;

class ResponseCache {
  constructor(ttlMs = DEFAULT_TTL_MS, maxEntries = MAX_ENTRIES) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.cache = new Map(); // key -> { response, timestamp }
    this.hits = 0;
    this.misses = 0;
  }

  _hash(content) {
    return crypto.createHash("sha256").update(content.toLowerCase().trim()).digest("hex").slice(0, 16);
  }

  get(userMessage, agentId) {
    const key = `${agentId || "hampton"}:${this._hash(userMessage)}`;
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.response;
  }

  set(userMessage, agentId, response) {
    const key = `${agentId || "hampton"}:${this._hash(userMessage)}`;
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats() {
    return {
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? Math.round((this.hits / (this.hits + this.misses)) * 100) : 0,
    };
  }
}

const responseCache = new ResponseCache();

module.exports = { ResponseCache, responseCache };
