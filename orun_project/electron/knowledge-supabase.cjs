// electron/knowledge-supabase.cjs
//
// Cloud adapter opcional do Knowledge Engine → Supabase (tabela `documents`,
// migration 0009). Offline-first: desabilitado se DATABASE_URL ausente ou a
// tabela não existir. Capability check uma vez, cacheado.

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

/** Verifica (uma vez) se a tabela `documents` existe. */
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
      logger.db.error("[knowledge-supabase] idle client error:", err.message);
    });

    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'documents'`
    );
    const cols = res.rows.map((c) => c.column_name);
    if (!cols.includes("title") || !cols.includes("content") || !cols.includes("kind")) {
      logger.db.warn("[knowledge-supabase] tabela documents ausente/incompleta (aplique a migration 0009_knowledge_engine.sql) — cloud desabilitado");
      return (enabled = false);
    }
    enabled = true;
    logger.db.info("[knowledge-supabase] cloud habilitado (documents pronto)");
  } catch (e) {
    logger.db.warn("[knowledge-supabase] capability check falhou:", e.message);
    enabled = false;
  }
  return enabled;
}

/** Upsert de um documento local no Supabase (uid uuid = PK → ON CONFLICT (id)). */
async function upsert(record) {
  if (!(await ensureReady())) return { ok: false, reason: "cloud indisponível" };
  try {
    const { uid, id, kind = "note", title, content, tags = [], metadata = {}, date, created_at, updated_at } = record;
    const rowId = uid || id;
    await pool.query(
      `INSERT INTO documents
         (id, device_id, kind, title, content, tags, metadata, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, NULL)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         tags = EXCLUDED.tags,
         metadata = EXCLUDED.metadata,
         updated_at = EXCLUDED.updated_at`,
      [
        rowId, null, kind, title, content,
        JSON.stringify(tags), JSON.stringify(metadata),
        new Date(created_at).toISOString(), new Date(updated_at).toISOString(),
      ]
    );
    return { ok: true };
  } catch (e) {
    logger.db.warn("[knowledge-supabase] upsert falhou:", e.message);
    return { ok: false, error: e.message };
  }
}

/** Soft delete (marca deleted_at). */
async function remove(id) {
  if (!(await ensureReady())) return { ok: false, reason: "cloud indisponível" };
  try {
    await pool.query("UPDATE documents SET deleted_at = now() WHERE id = $1", [id]);
    return { ok: true };
  } catch (e) {
    logger.db.warn("[knowledge-supabase] remove falhou:", e.message);
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
