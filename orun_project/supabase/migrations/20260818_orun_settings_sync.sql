-- Migration: orun_settings_sync
-- Cria a tabela para sincronizar settings entre devices via Supabase.
-- Compativel com o schema do @orun/sync (SyncEngine).

CREATE TABLE IF NOT EXISTS orun_settings_sync (
  id            TEXT PRIMARY KEY,
  path          TEXT NOT NULL,
  value         JSONB NOT NULL DEFAULT '{}',
  account_id    TEXT,
  device_id     TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  updated_at    BIGINT NOT NULL,
  created_at    BIGINT NOT NULL,
  deleted       BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index para queries por account (sync pull)
CREATE INDEX IF NOT EXISTS idx_orun_settings_sync_account
  ON orun_settings_sync (account_id)
  WHERE account_id IS NOT NULL;

-- Index para queries por device (sync pull)
CREATE INDEX IF NOT EXISTS idx_orun_settings_sync_device
  ON orun_settings_sync (device_id);

-- Index para path unico por device/account (evita duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orun_settings_sync_path_account_device
  ON orun_settings_sync (path, COALESCE(account_id, ''), device_id);

-- Index para updated_at (sync pull de mudancas recentes)
CREATE INDEX IF NOT EXISTS idx_orun_settings_sync_updated
  ON orun_settings_sync (updated_at DESC);

-- Row Level Security
ALTER TABLE orun_settings_sync ENABLE ROW LEVEL SECURITY;

-- Policy: cada device so ve e edita seus proprios registros
-- (service_role bypass RLS, entao so afeta client anon/authenticated)
CREATE POLICY "device_isolation" ON orun_settings_sync
  FOR ALL
  USING (device_id = current_setting('request.jwt.claims', true)::json->>'device_id')
  WITH CHECK (device_id = current_setting('request.jwt.claims', true)::json->>'device_id');

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_orun_settings_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = EXTRACT(EPOCH FROM NOW()) * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orun_settings_sync_updated_at
  BEFORE UPDATE ON orun_settings_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_orun_settings_sync_updated_at();
