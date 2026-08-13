// electron/__tests__/group-watcher.test.cjs
//
// Testes do vigia de grupos (WhatsApp + Telegram):
//   - Normalização WA/TG (filtro só de grupos).
//   - Feed ao vivo + persistência em anel (500 msgs).
//   - Watchlist: match por palavra-chave, dedup e cooldown de alerta.
//   - Filtro de relevância via IA (routeChat SIM/NAO + rate limit).
//   - CRUD da watchlist e persistência das configurações.
//   - Robô de promoções (Firecrawl): faltando chave / sem watchlist.

const os = require("os");
const path = require("path");
const fs = require("fs");

process.env.ORUN_SQLITE_BACKEND = "node:sqlite";

let tmp;
let db;

function freshDb() {
  const core = require("../db/core.cjs");
  core._resetDbForTests();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "orun-group-watcher-"));
  core.init(tmp, null);
  return require("../db.cjs");
}

function mkLog() {
  const noop = () => {};
  return { info: noop, warn: noop, error: noop, debug: noop };
}

function makeCtx(overrides = {}) {
  const sent = { whatsapp: [], telegram: [] };
  const ctx = {
    db,
    log: mkLog(),
    aiRouter: {
      routeChat: async () => ({ text: "SIM" }),
    },
    secretStore: {
      readSecretStore: () => ({}),
    },
    resolveAISettings: () => null,
    whatsapp: {
      listGroups: () => [
        { jid: "123@g.us", name: "Promos" },
        { jid: "456@g.us", name: "Ferreira Costa" },
      ],
      sendMessage: async (target, text) => { sent.whatsapp.push({ target, text }); return { ok: true }; },
    },
    telegram: {
      sendMessage: async (target, text) => { sent.telegram.push({ target, text }); return { ok: true }; },
    },
    userDataPath: tmp,
    ...overrides,
  };
  return { ctx, sent };
}

const WA_GROUP = { provider: "whatsapp", jid: "123@g.us", groupName: "Promos", senderName: "Ana", text: "cadeira gamer por R$ 999", timestamp: 1700000000000, externalMessageId: "m1" };
const TG_GROUP = { provider: "telegram", chatId: 888, chatType: "group", chatTitle: "Ofertas", from: { firstName: "Bruno" }, text: "RTX 5070 em promoção", messageId: 55 };

beforeEach(() => {
  db = freshDb();
});

afterEach(() => {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("normalizeMessage", () => {
  it("records WhatsApp group messages and ignores private chats", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    const pushes = [];
    w.setCallbacks({ onPush: (m) => pushes.push(m) });

    await w.onMessage({ ...WA_GROUP });
    await w.onMessage({ provider: "whatsapp", jid: "55@s.whatsapp.net", senderName: "Joao", text: "oi" });

    const state = w.getState();
    expect(state.history).toHaveLength(1);
    expect(state.history[0].provider).toBe("whatsapp");
    expect(state.history[0].channelId).toBe("123@g.us");
    expect(state.history[0].channelName).toBe("Promos");
    expect(state.history[0].mediaType).toBe("text");
    expect(pushes).toHaveLength(1);
  });

  it("records Telegram group messages", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    await w.onMessage(TG_GROUP);

    const state = w.getState();
    expect(state.history).toHaveLength(1);
    expect(state.history[0].provider).toBe("telegram");
    expect(state.history[0].channelId).toBe(888);
    expect(state.history[0].channelName).toBe("Ofertas");
    expect(state.history[0].senderName).toBe("Bruno");
  });

  it("detects image media from whatsapp payloads", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    await w.onMessage({ ...WA_GROUP, text: "", imageBase64: "aGVsbG8=" });

    expect(w.getState().history[0].mediaType).toBe("image");
  });

  it("ignores telegram private chats", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    await w.onMessage({ provider: "telegram", chatId: 111, chatType: "private", from: { firstName: "X" }, text: "oi" });

    expect(w.getState().history).toHaveLength(0);
  });

  it("persists history and known telegram chats across instances", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    await w.onMessage(TG_GROUP);

    const w2 = require("../group-watcher.cjs").createGroupWatcher(makeCtx().ctx);
    w2.start(tmp);

    const state = w2.getState();
    expect(state.history).toHaveLength(1);
    expect(state.groups.some((g) => g.id === "tg:888" && g.name === "Ofertas")).toBe(true);
  });

  it("keeps a 500-message ring", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    for (let i = 0; i < 520; i++) {
      await w.onMessage({ ...WA_GROUP, text: `msg ${i}`, externalMessageId: `m${i}` });
    }

    const state = w.getState();
    expect(state.history).toHaveLength(300);
    expect(state.history[0].text).toBe("msg 519");

    const persisted = JSON.parse(fs.readFileSync(path.join(tmp, "group-watcher-history.json"), "utf8"));
    expect(persisted.history).toHaveLength(500);
    expect(persisted.history[0].text).toBe("msg 519");
  });
});

