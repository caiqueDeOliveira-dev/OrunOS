// electron/identity-resolver.cjs
//
// Identity Resolver — camada de identidade do Orun OS.
//
// Pipeline obrigatório para TODA mensagem recebida:
//   provider → grupo → AgentChannel → Agente
//   sender   → UserIdentity → User → Profile → Workspace
//
// Regras:
//   - NUNCA usar displayName como identidade; usar provider_user_id (ex.: jid).
//   - NUNCA criar um User silenciosamente: remetente desconhecido entra em
//     ONBOARDING (identidade pendente registrada, auditável) até o admin ou o
//     fluxo de primeiro contato completar o perfil.
//   - Cada usuário tem workspace PERSONAL próprio; grupo ≠ workspace.

const crypto = require("crypto");

function uuid() {
  return crypto.randomUUID();
}

function getDb(db) {
  return db || require("./db.cjs");
}

/**
 * Resolve o remetente para { userId, profileId, workspaceId, identityId }.
 *
 * Status possíveis:
 *   - unknown     → nenhuma identidade ainda registrada (registra pendente)
 *   - onboarding  → identidade pendente (sem user vinculado) — aguarda nome
 *   - existing    → identidade vinculada a User + Profile + Workspace
 *   - orphan      → identidade aponta para user inexistente
 */
function resolveSender({ provider, providerUserId, phoneNumber = null, displayName = null }, dbOpt) {
  const db = getDb(dbOpt);
  let identity = db.getIdentity(provider, providerUserId);

  if (!identity) {
    identity = db.createIdentity({
      id: uuid(),
      userId: null,
      provider,
      providerUserId,
      phoneNumber,
      displayName,
      verified: 0,
    });
    return { status: "unknown", identity, userId: null, profileId: null, workspaceId: null, user: null, profile: null, workspace: null };
  }

  if (!identity.user_id) {
    return { status: "onboarding", identity, userId: null, profileId: null, workspaceId: null, user: null, profile: null, workspace: null };
  }

  const user = db.getUser(identity.user_id);
  if (!user) {
    return { status: "orphan", identity, userId: null, profileId: null, workspaceId: null, user: null, profile: null, workspace: null };
  }

  const profile = db.getProfileByUser(user.id);
  const workspace = db.getPersonalWorkspace(user.id);
  return {
    status: "existing",
    identity,
    userId: user.id,
    profileId: profile ? profile.id : null,
    workspaceId: workspace ? workspace.id : null,
    user,
    profile,
    workspace,
  };
}

/**
 * Completa o onboarding de uma identidade pendente: cria User + Profile +
 * Workspace PERSONAL e vincula a identidade. Controlado e auditável.
 */
function completeOnboarding({ identityId, name, workspaceName = null, timezone = null, locale = null }, dbOpt) {
  const db = getDb(dbOpt);
  const identity = db.getIdentityById(identityId);
  if (!identity) throw new Error("identity not found");
  if (identity.user_id) throw new Error("identity already linked");

  const displayName = (name || identity.display_name || "").trim() || "Usuário";
  const userId = uuid();
  db.upsertUser({ id: userId, name: displayName });

  const profileId = uuid();
  db.createProfile({ id: profileId, userId, displayName, timezone, locale });

  const wsName = workspaceName || `${displayName} Workspace`;
  const workspaceId = uuid();
  db.createWorkspace({ id: workspaceId, ownerUserId: userId, name: wsName, type: "PERSONAL" });

  db.linkIdentity(identity.id, userId, true);

  return { userId, profileId, workspaceId, identityId: identity.id, status: "onboarded" };
}

/**
 * Associação admin: vincula uma identidade (pendente ou não) a um usuário
 * existente. NÃO permitido por mensagem comum — só por fluxo controlado.
 */
function linkIdentity({ identityId, userId }, dbOpt) {
  const db = getDb(dbOpt);
  const user = db.getUser(userId);
  if (!user) throw new Error("user not found");
  const identity = db.linkIdentity(identityId, userId, true);
  const workspace = db.getPersonalWorkspace(userId);
  return { userId, identityId: identity.id, workspaceId: workspace ? workspace.id : null };
}

/**
 * Resolve o agente a partir do canal externo (grupo WhatsApp → AgentChannel).
 * Retorna o canal ou null. A migração legada (agentJids) é alimentada em
 * syncAgentChannelsFromLegacy.
 */
