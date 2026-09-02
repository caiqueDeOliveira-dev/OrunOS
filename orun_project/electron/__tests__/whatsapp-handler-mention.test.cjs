// electron/__tests__/whatsapp-handler-mention.test.cjs
//
// Testes da regra de menção por canal (agent_channels.mode = "mention"):
//   - Grupo em modo @ sem menção ao bot → mensagem ignorada (nada enviado).
//   - Grupo em modo @ com menção ao bot → mensagem processada.
//   - Grupo em modo livre ('always') → responde mesmo sem menção.
//   - Comparação de JIDs selvagem (device/server suffix) e helper isMentioned.

const os = require("os");
const path = require("path");
const fs = require("fs");

process.env.ORUN_SQLITE_BACKEND = "node:sqlite";

let tmp;
let db;
let resolver;
let handler;

function freshDb() {
  const core = require("../db/core.cjs");
  core._resetDbForTests();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "orun-wa-mention-test-"));
  core.init(tmp, null);
  return require("../db.cjs");
}

beforeEach(() => {
  db = freshDb();
  resolver = require("../identity-resolver.cjs");
  handler = require("../whatsapp-handler.cjs");
});

afterEach(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
});

function makeCtx() {
  const sent = [];
  return {
    ctx: {
      db,
      aiRouter: {
        KNOWN_FREE_MODELS: {},
        buildContext: async () => ({ context: [] }),
        routeChat: async () => { throw new Error("não deve rotear"); },
      },
      agentProcessor: { recordUsageSafely: () => {}, processAgentReply: (_id, t) => t },
      secretStore: { readSecretStore: () => ({}) },
      whatsapp: {
        sendMessage: async (jid, text) => { sent.push({ jid, text }); },
        sendAudioMessage: async () => { throw new Error("no audio in test"); },
      },
      waAutomation: {},
      buildSystemPrompt: (base) => base || "",
      resolveAISettings: () => ({ provider: "openai", model: "gpt-4o-mini", baseUrl: null, apiKey: null, systemPrompt: "x" }),
      log: {
        info: () => {}, warn: () => {}, error: () => {},
        sync: {}, db: {},
      },
      saveNutritionToFile: () => {},
      getErrorMessage: (e) => (e && e.message) || "erro",
      memoryEngine: null,
    },
    sent,
  };
}

function makeKnownUser(number) {
  const first = resolver.resolveSender({ provider: "whatsapp", providerUserId: number, displayName: "Caique" }, db);
  resolver.completeOnboarding({ identityId: first.identity.id, name: "Caique" }, db);
}

const MY_JID = "5511999999999@s.whatsapp.net";
const BOT_JID = "5511888888888:52@s.whatsapp.net";

describe("whatsapp handler — menção por canal", () => {
  it("grupo em modo @ sem menção → nada é enviado (nem onboarding dispara)", async () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "familia@g.us", agent: "Hampton", mode: "mention" });
    makeKnownUser(MY_JID);
    const { ctx, sent } = makeCtx();
    await handler.handleWhatsAppMessage({
      jid: "familia@g.us",
      senderJid: MY_JID,
      senderName: "Caique",
      text: "Vamos jantar hoje?",
      fromMe: false,
      mentionedJids: [],
      selfJid: BOT_JID,
      timestamp: Date.now(),
    }, ctx);
    expect(sent).toHaveLength(0);
  });

  it("grupo em modo @ com @no bot → mensagem é processada (sem chaves → erro de resposta é enviado)", async () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "familia@g.us", agent: "Hampton", mode: "mention" });
    makeKnownUser(MY_JID);
    const { ctx, sent } = makeCtx();
    await handler.handleWhatsAppMessage({
      jid: "familia@g.us",
      senderJid: MY_JID,
      senderName: "Caique",
      text: "@Orun me ajuda a decidir o jantar?",
      fromMe: false,
      mentionedJids: ["5511888888888"],
      selfJid: BOT_JID,
      timestamp: Date.now(),
    }, ctx);
    expect(sent.length).toBeGreaterThan(0);
  });

  it("grupo em modo livre (always) responde mesmo sem menção", async () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "meu-grupo@g.us", agent: "Hampton" });
    makeKnownUser(MY_JID);
    const { ctx, sent } = makeCtx();
    await handler.handleWhatsAppMessage({
      jid: "meu-grupo@g.us",
      senderJid: MY_JID,
      senderName: "Caique",
      text: "bom dia pessoal",
      fromMe: false,
      mentionedJids: [],
      selfJid: BOT_JID,
      timestamp: Date.now(),
    }, ctx);
    expect(sent.length).toBeGreaterThan(0);
  });

  it("isMentioned compara JIDs com e sem device/servidor", () => {
    expect(handler.isMentioned(["5511888888888"], BOT_JID)).toBe(true);
    expect(handler.isMentioned(["5511888888888@s.whatsapp.net"], BOT_JID)).toBe(true);
    expect(handler.isMentioned(["5599000000000"], BOT_JID)).toBe(false);
    expect(handler.isMentioned([], BOT_JID)).toBe(false);
    expect(handler.isMentioned(["5511888888888"], null)).toBe(false);
  });

  it("isMentioned reconhece menção enviada como LID via selfLid", () => {
    expect(handler.isMentioned(["240991386734799@lid"], BOT_JID, "240991386734799@lid")).toBe(true);
    expect(handler.isMentioned(["240991386734799"], BOT_JID, "240991386734799@lid")).toBe(true);
    expect(handler.isMentioned(["240991386734799@lid"], BOT_JID)).toBe(false);
  });

  it("grupo em modo @ com menção por LID → mensagem é processada", async () => {
    db.upsertAgentChannel({ id: resolver.uuid(), provider: "whatsapp", externalChannelId: "familia-lid@g.us", agent: "Hampton", mode: "mention" });
    makeKnownUser(MY_JID);
    const { ctx, sent } = makeCtx();
    await handler.handleWhatsAppMessage({
      jid: "familia-lid@g.us",
      senderJid: MY_JID,
      senderName: "Caique",
      text: "@Orun oi",
      fromMe: false,
      mentionedJids: ["240991386734799@lid"],
      selfJid: BOT_JID,
      selfLid: "240991386734799@lid",
      timestamp: Date.now(),
    }, ctx);
    expect(sent.length).toBeGreaterThan(0);
  });

  it("jidBare normaliza device/servidor para só dígitos", () => {
    expect(handler.jidBare("5511888888888:52@s.whatsapp.net")).toBe("5511888888888");
    expect(handler.jidBare("5511888888888")).toBe("5511888888888");
    expect(handler.jidBare(null)).toBe("");
  });
});