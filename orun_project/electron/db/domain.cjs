const core = require("./core.cjs");

// ── Nutrition log ────────────────────────────────────────────────────────

function recordMeal(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO nutrition_log (id, date, description, calories, protein_g, carbs_g, fat_g, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.description, entry.calories ?? null, entry.protein_g ?? null, entry.carbs_g ?? null, entry.fat_g ?? null, entry.source || "app", Date.now());
}

function getDailyNutrition(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
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

function getNutritionRange(startDate, endDate) {
  const db = core.getDb();
  const rows = db.prepare("SELECT * FROM nutrition_log WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC").all(startDate, endDate);
  const dailyMap = {};
  rows.forEach((r) => {
    if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    dailyMap[r.date].calories += r.calories || 0;
    dailyMap[r.date].protein_g += r.protein_g || 0;
    dailyMap[r.date].carbs_g += r.carbs_g || 0;
    dailyMap[r.date].fat_g += r.fat_g || 0;
  });
  return { entries: rows, daily: Object.values(dailyMap) };
}

// ── Finance log ───────────────────────────────────────────────────────

function recordExpense(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO finance_log (id, date, description, amount, currency, category, type, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.description, entry.amount, entry.currency || "USD", entry.category || null, entry.type || "expense", entry.source || "app", Date.now());
}

function getDailyFinance(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
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

function getFinanceRange(startDate, endDate) {
  const db = core.getDb();
  const rows = db.prepare("SELECT * FROM finance_log WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC").all(startDate, endDate);
  const dailyMap = {};
  rows.forEach((r) => {
    if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, income: 0, expenses: 0 };
    if (r.type === "income") dailyMap[r.date].income += r.amount;
    else dailyMap[r.date].expenses += r.amount;
  });
  const daily = Object.values(dailyMap);
  const totals = rows.reduce((acc, r) => { if (r.type === "income") acc.income += r.amount; else acc.expenses += r.amount; return acc; }, { income: 0, expenses: 0 });
  return { entries: rows, daily, totals, balance: totals.income - totals.expenses };
}

// ── Health log ────────────────────────────────────────────────────────

function recordHealthMetric(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO health_log (id, date, metric, value, unit, notes, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.metric, entry.value, entry.unit || null, entry.notes || null, entry.source || "app", Date.now());
}

function getDailyHealth(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM health_log WHERE date = ? ORDER BY created_at ASC`).all(date);
}

function getHealthRange(startDate, endDate) {
  const db = core.getDb();
  return db.prepare("SELECT * FROM health_log WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC").all(startDate, endDate);
}

// ── Health goals & weight tracking ───────────────────────────────────

function saveHealthGoals(goals) {
  const db = core.getDb();
  const txn = db.transaction(() => {
    const existing = db.prepare(`SELECT id FROM health_goals LIMIT 1`).get();
    const now = Date.now();
    if (existing) {
      db.prepare(`UPDATE health_goals SET target_weight_kg=?, target_height_cm=?, current_weight_kg=?, current_height_cm=?, start_weight_kg=?, start_date=?, notes=?, updated_at=? WHERE id=?`)
        .run(goals.target_weight_kg ?? null, goals.target_height_cm ?? null, goals.current_weight_kg ?? null, goals.current_height_cm ?? null, goals.start_weight_kg ?? null, goals.start_date || null, goals.notes || null, now, existing.id);
    } else {
      db.prepare(`INSERT INTO health_goals (id, target_weight_kg, target_height_cm, current_weight_kg, current_height_cm, start_weight_kg, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(`hg-${Date.now()}`, goals.target_weight_kg ?? null, goals.target_height_cm ?? null, goals.current_weight_kg ?? null, goals.current_height_cm ?? null, goals.start_weight_kg ?? null, goals.start_date || null, goals.notes || null, now, now);
    }
  });
  txn();
}

function getHealthGoals() {
  const db = core.getDb();
  return db.prepare(`SELECT * FROM health_goals LIMIT 1`).get() || null;
}

function getWeeklyWeightComparison() {
  const db = core.getDb();
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

// ── Developer reviews ────────────────────────────────────────────────

function recordReview(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO developer_reviews (id, date, repo, file_path, summary, issues_found, severity, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.repo || null, entry.file_path || null, entry.summary, entry.issues_found || 0, entry.severity || null, entry.source || "app", Date.now());
}

function getDailyReviews(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM developer_reviews WHERE date = ? ORDER BY created_at ASC`).all(date);
}

function getDeveloperRange(startDate, endDate) {
  const db = core.getDb();
  const rows = db.prepare("SELECT * FROM developer_reviews WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC").all(startDate, endDate);
  const dailyMap = {};
  rows.forEach((r) => {
    if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, total: 0, low: 0, medium: 0, high: 0, critical: 0 };
    dailyMap[r.date].total++;
    if (r.severity) dailyMap[r.date][r.severity] = (dailyMap[r.date][r.severity] || 0) + 1;
  });
  return { entries: rows, daily: Object.values(dailyMap) };
}

// ── Teacher progress ────────────────────────────────────────────────

function recordProgress(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO teacher_progress (id, date, subject, topic, status, score, notes, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.subject, entry.topic, entry.status || "learning", entry.score ?? null, entry.notes || null, entry.source || "app", Date.now());
}

function getDailyProgress(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM teacher_progress WHERE date = ? ORDER BY created_at ASC`).all(date);
}

function getTeacherRange(startDate, endDate) {
  const db = core.getDb();
  const rows = db.prepare("SELECT * FROM teacher_progress WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC").all(startDate, endDate);
  const dailyMap = {};
  rows.forEach((r) => {
    if (!dailyMap[r.date]) dailyMap[r.date] = { date: r.date, total: 0, learning: 0, reviewed: 0, mastered: 0 };
    dailyMap[r.date].total++;
    if (r.status) dailyMap[r.date][r.status] = (dailyMap[r.date][r.status] || 0) + 1;
  });
  return { entries: rows, daily: Object.values(dailyMap) };
}