function resolveAgentForChannel({ provider, externalChannelId }, dbOpt) {
  const db = getDb(dbOpt);
  const channel = db.getAgentChannel(provider, externalChannelId);
  if (channel && channel.enabled) return channel;
  return null;
}

/**
 * Migração: transforma o mapeamento legado `whatsapp.agentJids` em linhas de
 * agent_channels. Idempotente.
 */
function syncAgentChannelsFromLegacy(dbOpt) {
  const db = getDb(dbOpt);
  const cfg = db.getSetting("whatsapp", {});
  const agentJids = cfg.agentJids || {};
  const now = Date.now();
  let migrated = 0;
  for (const [agent, jid] of Object.entries(agentJids)) {
    if (!jid || typeof jid !== "string") continue;
    const existing = db.getAgentChannel("whatsapp", jid);
    if (existing) {
      if (!existing.agent) db.upsertAgentChannel({ id: existing.id, provider: "whatsapp", externalChannelId: jid, agent });
      continue;
    }
    db.upsertAgentChannel({ id: uuid(), provider: "whatsapp", externalChannelId: jid, agent });
    migrated++;
  }
  if (migrated > 0) {
    const log = (dbOpt && dbOpt.log) || require("./logger.cjs");
    (log.info || log.sync?.info || (() => {})).call(log, `[identity] migrated ${migrated} legacy agentJids to agent_channels`);
  }
  return migrated;
}

/**
 * Garante as entidades de sistema (usuário "orun" + workspace SYSTEM) usadas
 * para dados legados sem dono conhecido.
 */
function ensureSystemEntities(dbOpt) {
  const db = getDb(dbOpt);
  const SYSTEM_USER_ID = "orun-system";
  const SYSTEM_WORKSPACE_ID = "orun-system-workspace";
  if (!db.getUser(SYSTEM_USER_ID)) {
    db.upsertUser({ id: SYSTEM_USER_ID, name: "Orun System" });
  }
  if (!db.getWorkspace(SYSTEM_WORKSPACE_ID)) {
    db.createWorkspace({ id: SYSTEM_WORKSPACE_ID, ownerUserId: SYSTEM_USER_ID, name: "Orun System", type: "SYSTEM" });
  }
  return { systemUserId: SYSTEM_USER_ID, systemWorkspaceId: SYSTEM_WORKSPACE_ID };
}

/**
 * Configuração de voz por agente. Persistida em settings["agentVoiceSettings"].
 * responseMode: AUTO | ALWAYS_TEXT | ALWAYS_AUDIO
 *  - AUTO: áudio → áudio, texto → texto.
 */
function getAgentVoiceSettings(dbOpt, agentId) {
  const db = getDb(dbOpt);
  const all = db.getSetting("agentVoiceSettings", {});
  const defaults = { enabled: false, voiceProvider: null, voiceId: null, language: "pt", responseMode: "AUTO" };
  return { ...defaults, ...(all[agentId] || {}) };
}

function setAgentVoiceSettings(dbOpt, agentId, patch) {
  const db = getDb(dbOpt);
  const all = db.getSetting("agentVoiceSettings", {});
  all[agentId] = { ...getAgentVoiceSettings(dbOpt, agentId), ...patch };
  db.setSetting("agentVoiceSettings", all);
  return all[agentId];
}

/**
 * Monta o contexto de memória escopado por workspace + user + agente +
 * conversation. Nunca cruza workspace entre usuários.
 */
async function buildScopedMemoryContext({ memoryEngine, workspaceId, userId, agentId, conversationId, query }, dbOpt) {
  if (!memoryEngine) return [];
  try {
    const { injectForPrompt } = memoryEngine;
    const block = await injectForPrompt({
      query,
      workspaceId: workspaceId || "orun-system-workspace",
      userId: userId || null,
      scopeAgent: agentId,
      conversationId,
      topK: 4,
      maxChars: 1200,
    });
    if (!block) return [];
    return [{ role: "system", content: block.trim() }];
  } catch {
    return [];
  }
}

module.exports = {
  uuid,
  resolveSender,
  completeOnboarding,
  linkIdentity,
  resolveAgentForChannel,
  syncAgentChannelsFromLegacy,
  ensureSystemEntities,
  getAgentVoiceSettings,
  setAgentVoiceSettings,
  buildScopedMemoryContext,
};
