-- Orun OS — 002 Identity & Workspaces (compartilhado por todos os apps)
--
-- Espelho da camada de identidade local (SQLite) no Supabase compartilhado.
-- Arquitetura (regra-fim):
--   Grupo/canal → AgentChannel → Agente
--   Remetente   → UserIdentity → User → Profile → Workspace
--
-- Nada é apagado: migration 100% aditiva. RLS é habilitado apenas nas tabelas
-- NOVAS (users, user_profiles, user_identities, workspaces, agent_channels).
-- As tabelas legadas (conversations/messages) apenas ganham colunas e índices —
-- o sync existente (service role) não é afetado por RLS.

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ── User profiles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferences TEXT,
  timezone    TEXT,
  locale      TEXT,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.user_profiles(user_id);

-- ── User identities (provider + provider_user_id; user_id NULL = onboarding) ─
CREATE TABLE IF NOT EXISTS public.user_identities (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  phone_number     TEXT,
  display_name     TEXT,
  verified         INTEGER NOT NULL DEFAULT 0,
  created_at       BIGINT NOT NULL,
  updated_at       BIGINT NOT NULL,
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_identities_provider ON public.user_identities(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_identities_user ON public.user_identities(user_id);

-- ── Workspaces (PERSONAL / SHARED / SYSTEM) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id            TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'PERSONAL' CHECK (type IN ('PERSONAL', 'SHARED', 'SYSTEM')),
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_user_id);

-- ── Agent channels (grupo/canal externo → agente) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_channels (
  id                  TEXT PRIMARY KEY,
  provider            TEXT NOT NULL,
  external_channel_id TEXT NOT NULL,
  agent               TEXT NOT NULL,
  name                TEXT,
  enabled             INTEGER NOT NULL DEFAULT 1,
  created_at          BIGINT NOT NULL,
  updated_at          BIGINT NOT NULL,
  UNIQUE(provider, external_channel_id)
);
CREATE INDEX IF NOT EXISTS idx_channels_external ON public.agent_channels(provider, external_channel_id);

-- ── Colunas aditivas em conversations (escopo workspace/user/canal) ─────────
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS external_conversation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON public.conversations(workspace_id);

-- ── Colunas aditivas em messages (dedup, tipo, direção, mídia) ──────────────
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_workspace ON public.messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);

-- Dedup de mensagens externas (WhatsApp/Telegram) — único parcial.
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_external
  ON public.messages(external_message_id)
  WHERE external_message_id IS NOT NULL;

-- ── RLS: somente tabelas NOVAS (por dono). Service role continua bypass. ────
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_identities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_channels   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own    ON public.users;
DROP POLICY IF EXISTS users_update_own    ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id::text = auth.uid()::text);
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id::text = auth.uid()::text);

DROP POLICY IF EXISTS profiles_own ON public.user_profiles;
CREATE POLICY profiles_own ON public.user_profiles
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS identities_own ON public.user_identities;
CREATE POLICY identities_own ON public.user_identities
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS workspaces_own ON public.workspaces;
CREATE POLICY workspaces_own ON public.workspaces
  FOR SELECT USING (owner_user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS channels_all ON public.agent_channels;
CREATE POLICY channels_all ON public.agent_channels
  FOR SELECT USING (true);
