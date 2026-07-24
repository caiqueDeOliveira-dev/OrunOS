const path = require("path");
const fs = require("fs");
const logger = require("../logger.cjs");
let Database;
try {
  Database = require("better-sqlite3-multiple-ciphers");
} catch {
  Database = require("better-sqlite3");
}

let db;
let currentDbPath;

function todayKey(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function init(userDataPath, encryptionKey) {
  if (db) return db;
  const dbPath = path.join(userDataPath, "orun-os.sqlite3");
  currentDbPath = dbPath;
  fs.mkdirSync(userDataPath, { recursive: true });

  function openDb(filePath) {
    const d = new Database(filePath);
    if (encryptionKey) {
      try {
        d.prepare("SELECT count(*) FROM sqlite_master").get();
      } catch {
        try {
          d.pragma(`key = '${encryptionKey.replace(/'/g, "''")}'`);
          d.prepare("SELECT count(*) FROM sqlite_master").get();
        } catch {
          try {
            d.pragma(`rekey = '${encryptionKey.replace(/'/g, "''")}'`);
          } catch { /* ignore — will work on next restart */ }
        }
      }
    }
    d.pragma("journal_mode = WAL");
    d.pragma("synchronous = NORMAL");
    d.pragma("busy_timeout = 5000");
    d.pragma("cache_size = -8000"); // 8MB cache
    d.pragma("foreign_keys = ON");
    return d;
  }

  try {
    db = openDb(dbPath);
  } catch (err) {
    const isCorrupt = /unsupported file format|file is not a database|not a database/i.test(err.message);
    if (!isCorrupt) throw err;
    logger.db.error("[db] Database corrupted, recreating:", err.message);
    try { db.close(); } catch { /* may not be open */ }
    for (const ext of ["", "-wal", "-shm"]) {
      try { fs.unlinkSync(dbPath + ext); } catch { /* ignore */ }
    }
    db = openDb(dbPath);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New chat',
      agent TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- Full-text search index for conversation messages
    CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
      content,
      content=messages,
      content_rowid=rowid
    );

    -- Triggers to keep FTS index in sync
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO conversations_fts(rowid, content) VALUES (new.rowid, new.content);
    END;
    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO conversations_fts(conversations_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END;
    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO conversations_fts(conversations_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO conversations_fts(rowid, content) VALUES (new.rowid, new.content);
    END;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage (
      provider TEXT NOT NULL,
      date TEXT NOT NULL,
      requests INTEGER NOT NULL DEFAULT 0,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (provider, date)
    );

    CREATE TABLE IF NOT EXISTS tts_usage (
      engine TEXT NOT NULL,
      date TEXT NOT NULL,
      requests INTEGER NOT NULL DEFAULT 0,
      characters INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (engine, date)
    );

    CREATE TABLE IF NOT EXISTS nutrition_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      calories INTEGER,
      protein_g INTEGER,
      carbs_g INTEGER,
      fat_g INTEGER,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finance_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT,
      type TEXT NOT NULL DEFAULT 'expense',
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developer_reviews (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      repo TEXT,
      file_path TEXT,
      summary TEXT NOT NULL,
      issues_found INTEGER DEFAULT 0,
      severity TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teacher_progress (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'learning',
      score INTEGER,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS video_projects (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      template TEXT,
      resolution TEXT DEFAULT '1920x1080',
      fps INTEGER DEFAULT 30,
      duration_sec REAL,
      status TEXT NOT NULL DEFAULT 'draft',
      output_path TEXT,
      render_time_ms INTEGER,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS image3d_generations (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      engine TEXT NOT NULL,
      prompt TEXT NOT NULL,
      model_used TEXT,
      output_url TEXT,
      width INTEGER,
      height INTEGER,
      generation_time_ms INTEGER,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS music_projects (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      engine TEXT NOT NULL,
      genre TEXT,
      duration_sec REAL,
      bpm INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      output_url TEXT,
      effects_applied TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_goals (
      id TEXT PRIMARY KEY,
      target_weight_kg REAL,
      target_height_cm REAL,
      current_weight_kg REAL,
      current_height_cm REAL,
      start_weight_kg REAL,
      start_date TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_agenda (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      time TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketing_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      campaign_name TEXT,
      objective TEXT,
      channels TEXT,
      target_audience TEXT,
      budget_estimate TEXT,
      timeline TEXT,
      kpis TEXT,
      content_ideas TEXT,
      platform TEXT,
      format TEXT,
      caption TEXT,
      hashtags TEXT,
      post_url TEXT,
      engagement TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      created_at INTEGER NOT NULL
    );
  `);

  const cols = db.prepare(`PRAGMA table_info(conversations)`).all();
  if (!cols.some((c) => c.name === "agent")) {
    db.exec(`ALTER TABLE conversations ADD COLUMN agent TEXT`);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_log(date);
    CREATE INDEX IF NOT EXISTS idx_finance_date ON finance_log(date);
    CREATE INDEX IF NOT EXISTS idx_health_date ON health_log(date);
    CREATE INDEX IF NOT EXISTS idx_health_metric ON health_log(metric);
    CREATE INDEX IF NOT EXISTS idx_developer_date ON developer_reviews(date);
    CREATE INDEX IF NOT EXISTS idx_teacher_date ON teacher_progress(date);
    CREATE INDEX IF NOT EXISTS idx_video_date ON video_projects(date);
    CREATE INDEX IF NOT EXISTS idx_image3d_date ON image3d_generations(date);
    CREATE INDEX IF NOT EXISTS idx_music_date ON music_projects(date);
    CREATE INDEX IF NOT EXISTS idx_agenda_date ON daily_agenda(date);
    CREATE INDEX IF NOT EXISTS idx_marketing_date ON marketing_log(date);
  `);

  // ── Schema versioning ─────────────────────────────────────────────
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL, applied_at INTEGER NOT NULL)`);
  const currentVersion = getSchemaVersion();
  const LATEST_VERSION = 1;

  if (currentVersion < LATEST_VERSION) {
    runMigrations(currentVersion, LATEST_VERSION);
  }

  return db;
}

function getSchemaVersion() {
  try {
    const row = db.prepare(`SELECT MAX(version) as v FROM schema_version`).get();
    return row?.v || 0;
  } catch {
    return 0;
  }
}

function runMigrations(fromVersion, toVersion) {
  const migrations = {
    // Add new migrations here: 1: () => { db.exec(...) }
  };

  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const migration = migrations[v];
    if (migration) {
      migration();
      db.prepare(`INSERT INTO schema_version (version, applied_at) VALUES (?, ?)`).run(v, Date.now());
    }
  }
}

function getDb() {
  return db;
}

function getDbPath() {
  return currentDbPath;
}

// ── Conversations / messages ────────────────────────────────────────────

function createConversation(id, title, agent = null) {
  const now = Date.now();
  db.prepare(
    `INSERT INTO conversations (id, title, agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, title || "New chat", agent, now, now);
  return { id, title: title || "New chat", agent, created_at: now, updated_at: now };
}

function addMessage(conversationId, message) {
  const insertMsg = db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`
  );
  const updateConvo = db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`);
  const txn = db.transaction(() => {
    insertMsg.run(message.id, conversationId, message.role, message.content, Date.now());
    updateConvo.run(Date.now(), conversationId);
  });
  txn();
}

function truncateFrom(conversationId, messageId) {
  const txn = db.transaction(() => {
    const target = db.prepare(`SELECT rowid FROM messages WHERE id = ?`).get(messageId);
    if (!target) return;
    db.prepare(`DELETE FROM messages WHERE conversation_id = ? AND rowid >= ?`).run(conversationId, target.rowid);
  });
  txn();
}

function listConversations(agent) {
  if (agent === undefined) return db.prepare(`SELECT * FROM conversations ORDER BY updated_at DESC`).all();
  if (agent === null) return db.prepare(`SELECT * FROM conversations WHERE agent IS NULL ORDER BY updated_at DESC`).all();
  return db.prepare(`SELECT * FROM conversations WHERE agent = ? ORDER BY updated_at DESC`).all(agent);
}

function getMessages(conversationId) {
  return db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY rowid ASC`
    )
    .all(conversationId);
}

function deleteConversation(conversationId) {
  const txn = db.transaction(() => {
    db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(conversationId);
    db.prepare(`DELETE FROM conversations WHERE id = ?`).run(conversationId);
  });
  txn();
}

// ── Settings ─────────────────────────────────────────────────────────────

function getSetting(key, fallback) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(value));
}

// ── Usage tracking ───────────────────────────────────────────────────────

function recordUsage(provider, tokensIn = 0, tokensOut = 0) {
  const date = todayKey();
  db.prepare(
    `INSERT INTO usage (provider, date, requests, tokens_in, tokens_out) VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(provider, date) DO UPDATE SET
       requests = requests + 1,
       tokens_in = tokens_in + excluded.tokens_in,
       tokens_out = tokens_out + excluded.tokens_out`
  ).run(provider, date, tokensIn, tokensOut);
}

function getUsageToday() {
  return db.prepare(`SELECT * FROM usage WHERE date = ?`).all(todayKey());
}

function recordTTSUsage(engine, characters) {
  const date = todayKey();
  db.prepare(
    `INSERT INTO tts_usage (engine, date, requests, characters) VALUES (?, ?, 1, ?)
     ON CONFLICT(engine, date) DO UPDATE SET
       requests = requests + 1,
       characters = characters + excluded.characters`
  ).run(engine, date, characters);
}

function getTTSUsageToday() {
  return db.prepare(`SELECT * FROM tts_usage WHERE date = ?`).all(todayKey());
}

function getUsageRange(startDate, endDate) {
  return db.prepare("SELECT * FROM usage WHERE date >= ? AND date <= ? ORDER BY date ASC").all(startDate, endDate);
}

module.exports = {
  init,
  getDb,
  getDbPath,
  todayKey,
  createConversation,
  addMessage,
  truncateFrom,
  listConversations,
  getMessages,
  deleteConversation,
  getSetting,
  setSetting,
  recordUsage,
  getUsageToday,
  recordTTSUsage,
  getTTSUsageToday,
  getUsageRange,
};
