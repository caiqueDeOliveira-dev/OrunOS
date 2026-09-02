// electron/__tests__/identity.test.cjs
//
// Testes da camada de identidade/workspace:
//   - Schema: tabelas + colunas aditivas criadas sem apagar dados.
//   - Resolver: desconhecido → onboarding → existing.
//   - Canal → agente (agent_channels + migração legada).
//   - Dedup por external_message_id.
//   - Isolamento de memória por workspace/user/agent.

const os = require("os");
const path = require("path");
const fs = require("fs");

// Os bindings nativos do better-sqlite3 são compilados para o ABI do Electron.
// Nos testes (Node do sistema) usamos o SQLite nativo do Node via env.
process.env.ORUN_SQLITE_BACKEND = "node:sqlite";

let tmp;
let db;

function freshDb() {
  const core = require("../db/core.cjs");
  core._resetDbForTests();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "orun-identity-test-"));
  core.init(tmp, null);
  return require("../db.cjs");
}

beforeEach(() => {
  db = freshDb();
});

afterEach(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("identity schema", () => {
  it("creates identity tables and additive columns", () => {
    const d = db.getDb();
    const tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    for (const t of ["users", "user_profiles", "user_identities", "workspaces", "agent_channels"]) {
      expect(tables).toContain(t);
    }
    const convCols = d.prepare("PRAGMA table_info(conversations)").all().map((c) => c.name);
    expect(convCols).toEqual(expect.arrayContaining(["workspace_id", "user_id", "channel_id", "external_conversation_id"]));
    const msgCols = d.prepare("PRAGMA table_info(messages)").all().map((c) => c.name);
    expect(msgCols).toEqual(expect.arrayContaining(["type", "direction", "external_message_id", "media_url", "metadata"]));
  });

  it("preserves existing data when schema already exists (idempotent)", () => {
    const convId = db.createConversation("conv-existing", "Existing chat", "Health").id;
    const before = db.getMessages(convId);
    expect(Array.isArray(before)).toBe(true);
    // Re-run ensureSchema — no error, data intact.
    require("../db/identity.cjs").ensureSchema();
    expect(db.getMessages(convId)).toEqual(before);
  });
});

describe("resolveSender pipeline", () => {
  const resolver = require("../identity-resolver.cjs");

  it("unknown sender creates pending identity (never silent user)", () => {
    const r = resolver.resolveSender({ provider: "whatsapp", providerUserId: "1234@s.whatsapp.net", displayName: "Carlos" }, db);
    expect(r.status).toBe("unknown");
    expect(r.userId).toBeNull();
    expect(r.identity.user_id).toBeNull();
    expect(db.listIdentities({ pendingOnly: true })).toHaveLength(1);
  });

  it("onboarding text completes the identity and creates user + personal workspace", () => {
    const first = resolver.resolveSender({ provider: "whatsapp", providerUserId: "abc@s.whatsapp.net" }, db);
    expect(first.status).toBe("unknown");

    const second = resolver.resolveSender({ provider: "whatsapp", providerUserId: "abc@s.whatsapp.net" }, db);
    expect(second.status).toBe("onboarding");

    const onboarded = resolver.completeOnboarding({ identityId: second.identity.id, name: "Ana" }, db);
    expect(onboarded.userId).toBeTruthy();
    expect(onboarded.workspaceId).toBeTruthy();

    const existing = resolver.resolveSender({ provider: "whatsapp", providerUserId: "abc@s.whatsapp.net" }, db);
    expect(existing.status).toBe("existing");
    expect(existing.userId).toBe(onboarded.userId);
    expect(existing.profile.display_name).toBe("Ana");
    expect(existing.workspace.type).toBe("PERSONAL");
  });

  it("linkIdentity binds an existing user to a pending identity (admin flow)", () => {
    const { userId } = resolver.completeOnboarding({ identityId: resolver.resolveSender({ provider: "whatsapp", providerUserId: "u1@s.whatsapp.net" }, db).identity.id, name: "User1" }, db);
    const pending = resolver.resolveSender({ provider: "whatsapp", providerUserId: "u2@s.whatsapp.net" }, db);
    const linked = resolver.linkIdentity({ identityId: pending.identity.id, userId }, db);
    expect(linked.userId).toBe(userId);
    expect(resolver.resolveSender({ provider: "whatsapp", providerUserId: "u2@s.whatsapp.net" }, db).status).toBe("existing");
  });

  it("displayName is never used as identity (providerUserId is)", () => {
    const a = resolver.resolveSender({ provider: "whatsapp", providerUserId: "jid-a", displayName: "Joaquim" }, db);
    const b = resolver.resolveSender({ provider: "whatsapp", providerUserId: "jid-b", displayName: "Joaquim" }, db);
    expect(a.identity.id).not.toBe(b.identity.id);
  });
});

describe("agent channels", () => {
  const resolver = require("../identity-resolver.cjs");

  it("maps group → agent via agent_channels and respects enabled=false", () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "group-a@g.us", agent: "Finance" });
    expect(resolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: "group-a@g.us" }, db).agent).toBe("Finance");
    db.setAgentChannelEnabled("whatsapp", "group-a@g.us", false);
    expect(resolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: "group-a@g.us" }, db)).toBeNull();
  });

  it("migrates legacy agentJids to agent_channels (idempotent)", () => {
    db.setSetting("whatsapp", { agentJids: { Health: "g1@g.us", Finance: "g2@g.us" } });
    expect(resolver.syncAgentChannelsFromLegacy(db)).toBe(2);
    expect(resolver.syncAgentChannelsFromLegacy(db)).toBe(0);
    expect(resolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: "g1@g.us" }, db).agent).toBe("Health");
  });

  it("same group different agent JIDs is a different channel (GRUPO ≠ usuário)", () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "shared@g.us", agent: "Health" });
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "shared@g.us", agent: "Finance" });
    const rows = db.listAgentChannels().filter((c) => c.external_channel_id === "shared@g.us");
    expect(rows).toHaveLength(1); // upsert em conflito (provider+channel) mantém o mesmo canal
    expect(rows[0].agent).toBe("Finance");
  });

  it("mode defaults to 'always' and persists 'mention' (e inválido cai para always)", () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "g-always@g.us", agent: "Hampton" });
    expect(db.getAgentChannel("whatsapp", "g-always@g.us").mode).toBe("always");

    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "g-mention@g.us", agent: "Hampton", mode: "mention" });
    const ch = db.getAgentChannel("whatsapp", "g-mention@g.us");
    expect(ch.mode).toBe("mention");
    // Resolver propaga o mode junto do canal.
    expect(resolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: "g-mention@g.us" }, db).mode).toBe("mention");

    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "g-bad@g.us", agent: "Hampton", mode: "qualquer" });
    expect(db.getAgentChannel("whatsapp", "g-bad@g.us").mode).toBe("always");
  });

  it("deleteAgentChannel remove só o mapeamento do grupo", () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "g1@g.us", agent: "Health" });
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "g2@g.us", agent: "Finance" });
    expect(db.deleteAgentChannel("whatsapp", "g1@g.us").deleted).toBe(true);
    expect(resolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: "g1@g.us" }, db)).toBeNull();
    expect(resolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: "g2@g.us" }, db).agent).toBe("Finance");
    expect(db.deleteAgentChannel("whatsapp", "g1@g.us").deleted).toBe(false);
  });
});

