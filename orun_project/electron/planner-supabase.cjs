// electron/planner-supabase.cjs
//
// Cloud adapter opcional do Planner Engine → Supabase (tabela `planner_tasks`,
// migration 0010). Offline-first: desabilitado se DATABASE_URL ausente ou a
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

/** Verifica (uma vez) se a tabela `planner_tasks` existe. */
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
      logger.db.error("[planner-supabase] idle client error:", err.message);
    });

    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'planner_tasks'`
    );
    const cols = res.rows.map((c) => c.column_name);
    if (!cols.includes("title") || !cols.includes("status")) {
      logger.db.warn("[planner-supabase] tabela planner_tasks ausente (aplique a migration 0010_planner_engine.sql) — cloud desabilitado");
      return (enabled = false);
    }
    enabled = true;
    logger.db.info("[planner-supabase] cloud habilitado (planner_tasks pronto)");
  } catch (e) {
    logger.db.warn("[planner-supabase] capability check falhou:", e.message);
    enabled = false;
  }
  return enabled;
}

/** Upsert de uma tarefa local no Supabase (uid uuid = PK → ON CONFLICT (id)). */
async function upsert(task) {
  if (!(await ensureReady())) return { ok: false, reason: "cloud indisponível" };
  try {
    const {
      uid, id, goalId = "default", title, description = "", agent = null,
      status = "pending", priority = 3, dependencies = [], result = null, error = null,
      created_at, updated_at, started_at = null, completed_at = null,
    } = task;
    const rowId = uid || id;
    await pool.query(
      `INSERT INTO planner_tasks
         (id, device_id, goal_id, title, description, agent, status, priority,
          dependencies, result, error, created_at, updated_at, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         goal_id = EXCLUDED.goal_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         agent = EXCLUDED.agent,
         status = EXCLUDED.status,
         priority = EXCLUDED.priority,
         dependencies = EXCLUDED.dependencies,
         result = EXCLUDED.result,
         error = EXCLUDED.error,
         updated_at = EXCLUDED.updated_at,
         started_at = EXCLUDED.started_at,
         completed_at = EXCLUDED.completed_at`,
      [
        rowId, null, goalId, title, description, agent, status, priority,
        JSON.stringify(dependencies), result, error,
        new Date(created_at).toISOString(), new Date(updated_at).toISOString(),
        started_at ? new Date(started_at).toISOString() : null,
        completed_at ? new Date(completed_at).toISOString() : null,
      ]
    );
    return { ok: true };
  } catch (e) {
    logger.db.warn("[planner-supabase] upsert falhou:", e.message);
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

module.exports = { ensureReady, upsert, close, isEnabled: () => enabled };