describe("getGroups", () => {
  it("merges whatsapp listGroups + telegram chats + persisted watched groups", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    await w.onMessage(TG_GROUP);
    w.updateSettings({ watchedGroups: ["wa:999@g.us", "wa:123@g.us"] });

    const ids = w.getGroups().map((g) => g.id);
    expect(ids).toContain("wa:123@g.us");
    expect(ids).toContain("wa:456@g.us");
    expect(ids).toContain("tg:888");
    expect(ids).toContain("wa:999@g.us");
    const unknown = w.getGroups().find((g) => g.id === "wa:999@g.us");
    expect(unknown.known).toBe(false);
  });
});

describe("watchlist alerts", () => {
  it("alerts via whatsapp when a keyword matches a watched group", async () => {
    const { ctx, sent } = makeCtx();
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp).toHaveLength(1);
    expect(sent.whatsapp[0].target).toBe("55@myself");
    expect(sent.whatsapp[0].text).toContain("cadeira gamer");
    expect(sent.whatsapp[0].text).toContain("Promos");
  });

  it("dedups by externalId and applies the 30min cooldown", async () => {
    const { ctx, sent } = makeCtx();
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);
    await w.onMessage(WA_GROUP);
    await w.onMessage({ ...WA_GROUP, externalMessageId: "m2" });

    expect(sent.whatsapp).toHaveLength(1);
  });

  it("does not alert for non-watched groups", async () => {
    const { ctx, sent } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: [] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp).toHaveLength(0);
  });

  it("does not alert on fromMe messages", async () => {
    const { ctx, sent } = makeCtx();
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage({ ...WA_GROUP, fromMe: true });

    expect(sent.whatsapp).toHaveLength(0);
  });

  it("alerts via telegram when provider is telegram", async () => {
    const { ctx, sent } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({
      watchlist: [{ id: "t1", term: "rtx 5070", enabled: true, createdAt: 1 }],
      watchedGroups: ["tg:888"],
      alertProvider: "telegram",
      alertTarget: "999",
    });

    await w.onMessage(TG_GROUP);

    expect(sent.telegram).toHaveLength(1);
    expect(sent.telegram[0].target).toBe("999");
    expect(sent.whatsapp).toHaveLength(0);
  });

  it("uses alertTarget over whatsapp listenJid when set", async () => {
    const { ctx, sent } = makeCtx();
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ alertTarget: "555@custom", watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp[0].target).toBe("555@custom");
  });

  it("skips disabled watchlist terms", async () => {
    const { ctx, sent } = makeCtx();
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: false, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp).toHaveLength(0);
  });
});