describe("message dedup", () => {
  it("addScopedMessage rejects duplicates by external_message_id", () => {
    const conv = db.getOrCreateConversation({ agent: "Health", workspaceId: "ws", userId: "u", externalConversationId: "g@g.us" });
    const base = { id: db.uuid(), workspaceId: "ws", userId: "u", role: "user", content: "oi", externalMessageId: "ext-1" };
    expect(db.addScopedMessage(conv.id, base).ok).toBe(true);
    expect(db.addScopedMessage(conv.id, { ...base, id: db.uuid() }).reason).toBe("duplicate");
    expect(db.getMessageByExternalId("ext-1").content).toBe("oi");
  });
});

describe("memory isolation", () => {
  it("does not leak memory across users/workspaces (same key, different scope)", async () => {
    const memoryEngine = require("../memory-engine.cjs").createMemoryEngine({
      filePath: path.join(tmp, "memory-engine.json"),
      embed: async () => Array.from({ length: 384 }, () => 0.5),
      cloud: null,
    });

    await memoryEngine.save({ key: "peso", content: "Ana pesa 70kg", scopeAgent: "Health", workspaceId: "ws-ana", userId: "u-ana", tags: ["peso"] });
    await memoryEngine.save({ key: "peso", content: "João pesa 95kg", scopeAgent: "Health", workspaceId: "ws-joao", userId: "u-joao", tags: ["peso"] });

    const ana = await memoryEngine.search({ query: "peso", scopeAgent: "Health", workspaceId: "ws-ana", userId: "u-ana" });
    expect(ana.results.length).toBeGreaterThan(0);
    expect(ana.results[0].content).toContain("Ana");

    const joao = await memoryEngine.search({ query: "peso", scopeAgent: "Health", workspaceId: "ws-joao", userId: "u-joao" });
    expect(joao.results.length).toBeGreaterThan(0);
    expect(joao.results[0].content).toContain("João");

    const mixed = await memoryEngine.search({ query: "peso" });
    expect(mixed.results.length).toBe(2); // sem escopo → não filtra (compat)
  });
});
