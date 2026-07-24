// electron/supabase.cjs
//
// PostgreSQL cloud sync layer for Orun OS.
// SQLite remains the local source of truth; PostgreSQL on Supabase is used for
// cross-device sync (desktop ↔ web, multiple machines, etc.).
//
// Reads DATABASE_URL from the project .env file.
// Sync is push-first: local changes are sent to Postgres every few minutes.

const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const logger = require("./logger.cjs");

let pool = null;
let syncInProgress = false;

// Tables that participate in cloud sync.
const SYNC_TABLES = [
  "conversations",
  "messages",
  "settings",
  "nutrition_log",
  "finance_log",
  "health_log",
  "developer_reviews",
  "teacher_progress",
  "video_projects",
  "image3d_generations",
  "music_projects",
];

// ── Load .env ────────────────────────────────────────────────────────────

function loadEnv() {
  // Walk up from __dirname to find .env at the project root.
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

// ── Init / connection ────────────────────────────────────────────────────

function init() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    pool = null;
    return false;
  }
  pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => {
    logger.db.error("[supabase] Unexpected idle client error:", err.message);
  });
  return true;
}

function isConnected() {
  return pool !== null;
}

async function testConnection() {
  if (!pool) return { ok: false, error: "PostgreSQL not configured" };
  try {
    const res = await pool.query("SELECT 1 AS ok");
    return res.rows[0]?.ok === 1 ? { ok: true } : { ok: false, error: "unexpected result" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Push: upload local outbox items to PostgreSQL ────────────────────────

async function push(localDb) {
  if (!pool) return { pushed: 0 };
  if (syncInProgress) return { pushed: 0, reason: "already in progress" };
  syncInProgress = true;

  try {
    const pending = localDb
      .prepare("SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 500")
      .all();

    if (pending.length === 0) return { pushed: 0 };

    // Group by table
    const grouped = {};
    for (const item of pending) {
      if (!grouped[item.table_name]) grouped[item.table_name] = [];
      grouped[item.table_name].push(item);
    }

    let totalPushed = 0;
    const client = await pool.connect();

    try {
      for (const [tableName, items] of Object.entries(grouped)) {
        if (!SYNC_TABLES.includes(tableName)) continue;

        const rows = items.map((i) => JSON.parse(i.payload));

        // Build a multi-row UPSERT: INSERT ... ON CONFLICT (id) DO UPDATE SET ...
        const cols = Object.keys(rows[0]);
        const colList = cols.join(", ");
        const placeholders = rows.map((_, ri) =>
          `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`
        ).join(", ");
        const updateCols = cols.filter((c) => c !== "id");
        const updateSet = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");

        const sql = `INSERT INTO "${tableName}" (${colList})
          VALUES ${placeholders}
          ON CONFLICT (id) DO UPDATE SET ${updateSet}`;

        const params = rows.flatMap((row) => cols.map((c) => row[c] ?? null));

        await client.query(sql, params);
        totalPushed += items.length;

        // Remove from outbox
        const ids = items.map((i) => i.id);
        const delPlaceholders = ids.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(`DELETE FROM sync_outbox WHERE id IN (${delPlaceholders})`, ids);
      }
    } finally {
      client.release();
    }

    return { pushed: totalPushed };
  } catch (err) {
    logger.db.error("[sync] push failed:", err.message);
    return { pushed: 0, error: err.message };
  } finally {
    syncInProgress = false;
  }
}

// ── Pull: download remote changes and merge into local SQLite ────────────

async function pull(localDb) {
  if (!pool) return { pulled: 0 };
  if (syncInProgress) return { pulled: 0, reason: "already in progress" };
  syncInProgress = true;

  try {
    let totalPulled = 0;
    const client = await pool.connect();

    try {
      for (const tableName of SYNC_TABLES) {
        const { rows: remoteRows } = await client.query(`SELECT * FROM "${tableName}"`);
        if (!remoteRows || remoteRows.length === 0) continue;

        const cols = Object.keys(remoteRows[0]);
        const placeholders = cols.map(() => "?").join(", ");
        const updateCols = cols.filter((c) => c !== "id");
        const updateClause = updateCols.map((c) => `${c} = excluded.${c}`).join(", ");

        const stmt = localDb.prepare(
          `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders})
           ON CONFLICT(id) DO UPDATE SET ${updateClause}`
        );

        const insertMany = localDb.transaction((rows) => {
          for (const row of rows) {
            stmt.run(...cols.map((c) => row[c]));
          }
        });

        insertMany(remoteRows);
        totalPulled += remoteRows.length;
      }
    } finally {
      client.release();
    }

    return { pulled: totalPulled };
  } catch (err) {
    logger.db.error("[sync] pull failed:", err.message);
    return { pulled: 0, error: err.message };
  } finally {
    syncInProgress = false;
  }
}

// ── Full bidirectional sync ──────────────────────────────────────────────

async function sync(localDb) {
  if (!pool) return { ok: false, error: "PostgreSQL not configured" };
  try {
    const pushResult = await push(localDb);
    const pullResult = await pull(localDb);
    return {
      ok: true,
      pushed: pushResult.pushed || 0,
      pulled: pullResult.pulled || 0,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Register a table row into the outbox (call after every local write) ──

function enqueue(localDb, tableName, row) {
  if (!SYNC_TABLES.includes(tableName)) return;
  try {
    localDb
      .prepare(
        `INSERT OR REPLACE INTO sync_outbox (id, table_name, payload, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(row.id || `${tableName}-${Date.now()}`, tableName, JSON.stringify(row), Date.now());
  } catch (err) {
    logger.db.error("[sync] enqueue failed:", err.message);
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  SYNC_TABLES,
  init,
  isConnected,
  testConnection,
  push,
  pull,
  sync,
  enqueue,
  close,
};
