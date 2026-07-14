// electron/db.cjs
//
// Local-first persistence for Orun OS using SQLite (via better-sqlite3).
// Everything lives in a single file inside the user's app-data folder, so
// it survives restarts and never touches the network.

const path = require("path");
const fs = require("fs");
let Database;
try {
  Database = require("better-sqlite3-multiple-ciphers");
} catch {
  Database = require("better-sqlite3");
}

let db;

function init(userDataPath, encryptionKey) {
  const dbPath = path.join(userDataPath, "orun-os.sqlite3");
  fs.mkdirSync(userDataPath, { recursive: true });

  function openDb(filePath) {
    const d = new Database(filePath);
    if (encryptionKey) {
      // Check if the DB is already readable (not encrypted) before applying a key.
      try {
        d.prepare("SELECT count(*) FROM sqlite_master").get();
        // DB opened without a key — it is not encrypted. Nothing to do.
      } catch {
        // DB needs a key — either decrypt or encrypt for the first time.
        try {
          d.pragma(`key = '${encryptionKey.replace(/'/g, "''")}'`);
          d.prepare("SELECT count(*) FROM sqlite_master").get();
        } catch {
          // First run — the DB was created unencrypted; encrypt it now.
          try {
            d.pragma(`rekey = '${encryptionKey.replace(/'/g, "''")}'`);
          } catch { /* ignore — will work on next restart */ }
        }
      }
    }
    d.pragma("journal_mode = WAL");
    return d;
  }

  try {
    db = openDb(dbPath);
  } catch (err) {
    const isCorrupt = /unsupported file format|file is not a database|not a database/i.test(err.message);
    if (!isCorrupt) throw err;
    console.error("[db] Database corrupted, recreating:", err.message);
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

// ── Video projects ──────────────────────────────────────────────────

function recordVideoProject(entry) {
  db.prepare(
    `INSERT INTO video_projects (id, date, title, template, resolution, fps, duration_sec, status, output_path, render_time_ms, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.title, entry.template || null, entry.resolution || "1920x1080", entry.fps || 30, entry.duration_sec ?? null, entry.status || "draft", entry.output_path || null, entry.render_time_ms ?? null, entry.source || "app", Date.now());
}

function updateVideoProject(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE video_projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

function getDailyVideoProjects(date = todayKey()) {
  return db.prepare(`SELECT * FROM video_projects WHERE date = ? ORDER BY created_at ASC`).all(date);
}

// ── Image / 3D generations ─────────────────────────────────────────

function recordImage3DGeneration(entry) {
  db.prepare(
    `INSERT INTO image3d_generations (id, date, engine, prompt, model_used, output_url, width, height, generation_time_ms, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.engine, entry.prompt, entry.model_used || null, entry.output_url || null, entry.width ?? null, entry.height ?? null, entry.generation_time_ms ?? null, entry.source || "app", Date.now());
}

function getDailyImage3DGenerations(date = todayKey()) {
  return db.prepare(`SELECT * FROM image3d_generations WHERE date = ? ORDER BY created_at ASC`).all(date);
}

// ── Music projects ──────────────────────────────────────────────────

function recordMusicProject(entry) {
  db.prepare(
    `INSERT INTO music_projects (id, date, title, engine, genre, duration_sec, bpm, status, output_url, effects_applied, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.title, entry.engine, entry.genre || null, entry.duration_sec ?? null, entry.bpm ?? null, entry.status || "draft", entry.output_url || null, entry.effects_applied || null, entry.source || "app", Date.now());
}

function updateMusicProject(id, fields) {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE music_projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

function getDailyMusicProjects(date = todayKey()) {
  return db.prepare(`SELECT * FROM music_projects WHERE date = ? ORDER BY created_at ASC`).all(date);
}

// ── Health goals & weight tracking ───────────────────────────────────

function saveHealthGoals(goals) {
  const existing = db.prepare(`SELECT id FROM health_goals LIMIT 1`).get();
  const now = Date.now();
  if (existing) {
    db.prepare(`UPDATE health_goals SET target_weight_kg=?, target_height_cm=?, current_weight_kg=?, current_height_cm=?, start_weight_kg=?, start_date=?, notes=?, updated_at=? WHERE id=?`)
      .run(goals.target_weight_kg ?? null, goals.target_height_cm ?? null, goals.current_weight_kg ?? null, goals.current_height_cm ?? null, goals.start_weight_kg ?? null, goals.start_date || null, goals.notes || null, now, existing.id);
  } else {
    db.prepare(`INSERT INTO health_goals (id, target_weight_kg, target_height_cm, current_weight_kg, current_height_cm, start_weight_kg, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(`hg-${Date.now()}`, goals.target_weight_kg ?? null, goals.target_height_cm ?? null, goals.current_weight_kg ?? null, goals.current_height_cm ?? null, goals.start_weight_kg ?? null, goals.start_date || null, goals.notes || null, now, now);
  }
}

function getHealthGoals() {
  return db.prepare(`SELECT * FROM health_goals LIMIT 1`).get() || null;
}

function getWeeklyWeightComparison() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);

  const latest = db.prepare(`SELECT value, date FROM health_log WHERE metric = 'peso' ORDER BY created_at DESC LIMIT 1`).get();
  const weekAgoEntry = db.prepare(`SELECT value, date FROM health_log WHERE metric = 'peso' AND date <= ? ORDER BY created_at DESC LIMIT 1`).get(weekAgo);

  const goals = getHealthGoals();
  const diffKg = latest && weekAgoEntry ? (latest.value - weekAgoEntry.value) : null;
  const totalLost = latest && goals?.start_weight_kg ? (goals.start_weight_kg - latest.value) : null;

  return {
    current: latest ? { weight: latest.value, date: latest.date } : null,
    lastWeek: weekAgoEntry ? { weight: weekAgoEntry.value, date: weekAgoEntry.date } : null,
    weeklyChange: diffKg != null ? Math.round(diffKg * 100) / 100 : null,
    totalLost: totalLost != null ? Math.round(totalLost * 100) / 100 : null,
    goals: goals ? { target: goals.target_weight_kg, start: goals.start_weight_kg } : null,
  };
}

function saveDailyAgenda(entry) {
  db.prepare(`INSERT INTO daily_agenda (id, date, title, description, time, completed, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(entry.id || `da-${Date.now()}`, entry.date || todayKey(), entry.title, entry.description || null, entry.time || null, entry.completed ? 1 : 0, entry.source || "app", Date.now());
}

function getDailyAgenda(date = todayKey()) {
  return db.prepare(`SELECT * FROM daily_agenda WHERE date = ? ORDER BY time ASC`).all(date);
}

function clearDailyAgenda(date = todayKey()) {
  db.prepare(`DELETE FROM daily_agenda WHERE date = ?`).run(date);
}

module.exports = {
  init,
  getDb: () => db,
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
  recordVideoProject,
  updateVideoProject,
  getDailyVideoProjects,
  recordImage3DGeneration,
  getDailyImage3DGenerations,
  recordMusicProject,
  updateMusicProject,
  getDailyMusicProjects,
  saveHealthGoals,
  getHealthGoals,
  getWeeklyWeightComparison,
  saveDailyAgenda,
  getDailyAgenda,
  clearDailyAgenda,
};
