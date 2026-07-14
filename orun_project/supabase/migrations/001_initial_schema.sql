-- Orun OS — Supabase PostgreSQL schema
-- Mirrors the original SQLite schema, keeping BIGINT (millis) timestamps for
-- minimal app-level changes.

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT 'New chat',
  agent      TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id               TEXT PRIMARY KEY,
  conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  created_at       BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS usage (
  provider   TEXT NOT NULL,
  date       TEXT NOT NULL,
  requests   INTEGER NOT NULL DEFAULT 0,
  tokens_in  INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, date)
);

-- TTS usage tracking
CREATE TABLE IF NOT EXISTS tts_usage (
  engine      TEXT NOT NULL,
  date        TEXT NOT NULL,
  requests    INTEGER NOT NULL DEFAULT 0,
  characters  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (engine, date)
);

-- Nutrition log
CREATE TABLE IF NOT EXISTS nutrition_log (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  calories    INTEGER,
  protein_g   INTEGER,
  carbs_g     INTEGER,
  fat_g       INTEGER,
  source      TEXT NOT NULL DEFAULT 'app',
  created_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nutrition_date ON nutrition_log(date);

-- Finance log
CREATE TABLE IF NOT EXISTS finance_log (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      DOUBLE PRECISION NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'USD',
  category    TEXT,
  type        TEXT NOT NULL DEFAULT 'expense',
  source      TEXT NOT NULL DEFAULT 'app',
  created_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_finance_date ON finance_log(date);

-- Health log
CREATE TABLE IF NOT EXISTS health_log (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  metric     TEXT NOT NULL,
  value      DOUBLE PRECISION NOT NULL,
  unit       TEXT,
  notes      TEXT,
  source     TEXT NOT NULL DEFAULT 'app',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_health_date ON health_log(date);

-- Developer reviews
CREATE TABLE IF NOT EXISTS developer_reviews (
  id           TEXT PRIMARY KEY,
  date         TEXT NOT NULL,
  repo         TEXT,
  file_path    TEXT,
  summary      TEXT NOT NULL,
  issues_found INTEGER DEFAULT 0,
  severity     TEXT,
  source       TEXT NOT NULL DEFAULT 'app',
  created_at   BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_devreviews_date ON developer_reviews(date);

-- Teacher progress
CREATE TABLE IF NOT EXISTS teacher_progress (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  topic      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'learning',
  score      INTEGER,
  notes      TEXT,
  source     TEXT NOT NULL DEFAULT 'app',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teacher_date ON teacher_progress(date);

-- Video projects
CREATE TABLE IF NOT EXISTS video_projects (
  id             TEXT PRIMARY KEY,
  date           TEXT NOT NULL,
  title          TEXT NOT NULL,
  template       TEXT,
  resolution     TEXT DEFAULT '1920x1080',
  fps            INTEGER DEFAULT 30,
  duration_sec   DOUBLE PRECISION,
  status         TEXT NOT NULL DEFAULT 'draft',
  output_path    TEXT,
  render_time_ms INTEGER,
  source         TEXT NOT NULL DEFAULT 'app',
  created_at     BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_video_date ON video_projects(date);

-- 3D / Image generations
CREATE TABLE IF NOT EXISTS image3d_generations (
  id                  TEXT PRIMARY KEY,
  date                TEXT NOT NULL,
  engine              TEXT NOT NULL,
  prompt              TEXT NOT NULL,
  model_used          TEXT,
  output_url          TEXT,
  width               INTEGER,
  height              INTEGER,
  generation_time_ms  INTEGER,
  source              TEXT NOT NULL DEFAULT 'app',
  created_at          BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_image3d_date ON image3d_generations(date);

-- Music projects
CREATE TABLE IF NOT EXISTS music_projects (
  id              TEXT PRIMARY KEY,
  date            TEXT NOT NULL,
  title           TEXT NOT NULL,
  engine          TEXT NOT NULL,
  genre           TEXT,
  duration_sec    DOUBLE PRECISION,
  bpm             INTEGER,
  status          TEXT NOT NULL DEFAULT 'draft',
  output_url      TEXT,
  effects_applied TEXT,
  source          TEXT NOT NULL DEFAULT 'app',
  created_at      BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_music_date ON music_projects(date);

-- Enable Row Level Security (RLS) — Supabase best practice.
-- The anon key will be used with a permissive policy for the desktop app.
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE image3d_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_projects ENABLE ROW LEVEL SECURITY;

-- Permissive policy: anon key can do everything (desktop app has full access).
CREATE POLICY "Full access for anon" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON tts_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON nutrition_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON finance_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON health_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON developer_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON teacher_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON video_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON image3d_generations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access for anon" ON music_projects FOR ALL USING (true) WITH CHECK (true);