// ── Video projects ──────────────────────────────────────────────────

function recordVideoProject(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO video_projects (id, date, title, template, resolution, fps, duration_sec, status, output_path, render_time_ms, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.title, entry.template || null, entry.resolution || "1920x1080", entry.fps || 30, entry.duration_sec ?? null, entry.status || "draft", entry.output_path || null, entry.render_time_ms ?? null, entry.source || "app", Date.now());
}

function updateVideoProject(id, fields) {
  const db = core.getDb();
  const ALLOWED_COLS = ["title", "template", "duration_sec", "status", "output_url", "render_progress"];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!ALLOWED_COLS.includes(k)) continue;
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE video_projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

function getDailyVideoProjects(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM video_projects WHERE date = ? ORDER BY created_at ASC`).all(date);
}

// ── Image / 3D generations ─────────────────────────────────────────

function recordImage3DGeneration(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO image3d_generations (id, date, engine, prompt, model_used, output_url, width, height, generation_time_ms, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.engine, entry.prompt, entry.model_used || null, entry.output_url || null, entry.width ?? null, entry.height ?? null, entry.generation_time_ms ?? null, entry.source || "app", Date.now());
}

function getDailyImage3DGenerations(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM image3d_generations WHERE date = ? ORDER BY created_at ASC`).all(date);
}

function getDesignerRange(startDate, endDate) {
  const db = core.getDb();
  const rows = db.prepare("SELECT * FROM image3d_generations WHERE date >= ? AND date <= ? ORDER BY date ASC").all(startDate, endDate);
  const engineMap = {};
  rows.forEach((r) => { engineMap[r.engine] = (engineMap[r.engine] || 0) + 1; });
  return { entries: rows, byEngine: engineMap };
}

// ── Music projects ──────────────────────────────────────────────────

function recordMusicProject(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO music_projects (id, date, title, engine, genre, duration_sec, bpm, status, output_url, effects_applied, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(entry.id, entry.date || todayKey(), entry.title, entry.engine, entry.genre || null, entry.duration_sec ?? null, entry.bpm ?? null, entry.status || "draft", entry.output_url || null, entry.effects_applied || null, entry.source || "app", Date.now());
}

function updateMusicProject(id, fields) {
  const db = core.getDb();
  const ALLOWED_COLS = ["title", "engine", "genre", "duration_sec", "bpm", "status", "output_url", "effects_applied"];
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!ALLOWED_COLS.includes(k)) continue;
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (sets.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE music_projects SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
}

function getDailyMusicProjects(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM music_projects WHERE date = ? ORDER BY created_at ASC`).all(date);
}

function getCreatorRange(startDate, endDate) {
  const db = core.getDb();
  const videos = db.prepare("SELECT * FROM video_projects WHERE date >= ? AND date <= ? ORDER BY date ASC").all(startDate, endDate);
  const music = db.prepare("SELECT * FROM music_projects WHERE date >= ? AND date <= ? ORDER BY date ASC").all(startDate, endDate);
  return { videos, music };
}

// ── Marketing ───────────────────────────────────────────────────────

function recordMarketing(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  db.prepare(
    `INSERT INTO marketing_log (id, date, campaign_name, objective, channels, target_audience, budget_estimate, timeline, kpis, content_ideas, platform, format, caption, hashtags, post_url, engagement, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.id, entry.date || todayKey(), entry.campaign_name || null, entry.objective || null,
    JSON.stringify(entry.channels || []), entry.target_audience || null, entry.budget_estimate || null,
    entry.timeline || null, JSON.stringify(entry.kpis || []), JSON.stringify(entry.content_ideas || []),
    entry.platform || null, entry.format || null, entry.caption || null, JSON.stringify(entry.hashtags || []),
    entry.post_url || null, entry.engagement || null, entry.source || "app", Date.now()
  );
}

// ── Agenda ──────────────────────────────────────────────────────────

function saveDailyAgenda(entry) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  const txn = db.transaction(() => {
    db.prepare(`INSERT INTO daily_agenda (id, date, title, description, time, completed, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(entry.id || `da-${Date.now()}`, entry.date || todayKey(), entry.title, entry.description || null, entry.time || null, entry.completed ? 1 : 0, entry.source || "app", Date.now());
  });
  txn();
}

function getDailyAgenda(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  return db.prepare(`SELECT * FROM daily_agenda WHERE date = ? ORDER BY time ASC`).all(date);
}

function clearDailyAgenda(date) {
  const db = core.getDb();
  const todayKey = core.todayKey;
  date = date || todayKey();
  db.prepare(`DELETE FROM daily_agenda WHERE date = ?`).run(date);
}

module.exports = {
  recordMeal,
  getDailyNutrition,
  getNutritionRange,
  recordExpense,
  getDailyFinance,
  getFinanceRange,
  recordHealthMetric,
  getDailyHealth,
  getHealthRange,
  saveHealthGoals,
  getHealthGoals,
  getWeeklyWeightComparison,
  recordReview,
  getDailyReviews,
  getDeveloperRange,
  recordProgress,
  getDailyProgress,
  getTeacherRange,
  recordVideoProject,
  updateVideoProject,
  getDailyVideoProjects,
  recordImage3DGeneration,
  getDailyImage3DGenerations,
  getDesignerRange,
  recordMusicProject,
  updateMusicProject,
  getDailyMusicProjects,
  getCreatorRange,
  recordMarketing,
  saveDailyAgenda,
  getDailyAgenda,
  clearDailyAgenda,
};