describe("AI relevance filter", () => {
  it("alerts when AI answers SIM", async () => {
    const { ctx, sent } = makeCtx({
      secretStore: { readSecretStore: () => ({ openai: "sk-test" }) },
      resolveAISettings: () => ({ provider: "openai", model: "gpt-4o-mini", baseUrl: null }),
      aiRouter: { routeChat: async () => ({ text: "SIM" }) },
    });
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp).toHaveLength(1);
  });

  it("suppresses alert when AI answers NAO", async () => {
    const { ctx, sent } = makeCtx({
      secretStore: { readSecretStore: () => ({ openai: "sk-test" }) },
      resolveAISettings: () => ({ provider: "openai", model: "gpt-4o-mini", baseUrl: null }),
      aiRouter: { routeChat: async () => ({ text: "NAO" }) },
    });
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp).toHaveLength(0);
  });

  it("falls back to alert when AI check fails", async () => {
    const { ctx, sent } = makeCtx({
      secretStore: { readSecretStore: () => ({ openai: "sk-test" }) },
      resolveAISettings: () => ({ provider: "openai", model: "gpt-4o-mini", baseUrl: null }),
      aiRouter: { routeChat: async () => { throw new Error("api down"); } },
    });
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);

    expect(sent.whatsapp).toHaveLength(1);
  });

  it("rate-limits AI checks to 20s per term (bypass within window)", async () => {
    const calls = [];
    const { ctx, sent } = makeCtx({
      secretStore: { readSecretStore: () => ({ openai: "sk-test" }) },
      resolveAISettings: () => ({ provider: "openai", model: "gpt-4o-mini", baseUrl: null }),
      aiRouter: { routeChat: async () => { calls.push(1); return { text: "NAO" }; } },
    });
    db.setSetting("whatsapp", { listenJid: "55@myself" });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }], watchedGroups: ["wa:123@g.us"] });

    await w.onMessage(WA_GROUP);
    expect(sent.whatsapp).toHaveLength(0);

    await w.onMessage({ ...WA_GROUP, externalMessageId: "m2" });
    expect(calls).toHaveLength(1);
    expect(sent.whatsapp).toHaveLength(1);
  });
});

describe("watchlist CRUD", () => {
  it("adds, toggles and removes terms", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    const item = w.addWatchlistTerm("  iphone 15  ");
    expect(item.term).toBe("iphone 15");
    expect(item.enabled).toBe(true);

    w.toggleWatchlistTerm(item.id, false);
    expect(w.getSettings().watchlist[0].enabled).toBe(false);

    w.removeWatchlistTerm(item.id);
    expect(w.getSettings().watchlist).toHaveLength(0);
  });

  it("persists settings through db", () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ aiFilter: false, alertProvider: "telegram" });

    const w2 = require("../group-watcher.cjs").createGroupWatcher(makeCtx().ctx);
    w2.start(tmp);
    expect(w2.getSettings().aiFilter).toBe(false);
    expect(w2.getSettings().alertProvider).toBe("telegram");
  });

  it("clears history", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    await w.onMessage(WA_GROUP);
    w.clearHistory();
    expect(w.getState().history).toHaveLength(0);
  });
});

describe("deals bot", () => {
  it("returns firecrawl-key error when no Firecrawl key", async () => {
    const { ctx } = makeCtx();
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);
    w.updateSettings({ watchlist: [{ id: "t1", term: "cadeira gamer", enabled: true, createdAt: 1 }] });

    const res = await w.runDealsScan();

    expect(res).toEqual({ ok: false, error: "firecrawl-key" });
    expect(w.getSettings().deals.status).toBe("no-key");
  });

  it("returns no-watchlist error when no enabled terms", async () => {
    const { ctx } = makeCtx({
      secretStore: { readSecretStore: () => ({ firecrawl: "fc-test" }) },
    });
    const w = require("../group-watcher.cjs").createGroupWatcher(ctx);
    w.start(tmp);

    const res = await w.runDealsScan();

    expect(res).toEqual({ ok: false, error: "no-watchlist" });
    expect(w.getSettings().deals.status).toBe("no-watchlist");
  });
});
