// electron/db/identity.cjs
//
// Camada de identidade local (SQLite) do Orun OS.
//
// Arquitetura (regra-fim da especificação):
//   Grupo WhatsApp  → AgentChannel → Agente
//   Remetente       → UserIdentity → User → Profile → Workspace
//
// Tabelas novas:
//   - users            (entidade de pessoa)
//   - user_profiles    (perfil exibido da pessoa no Orun)
//   - user_identities  (identidade externa: provider + provider_user_id,
//                       ex.: whatsapp jid; user_id NULL = pendente de onboarding)
//   - workspaces       (escopo lógico de dados; PERSONAL / SHARED / SYSTEM)
//   - agent_channels   (grupo/canal externo → agente)
//
// Colunas adicionadas em tabelas existentes:
//   - conversations: workspace_id, user_id, channel_id, external_conversation_id
//   - messages: workspace_id, user_id, type, direction, external_message_id,
//               media_url, metadata
//
// Nada é apagado: o schema é aditivo e preserva os dados existentes.

const core = require("./core.cjs");
const crypto = require("crypto");

function uuid() {
  return crypto.randomUUID();
}

const IDENTITY_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    preferences TEXT,
    timezone TEXT,
    locale TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_identities (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    phone_number TEXT,
    display_name TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(provider, provider_user_id)
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'PERSONAL'
      CHECK(type IN ('PERSONAL', 'SHARED', 'SYSTEM')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_channels (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    external_channel_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    name TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(provider, external_channel_id)
  );
`;

function addColumn(d, table, col, ddl) {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === col)) {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
  }
}

function ensureSchema() {
  const d = core.getDb();
  d.exec(IDENTITY_TABLES_SQL);

  addColumn(d, "conversations", "workspace_id", "TEXT");
  addColumn(d, "conversations", "user_id", "TEXT");
  addColumn(d, "conversations", "channel_id", "TEXT");
  addColumn(d, "conversations", "external_conversation_id", "TEXT");

  addColumn(d, "messages", "workspace_id", "TEXT");
  addColumn(d, "messages", "user_id", "TEXT");
  addColumn(d, "messages", "type", "TEXT NOT NULL DEFAULT 'text'");
  addColumn(d, "messages", "direction", "TEXT NOT NULL DEFAULT 'inbound'");
  addColumn(d, "messages", "external_message_id", "TEXT");
  addColumn(d, "messages", "media_url", "TEXT");
  addColumn(d, "messages", "metadata", "TEXT");

  d.exec(`
    CREATE INDEX IF NOT EXISTS idx_identities_provider ON user_identities(provider, provider_user_id);
    CREATE INDEX IF NOT EXISTS idx_identities_user ON user_identities(user_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_channels_external ON agent_channels(provider, external_channel_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_external
      ON messages(external_message_id) WHERE external_message_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_messages_workspace ON messages(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
  `);
}

// ── Users ──────────────────────────────────────────────────────────────────

function upsertUser({ id, name }) {
  const now = Date.now();
  core.getDb()
    .prepare(
      `INSERT INTO users (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`
    )
    .run(id, name, now, now);
  return getUser(id);
}

function getUser(id) {
  return core.getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

function listUsers() {
  return core.getDb().prepare(`SELECT * FROM users ORDER BY created_at ASC`).all();
}

// ── Profiles ───────────────────────────────────────────────────────────────

function createProfile({ id, userId, displayName = null, preferences = null, timezone = null, locale = null }) {
  const now = Date.now();
  core.getDb()
    .prepare(
      `INSERT INTO user_profiles (id, user_id, display_name, preferences, timezone, locale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, userId, displayName, preferences, timezone, locale, now, now);
  return getProfileByUser(userId);
}

function getProfileByUser(userId) {
  return core.getDb().prepare(`SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1`).get(userId);
}

function updateProfile(userId, patch = {}) {
  const current = getProfileByUser(userId);
  if (!current) return null;
  const next = {
    display_name: patch.displayName ?? current.display_name,
    preferences: patch.preferences ?? current.preferences,
    timezone: patch.timezone ?? current.timezone,
    locale: patch.locale ?? current.locale,
  };
  core.getDb()
    .prepare(
      `UPDATE user_profiles
       SET display_name = ?, preferences = ?, timezone = ?, locale = ?, updated_at = ?
       WHERE user_id = ?`
    )
    .run(next.display_name, next.preferences, next.timezone, next.locale, Date.now(), userId);
  return getProfileByUser(userId);
}

// ── Identities ─────────────────────────────────────────────────────────────

function createIdentity({ id, userId = null, provider, providerUserId, phoneNumber = null, displayName = null, verified = 0 }) {
  const now = Date.now();
  core.getDb()
    .prepare(
      `INSERT INTO user_identities (id, user_id, provider, provider_user_id, phone_number, display_name, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, userId, provider, providerUserId, phoneNumber, displayName, verified ? 1 : 0, now, now);
  return getIdentity(provider, providerUserId);
}

function getIdentity(provider, providerUserId) {
  return core.getDb()
    .prepare(`SELECT * FROM user_identities WHERE provider = ? AND provider_user_id = ? LIMIT 1`)
    .get(provider, providerUserId);
}

function getIdentityById(id) {
  return core.getDb().prepare(`SELECT * FROM user_identities WHERE id = ?`).get(id);
}

function linkIdentity(identityId, userId, verified = true) {
  core.getDb()
    .prepare(`UPDATE user_identities SET user_id = ?, verified = ?, updated_at = ? WHERE id = ?`)
    .run(userId, verified ? 1 : 0, Date.now(), identityId);
  return getIdentityById(identityId);
}

function listIdentities({ pendingOnly = false } = {}) {
  if (pendingOnly) {
    return core.getDb().prepare(`SELECT * FROM user_identities WHERE user_id IS NULL ORDER BY created_at ASC`).all();
  }
  return core.getDb().prepare(`SELECT * FROM user_identities ORDER BY created_at ASC`).all();
}

function listIdentitiesByUser(userId) {
  return core.getDb().prepare(`SELECT * FROM user_identities WHERE user_id = ? ORDER BY created_at ASC`).all(userId);
}

// ── Workspaces ─────────────────────────────────────────────────────────────

function createWorkspace({ id, ownerUserId, name, type = "PERSONAL" }) {
  const now = Date.now();
  core.getDb()
    .prepare(
      `INSERT INTO workspaces (id, owner_user_id, name, type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, ownerUserId, name, type, now, now);
  return getWorkspace(id);
}

function getWorkspace(id) {
  return core.getDb().prepare(`SELECT * FROM workspaces WHERE id = ?`).get(id);
}

function getPersonalWorkspace(userId) {
  return core.getDb()
    .prepare(`SELECT * FROM workspaces WHERE owner_user_id = ? AND type = 'PERSONAL' LIMIT 1`)
    .get(userId);
}

function listWorkspacesByOwner(userId) {
  return core.getDb().prepare(`SELECT * FROM workspaces WHERE owner_user_id = ? ORDER BY created_at ASC`).all(userId);
}

function listWorkspaces() {
  return core.getDb().prepare(`SELECT * FROM workspaces ORDER BY created_at ASC`).all();
}

// ── Agent channels (grupo externo → agente) ────────────────────────────────

function upsertAgentChannel({ id, provider, externalChannelId, agent, name = null, enabled = true }) {
  const now = Date.now();
  core.getDb()
    .prepare(
      `INSERT INTO agent_channels (id, provider, external_channel_id, agent, name, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, external_channel_id) DO UPDATE SET
         agent = excluded.agent,
         name = COALESCE(excluded.name, agent_channels.name),
         enabled = excluded.enabled,
         updated_at = excluded.updated_at`
    )
    .run(id, provider, externalChannelId, agent, name, enabled ? 1 : 0, now, now);
  return getAgentChannel(provider, externalChannelId);
}

function getAgentChannel(provider, externalChannelId) {
  return core.getDb()
    .prepare(`SELECT * FROM agent_channels WHERE provider = ? AND external_channel_id = ? LIMIT 1`)
    .get(provider, externalChannelId);
}

function listAgentChannels({ enabledOnly = false } = {}) {
  const d = core.getDb();
  if (enabledOnly) return d.prepare(`SELECT * FROM agent_channels WHERE enabled = 1 ORDER BY created_at ASC`).all();
  return d.prepare(`SELECT * FROM agent_channels ORDER BY created_at ASC`).all();
}

function setAgentChannelEnabled(provider, externalChannelId, enabled) {
  core.getDb()
    .prepare(`UPDATE agent_channels SET enabled = ?, updated_at = ? WHERE provider = ? AND external_channel_id = ?`)
    .run(enabled ? 1 : 0, Date.now(), provider, externalChannelId);
  return getAgentChannel(provider, externalChannelId);
}

// ── Conversations escopadas (workspace + agente + canal) ───────────────────

function getConversation(id) {
  return core.getDb().prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
}

function findScopedConversation({ workspaceId = null, userId = null, agent = null, channelId = null, externalConversationId = null } = {}) {
  const d = core.getDb();
  const where = [];
  const params = [];
  if (workspaceId != null) { where.push("workspace_id = ?"); params.push(workspaceId); }
  if (userId != null) { where.push("user_id = ?"); params.push(userId); }
  if (agent != null) { where.push("agent = ?"); params.push(agent); }
  if (channelId != null) { where.push("channel_id = ?"); params.push(channelId); }
  if (externalConversationId != null) { where.push("external_conversation_id = ?"); params.push(externalConversationId); }
  if (where.length === 0) return null;
  return d.prepare(`SELECT * FROM conversations WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT 1`).get(...params) || null;
}

function getOrCreateConversation({ workspaceId = null, userId = null, agent = null, channelId = null, externalConversationId = null, title = "New chat" }) {
  const existing = findScopedConversation({ workspaceId, userId, agent, channelId, externalConversationId });
  if (existing) return existing;
  const id = uuid();
  const now = Date.now();
  core.getDb()
    .prepare(
      `INSERT INTO conversations (id, title, agent, workspace_id, user_id, channel_id, external_conversation_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, title, agent, workspaceId, userId, channelId, externalConversationId, now, now);
  return getConversation(id);
}

function listConversationsByWorkspace(workspaceId) {
  return core.getDb()
    .prepare(`SELECT * FROM conversations WHERE workspace_id = ? ORDER BY updated_at DESC`)
    .all(workspaceId);
}

// ── Mensagens escopadas ────────────────────────────────────────────────────

function messageExistsByExternal(externalMessageId) {
  if (!externalMessageId) return false;
  return !!core.getDb().prepare(`SELECT 1 FROM messages WHERE external_message_id = ? LIMIT 1`).get(externalMessageId);
}

function getMessageByExternalId(externalMessageId) {
  if (!externalMessageId) return null;
  return core.getDb().prepare(`SELECT * FROM messages WHERE external_message_id = ? LIMIT 1`).get(externalMessageId) || null;
}

function addScopedMessage(conversationId, msg) {
  if (msg.externalMessageId && messageExistsByExternal(msg.externalMessageId)) {
    return { ok: false, reason: "duplicate" };
  }
  const d = core.getDb();
  const txn = d.transaction(() => {
    d.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, created_at, workspace_id, user_id, type, direction, external_message_id, media_url, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      msg.id,
      conversationId,
      msg.role || "user",
      msg.content || "",
      Date.now(),
      msg.workspaceId ?? null,
      msg.userId ?? null,
      msg.type || "text",
      msg.direction || "inbound",
      msg.externalMessageId ?? null,
      msg.mediaUrl ?? null,
      msg.metadata ?? null
    );
    d.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(Date.now(), conversationId);
  });
  txn();
  return { ok: true };
}

module.exports = {
  uuid,
  ensureSchema,
  upsertUser,
  getUser,
  listUsers,
  createProfile,
  getProfileByUser,
  updateProfile,
  createIdentity,
  getIdentity,
  getIdentityById,
  linkIdentity,
  listIdentities,
  listIdentitiesByUser,
  createWorkspace,
  getWorkspace,
  getPersonalWorkspace,
  listWorkspacesByOwner,
  listWorkspaces,
  upsertAgentChannel,
  getAgentChannel,
  listAgentChannels,
  setAgentChannelEnabled,
  getConversation,
  findScopedConversation,
  getOrCreateConversation,
  listConversationsByWorkspace,
  messageExistsByExternal,
  getMessageByExternalId,
  addScopedMessage,
};
