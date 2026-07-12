// electron/db.cjs
//
// Local-first persistence for Orun OS using SQLite (via better-sqlite3).
// Everything lives in a single file inside the user's app-data folder, so
// it survives restarts and never touches the network.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let db;

function init(userDataPath) {
  const dbPath = path.join(userDataPath, "orun-os.sqlite3");
  fs.mkdirSync(userDataPath, { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

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
  `);

  // Migration for DBs created before the "agent" column existed.
  const cols = db.prepare(`PRAGMA table_info(conversations)`).all();
  if (!cols.some((c) => c.name === "agent")) {
    db.exec(`ALTER TABLE conversations ADD COLUMN agent TEXT`);
  }

  return db;
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
  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(message.id, conversationId, message.role, message.content, Date.now());
  db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(
    Date.now(),
    conversationId
  );
}

/** Deletes a message and everything after it in the same conversation — used by "edit message". */
function truncateFrom(conversationId, messageId) {
  const target = db.prepare(`SELECT rowid FROM messages WHERE id = ?`).get(messageId);
  if (!target) return;
  db.prepare(`DELETE FROM messages WHERE conversation_id = ? AND rowid >= ?`).run(conversationId, target.rowid);
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
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(conversationId);
}

// ── Settings ─────────────────────────────────────────────────────────────

function getSetting(key, fallback) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? JSON.parse(row.value) : fallback;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(value));
}

// ── Usage tracking ───────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, local process TZ
}

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

// ── Nutrition log ────────────────────────────────────────────────────────

function recordMeal(entry) {
  db.prepare(
    `INSERT INTO nutrition_log (id, date, description, calories, protein_g, carbs_g, fat_g, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.description, entry.calories ?? null, entry.protein_g ?? null, entry.carbs_g ?? null, entry.fat_g ?? null, entry.source || "app", Date.now());
}

function getDailyNutrition(date = todayKey()) {
  const rows = db.prepare(`SELECT * FROM nutrition_log WHERE date = ? ORDER BY created_at ASC`).all(date);
  const totals = rows.reduce(
    (acc, r) => ({
      calories: acc.calories + (r.calories || 0),
      protein_g: acc.protein_g + (r.protein_g || 0),
      carbs_g: acc.carbs_g + (r.carbs_g || 0),
      fat_g: acc.fat_g + (r.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  return { entries: rows, totals };
}

// ── Finance log ───────────────────────────────────────────────────────

function recordExpense(entry) {
  db.prepare(
    `INSERT INTO finance_log (id, date, description, amount, currency, category, type, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.description, entry.amount, entry.currency || "USD", entry.category || null, entry.type || "expense", entry.source || "app", Date.now());
}

function getDailyFinance(date = todayKey()) {
  const rows = db.prepare(`SELECT * FROM finance_log WHERE date = ? ORDER BY created_at ASC`).all(date);
  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + (r.type === "income" ? (r.amount || 0) : 0),
      expenses: acc.expenses + (r.type === "expense" ? (r.amount || 0) : 0),
    }),
    { income: 0, expenses: 0 }
  );
  return { entries: rows, totals, balance: totals.income - totals.expenses };
}

// ── Health log ────────────────────────────────────────────────────────

function recordHealthMetric(entry) {
  db.prepare(
    `INSERT INTO health_log (id, date, metric, value, unit, notes, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.metric, entry.value, entry.unit || null, entry.notes || null, entry.source || "app", Date.now());
}

function getDailyHealth(date = todayKey()) {
  return db.prepare(`SELECT * FROM health_log WHERE date = ? ORDER BY created_at ASC`).all(date);
}

// ── Developer reviews ────────────────────────────────────────────────

function recordReview(entry) {
  db.prepare(
    `INSERT INTO developer_reviews (id, date, repo, file_path, summary, issues_found, severity, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.repo || null, entry.file_path || null, entry.summary, entry.issues_found || 0, entry.severity || null, entry.source || "app", Date.now());
}

function getDailyReviews(date = todayKey()) {
  return db.prepare(`SELECT * FROM developer_reviews WHERE date = ? ORDER BY created_at ASC`).all(date);
}

// ── Teacher progress ────────────────────────────────────────────────

function recordProgress(entry) {
  db.prepare(
    `INSERT INTO teacher_progress (id, date, subject, topic, status, score, notes, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.subject, entry.topic, entry.status || "learning", entry.score ?? null, entry.notes || null, entry.source || "app", Date.now());
}

function getDailyProgress(date = todayKey()) {
  return db.prepare(`SELECT * FROM teacher_progress WHERE date = ? ORDER BY created_at ASC`).all(date);
}

module.exports = {
  init,
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
  recordMeal,
  getDailyNutrition,
  recordExpense,
  getDailyFinance,
  recordHealthMetric,
  getDailyHealth,
  recordReview,
  getDailyReviews,
  recordProgress,
  getDailyProgress,
};
