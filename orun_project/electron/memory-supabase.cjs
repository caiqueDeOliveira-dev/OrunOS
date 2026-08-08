// electron/memory-supabase.cjs
//
// Cloud adapter opcional do Memory Engine → Supabase (tabela `memories`).
//
// Offline-first: desabilitado se DATABASE_URL ausente ou se a migration
// 0008 (pgvector + user_id nullable) não estiver aplicada. O capability check
// é feito uma vez e cacheado — até lá, o engine roda 100% local.

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const logger = require("./logger.cjs");

let pool = null;
let enabled = false;
let capabilityChecked = false;

function loadEnv() {
  const candidates = [
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", ".env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      require("dotenv").config({ path: p });
      return true;
    }
  }
  return false;
}

/** Verifica (uma vez) se o schema está pronto: coluna embedding + user_id nullable. */
async function ensureReady() {
  if (capabilityChecked) return enabled;
  capabilityChecked = true;
  try {
    loadEnv();
    if (!process.env.DATABASE_URL) return (enabled = false);

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      logger.db.error("[memory-supabase] idle client error:", err.message);
    });

    const res = await pool.query(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_name = 'memories'`
    );
    const cols = {};
    for (const c of res.rows) cols[c.column_name] = c.is_nullable === "YES";

    if (!cols.embedding) {
      logger.db.warn("[memory-supabase] coluna memories.embedding ausente (aplique a migration 0008_memory_engine.sql) — cloud desabilitado");
      return (enabled = false);
    }
    if (!cols.user_id) {
      logger.db.warn("[memory-supabase] coluna memories.user_id ausente — cloud desabilitado");
      return (enabled = false);
    }
    enabled = true;
    logger.db.info("[memory-supabase] cloud habilitado (memories.embedding pronto)");
  } catch (e) {
    logger.db.warn("[memory-supabase] capability check falhou:", e.message);
    enabled = false;
  }
  return enabled;
}

/** Upsert de uma memória local no Supabase (uid uuid = PK → ON CONFLICT (uid)). */
async function upsert(record) {
  if (!(await ensureReady())) return { ok: false, reason: "cloud indisponível" };
  try {
    const {
      uid, id, key, content, tags = [], scopeAgent = null, scopeProject = null,
      source = "manual", embedding = null, created_at, updated_at,
    } = record;
    const rowId = uid || id;
    const embeddingLiteral = Array.isArray(embedding) ? `[${embedding.join(",")}]` : null;
    await pool.query(
      `INSERT INTO memories
         (id, key, content, tags, scope_agent, scope_project, source, embedding, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::vector, $9, $10, NULL)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         tags = EXCLUDED.tags,
         scope_agent = EXCLUDED.scope_agent,
         scope_project = EXCLUDED.scope_project,
         source = EXCLUDED.source,
         embedding = EXCLUDED.embedding,
         updated_at = EXCLUDED.updated_at`,
      [
        rowId, key, content, JSON.stringify(tags),
        scopeAgent, scopeProject, source, embeddingLiteral,
        new Date(created_at).toISOString(), new Date(updated_at).toISOString(),
      ]
    );
    return { ok: true };
  } catch (e) {
    logger.db.warn("[memory-supabase] upsert falhou:", e.message);
    return { ok: false, error: e.message };
  }
}

/** Marca deleted_at em vez de apagar (soft delete). */
async function remove(id) {
  if (!(await ensureReady())) return { ok: false, reason: "cloud indisponível" };
  try {
    await pool.query("UPDATE memories SET deleted_at = now() WHERE id = $1", [id]);
    return { ok: true };
  } catch (e) {
    logger.db.warn("[memory-supabase] remove falhou:", e.message);
    return { ok: false, error: e.message };
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  capabilityChecked = false;
  enabled = false;
}

module.exports = { ensureReady, upsert, remove, close, isEnabled: () => enabled };
