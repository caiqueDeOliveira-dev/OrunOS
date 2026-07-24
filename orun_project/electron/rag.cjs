// electron/rag.cjs
//
// Simple RAG (Retrieval Augmented Generation) with local embeddings.
// Uses Ollama nomic-embed-text for embeddings.
// Falls back to simple text search if Ollama is not available.

const fs = require("fs");
const path = require("path");
const log = require("electron-log");

let vectorsPath = null;
let ollamaBaseUrl = "http://localhost:11434";
let vectorsCache = null;
let vectorsCacheTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds

function init(userDataPath, ollamaUrl) {
  vectorsPath = path.join(userDataPath, "rag-vectors.json");
  if (ollamaUrl) ollamaBaseUrl = ollamaUrl;
}

function loadVectors() {
  if (!vectorsPath) return [];
  const now = Date.now();
  if (vectorsCache && (now - vectorsCacheTime) < CACHE_TTL_MS) return vectorsCache;
  try {
    vectorsCache = JSON.parse(fs.readFileSync(vectorsPath, "utf8"));
    vectorsCacheTime = now;
    return vectorsCache;
  } catch { return []; }
}

function saveVectors(vectors) {
  if (!vectorsPath) return;
  vectorsCache = vectors;
  vectorsCacheTime = Date.now();
  fs.writeFileSync(vectorsPath, JSON.stringify(vectors, null, 2));
}

async function getEmbedding(text) {
  try {
    const http = require("http");
    const url = `${ollamaBaseUrl}/api/embed`;
    const body = JSON.stringify({ model: "nomic-embed-text", input: text });
    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 10000,
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const embedding = parsed.embeddings?.[0] || parsed.embedding;
            if (embedding && Array.isArray(embedding)) resolve(embedding);
            else reject(new Error("No embedding in response"));
          } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Ollama timeout")); });
      req.write(body);
      req.end();
    });
  } catch (e) {
    log.warn("[rag] embedding failed:", e.message);
    return null;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function save(id, content, metadata = {}, tags = []) {
  const vectors = loadVectors();
  const embedding = await getEmbedding(content);
  const entry = {
    id,
    content,
    metadata,
    tags,
    embedding,
    created_at: Date.now(),
  };
  const existing = vectors.findIndex((v) => v.id === id);
  if (existing >= 0) vectors[existing] = entry;
  else vectors.push(entry);
  saveVectors(vectors);
  return { success: true, hasEmbedding: !!embedding };
}

async function search(query, topK = 5, tags = []) {
  const vectors = loadVectors();
  if (vectors.length === 0) return { results: [], method: "empty" };

  const queryEmbedding = await getEmbedding(query);

  if (queryEmbedding) {
    // Semantic search via cosine similarity
    let filtered = vectors;
    if (tags.length > 0) {
      filtered = vectors.filter((v) => tags.some((t) => v.tags.includes(t)));
    }
    const scored = filtered
      .filter((v) => v.embedding)
      .map((v) => ({ ...v, score: cosineSimilarity(queryEmbedding, v.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return { results: scored, method: "semantic" };
  }

  // Fallback: text search
  const q = query.toLowerCase();
  const scored = vectors
    .map((v) => ({
      ...v,
      score: v.content.toLowerCase().includes(q) ? 0.5 : (v.tags.some((t) => t.toLowerCase().includes(q)) ? 0.3 : 0),
    }))
    .filter((v) => v.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return { results: scored, method: "text-fallback" };
}

function remove(id) {
  const vectors = loadVectors();
  const filtered = vectors.filter((v) => v.id !== id);
  saveVectors(filtered);
  return { success: true, removed: vectors.length - filtered.length };
}

function stats() {
  const vectors = loadVectors();
  const withEmbedding = vectors.filter((v) => v.embedding).length;
  return { total: vectors.length, withEmbedding, sizeKB: Math.round(JSON.stringify(vectors).length / 1024) };
}

module.exports = { init, save, search, remove, stats };
