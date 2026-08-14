const { ChannelType, PermissionFlagsBits } = require("discord.js");
const tropa = require("../tropa-modules.cjs");

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────
function makePerms(flags) {
  return { has: (flag) => flags.includes(flag) };
}

function makeChannel({ id, name, type, parentId, position = 0, setParent } = {}) {
  return { id, name, type, parentId, position, ...(setParent ? { setParent } : {}) };
}

function makeGuild({
  name = "TROPA DO CaOS",
  id = "guild-tropa",
  memberCount = 10,
  channels = [],
  roles = [],
  meFlags = FULL_PERMS,
  withCreate = true,
  members = [],
} = {}) {
  const cache = new Map(channels.map((c) => [c.id, c]));
  let counter = 0;
  const guild = {
    name,
    id,
    memberCount,
    ownerId: "owner-1",
    channels: { cache },
    roles: {
      cache: new Map(roles.map((r) => [r.id, r])),
      everyone: { id: "everyone-1" },
    },
    members: {
      me: { id: "bot-1", permissions: makePerms(meFlags), user: { tag: "Orun#0001" } },
    },
  };
  if (members.length) guild.members.cache = new Map(members.map((m) => [m.id, m]));
  if (withCreate) {
    guild.channels.create = async (opts) => {
      counter += 1;
      const ch = { id: `ch-${counter}`, name: opts.name, type: opts.type, parentId: opts.parent || null, position: 0 };
      cache.set(ch.id, ch);
      return ch;
    };
    guild.roles.create = async (opts) => {
      counter += 1;
      const r = { id: `role-${counter}`, name: opts.name, color: opts.color, permissions: makePerms([]) };
      guild.roles.cache.set(r.id, r);
      return r;
    };
  }
  return guild;
}

const FULL_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.UseApplicationCommands,
];

function makeDb() {
  const store = new Map();
  return {
    getSetting: (k, fb) => (store.has(k) ? store.get(k) : fb),
    setSetting: (k, v) => { store.set(k, v); },
    _store: store,
  };
}

let msgCounter = 0;
function makeInteraction({
  commandName = null,
  customId = null,
  options = {},
  guild,
  message = null,
  memberPerms = [PermissionFlagsBits.Administrator],
} = {}) {
  const calls = { replies: [], edits: [], deferredReply: 0, deferredUpdate: 0, followUps: [] };
  const resolvedGuild = guild || makeGuild();
  const interaction = {
    guild: resolvedGuild,
    user: { tag: "Caiqu#0001", id: "u1" },
    commandName,
    customId,
    message,
    memberPermissions: makePerms(memberPerms),
    isChatInputCommand: () => Boolean(commandName),
    isButton: () => Boolean(customId),
    options: {
      getString: (k) => (k in options ? options[k] : null),
      getBoolean: (k) => (k in options ? options[k] : null),
      getUser: (k) => (k in options ? options[k] : null),
    },
    reply: async (payload) => {
      calls.replies.push(payload);
      if (payload.fetchReply) {
        const m = { id: `msg-${++msgCounter}` };
        calls.replyMsgId = m.id;
        return m;
      }
      return undefined;
    },
    deferReply: async () => { calls.deferredReply += 1; },
    deferUpdate: async () => { calls.deferredUpdate += 1; },
    editReply: async (payload) => { calls.edits.push(payload); return payload; },
    followUp: async (payload) => { calls.followUps.push(payload); return payload; },
  };
  return { interaction, guild: resolvedGuild, calls };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de nome
// ─────────────────────────────────────────────────────────────────────────────
describe("tropa-modules / helpers", () => {
  it("cleanName limpa caracteres inválidos e encurta", () => {
    expect(tropa.cleanName("  Jogo #1 @tag  ")).toBe("Jogo 1 tag");
    expect(tropa.cleanName("x".repeat(100)).length).toBeLessThanOrEqual(60);
    expect(tropa.cleanName("  ")).toBe("");
  });

  it("slugify normaliza para kebab lowercase", () => {
    expect(tropa.slugify("Tarkov 2")).toBe("tarkov-2");
    expect(tropa.slugify("Coração")).toBe("coracao");
    expect(tropa.slugify("!!!")).toBe("jogo");
  });

  it("parseHexColor valida cores hex", () => {
    expect(tropa.parseHexColor("#e4002b")).toBe(0xe4002b);
    expect(tropa.parseHexColor("123ABC")).toBe(0x123abc);
    expect(tropa.parseHexColor("red")).toBe(null);
    expect(tropa.parseHexColor(null)).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Especificações de área
// ─────────────────────────────────────────────────────────────────────────────
describe("tropa-modules / specs", () => {
  it("gameAreaSpec gera categoria e 4 canais com sufixo", () => {
    const spec = tropa.gameAreaSpec("Tarkov");
    expect(spec.categoryName).toBe("🎮・Tarkov");
    expect(spec.channels.map((c) => c.name)).toEqual([
      "📢・avisos-tarkov",
      "💬・chat-tarkov",
      "🎬・clips-tarkov",
      "🔊・voz-tarkov",
    ]);
    expect(spec.channels.map((c) => c.type)).toEqual(["text", "text", "text", "voice"]);
  });

  it("guildAreaSpec gera categoria, 5 canais e 4 cargos", () => {
    const spec = tropa.guildAreaSpec("Tropa Alpha", 0x123456);
    expect(spec.categoryName).toBe("⚔️・Tropa Alpha");
    expect(spec.channels).toHaveLength(5);
    expect(spec.roles).toHaveLength(4);
    const lider = spec.roles.find((r) => r.key === "lider");
    expect(lider.name).toBe("👑 Líder · Tropa Alpha");
    expect(lider.color).toBe(0x123456);
    const membro = spec.roles.find((r) => r.key === "membro");
    expect(membro.color).toBe(0x2ecc71);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// planArea / executeArea
// ─────────────────────────────────────────────────────────────────────────────
describe("tropa-modules / planArea", () => {
  it("em servidor vazio planeja criar categoria + 4 canais", () => {
    const guild = makeGuild();
    const plan = tropa.planArea(guild, tropa.gameAreaSpec("Tarkov"));
    expect(plan.cat.action).toBe("create");
    expect(plan.cat.channels).toHaveLength(4);
    expect(plan.stats.create).toBe(5);
    expect(plan.stats.reuse).toBe(0);
  });

  it("reutiliza tudo quando a área já existe (idempotência)", () => {
    const catId = "cat-1";
    const channels = [
      makeChannel({ id: catId, name: "🎮・Tarkov", type: ChannelType.GuildCategory }),
      makeChannel({ id: "c1", name: "📢・avisos-tarkov", type: ChannelType.GuildText, parentId: catId }),
      makeChannel({ id: "c2", name: "💬・chat-tarkov", type: ChannelType.GuildText, parentId: catId }),
      makeChannel({ id: "c3", name: "🎬・clips-tarkov", type: ChannelType.GuildText, parentId: catId }),
      makeChannel({ id: "c4", name: "🔊・voz-tarkov", type: ChannelType.GuildVoice, parentId: catId }),
    ];
    const guild = makeGuild({ channels });
    const plan = tropa.planArea(guild, tropa.gameAreaSpec("Tarkov"));
    expect(plan.cat.action).toBe("reuse");
    expect(plan.stats.create).toBe(0);
    expect(plan.stats.reuse).toBe(5);
  });

  it("preserva elemento existente com nome conflitante (nome seguro)", () => {
    const channels = [makeChannel({ id: "old", name: "🎮・Tarkov", type: ChannelType.GuildText })];
    const guild = makeGuild({ channels });
    const plan = tropa.planArea(guild, tropa.gameAreaSpec("Tarkov"));
    expect(plan.cat.action).toBe("create");
    expect(plan.cat.actualName).toBe("🎮・Tarkov-2");
    expect(plan.conflicts.length).toBeGreaterThan(0);
  });

  it("executeArea cria categoria + canais", async () => {
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const guild = makeGuild();
    const plan = tropa.planArea(guild, tropa.gameAreaSpec("Tarkov"));
    const { categoryId, executed } = await tropa.executeArea(guild, plan, log, "teste");
    expect(executed.category).toBeDefined();
    expect(executed.channels).toHaveLength(4);
    expect(categoryId).toBe(executed.category.id);
    expect(guild.channels.cache.size).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tracker (proteção)
// ─────────────────────────────────────────────────────────────────────────────
describe("tropa-modules / tracker", () => {
  it("isSystemCreated reconhece apenas elementos rastreados", () => {
    const db = makeDb();
    tropa.addGame(db, "g-1", { slug: "x", name: "X", categoryId: "cat-x", channelIds: ["ch-1"], archived: false, createdAt: Date.now() });
    tropa.addRole(db, "g-1", "role-1", "🐺 Comandante");
    expect(tropa.isSystemCreated(db, "g-1", "cat-x")).toBe(true);
    expect(tropa.isSystemCreated(db, "g-1", "ch-1")).toBe(true);
    expect(tropa.isSystemCreated(db, "g-1", "role-1")).toBe(true);
    expect(tropa.isSystemCreated(db, "g-1", "manual")).toBe(false);
  });

  it("persiste o tracker via db.getSetting/setSetting", () => {
    const db = makeDb();
    tropa.addGame(db, "g-1", { slug: "y", name: "Y", categoryId: "cat-y", channelIds: [], archived: false, createdAt: Date.now() });
    expect(db._store.has(tropa.TRACKER_KEY)).toBe(true);
    const loaded = tropa.getTracker(db, "g-1");
    expect(loaded.games).toHaveLength(1);
    expect(loaded.games[0].name).toBe("Y");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Comandos slash
// ─────────────────────────────────────────────────────────────────────────────
describe("tropa-modules / buildCommandDefinitions", () => {
  it("retorna os 5 comandos da Fase 2", () => {
    const defs = tropa.buildCommandDefinitions();
    expect(defs.map((d) => d.name)).toEqual([
      "criar-jogo",
      "arquivar-jogo",
      "criar-guilda",
      "setup-cargos",
      "painel",
    ]);
  });

  it("comandos de escrita exigem permissão; /painel é aberto", () => {
    const defs = tropa.buildCommandDefinitions();
    for (const d of defs) {
      if (d.name === "painel") expect(d.default_member_permissions).toBeUndefined();
      else expect(d.default_member_permissions).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Interações (handler)
// ─────────────────────────────────────────────────────────────────────────────
describe("tropa-modules / buildInteractionHandler", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  it("/criar-jogo sem confirmar mostra preview e não cria nada", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, guild, calls } = makeInteraction({ commandName: "criar-jogo", options: { jogo: "Palworld" } });
    await handler(interaction);
    const reply = calls.replies[0];
    expect(reply.embeds.length).toBeGreaterThan(0);
    expect(reply.components).toHaveLength(1);
    expect(guild.channels.cache.size).toBe(0);
  });

  it("/criar-jogo confirmar:true cria a área e registra no tracker", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, guild, calls } = makeInteraction({ commandName: "criar-jogo", options: { jogo: "Palworld", confirmar: true } });
    await handler(interaction);
    expect(calls.deferredReply).toBe(1);
    expect(calls.edits.length).toBe(1);
    expect(guild.channels.cache.size).toBe(5);
    const t = tropa.getTracker(db, guild.id);
    expect(t.games).toHaveLength(1);
    expect(t.games[0].name).toBe("Palworld");
    expect(tropa.isSystemCreated(db, guild.id, t.games[0].categoryId)).toBe(true);
  });

  it("preview → botão confirmar cria e registra", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const preview = makeInteraction({ commandName: "criar-jogo", options: { jogo: "Tarkov" } });
    await handler(preview.interaction);
    expect(preview.guild.channels.cache.size).toBe(0);

    const confirm = makeInteraction({ customId: "tropa_criar_jogo_confirm", message: { id: preview.calls.replyMsgId }, guild: preview.guild });
    await handler(confirm.interaction);
    expect(confirm.calls.deferredUpdate).toBe(1);
    expect(confirm.calls.edits.length).toBe(1);
    expect(preview.guild.channels.cache.size).toBe(5);
    expect(tropa.getTracker(db, preview.guild.id).games).toHaveLength(1);
  });

  it("botão cancelar não cria nada", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const preview = makeInteraction({ commandName: "criar-guilda", options: { nome: "Tropa A" } });
    await handler(preview.interaction);
    const cancel = makeInteraction({ customId: "tropa_criar_guilda_cancel", message: { id: preview.calls.replyMsgId }, guild: preview.guild });
    await handler(cancel.interaction);
    expect(cancel.calls.deferredUpdate).toBe(1);
    expect(preview.guild.channels.cache.size).toBe(0);
  });

  it("confirmação expirada é recusada", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, guild, calls } = makeInteraction({ customId: "tropa_criar_jogo_confirm", message: { id: "msg-desconhecida" } });
    await handler(interaction);
    expect(calls.replies.length).toBe(1);
    expect(calls.replies[0].content).toContain("expir");
    expect(guild.channels.cache.size).toBe(0);
  });

  it("reporta permissões ausentes do bot e não cria nada", async () => {
    const db = makeDb();
    const guild = makeGuild({ meFlags: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] });
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({ commandName: "criar-jogo", options: { jogo: "X", confirmar: true }, guild });
    await handler(interaction);
    expect(calls.replies.length).toBe(1);
    expect(calls.replies[0].content).toContain("Manage Permissions");
    expect(guild.channels.cache.size).toBe(0);
  });

  it("nega criação sem permissão de administrador", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, guild, calls } = makeInteraction({ commandName: "criar-jogo", options: { jogo: "X", confirmar: true }, memberPerms: [] });
    await handler(interaction);
    expect(calls.replies.length).toBe(1);
    expect(calls.replies[0].content).toContain("Administrador");
    expect(guild.channels.cache.size).toBe(0);
  });

  it("/arquivar-jogo recusa jogo não criado pelo sistema (proteção)", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, guild, calls } = makeInteraction({ commandName: "arquivar-jogo", options: { jogo: "GTA", confirmar: true } });
    await handler(interaction);
    expect(calls.replies.length).toBe(1);
    expect(calls.replies[0].content).toContain("protegidos");
    expect(calls.edits.length).toBe(0);
    expect(guild.channels.cache.size).toBe(0);
  });

  it("/arquivar-jogo avisa quando já está arquivado", async () => {
    const db = makeDb();
    tropa.addGame(db, "guild-tropa", { slug: "tarkov", name: "Tarkov", categoryId: "cat-x", channelIds: [], archived: true, createdAt: Date.now() });
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({ commandName: "arquivar-jogo", options: { jogo: "tarkov" } });
    await handler(interaction);
    expect(calls.replies[0].content).toContain("já está arquivado");
  });

  it("/arquivar-jogo confirmar:true arquiva jogo do sistema", async () => {
    const db = makeDb();
    const setParent = vi.fn().mockResolvedValue(undefined);
    const gameCat = makeChannel({ id: "cat-tarkov", name: "🎮・Tarkov", type: ChannelType.GuildCategory, setParent });
    const guild = makeGuild({ channels: [gameCat] });
    tropa.addGame(db, guild.id, { slug: "tarkov", name: "Tarkov", categoryId: "cat-tarkov", channelIds: [], archived: false, createdAt: Date.now() });

    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({ commandName: "arquivar-jogo", options: { jogo: "Tarkov", confirmar: true }, guild });
    await handler(interaction);
    expect(calls.deferredReply).toBe(1);
    expect(calls.edits.length).toBe(1);
    expect(setParent).toHaveBeenCalled();
    expect(tropa.getTracker(db, guild.id).games[0].archived).toBe(true);
  });

  it("/criar-guilda confirmar:true cria área, cargos e atribui o líder", async () => {
    const db = makeDb();
    const lider = { id: "user-99", tag: "Lider#1" };
    const member = { id: "user-99", roles: { add: vi.fn().mockResolvedValue(undefined) } };
    const guild = makeGuild({ members: [member] });
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({
      commandName: "criar-guilda",
      options: { nome: "Tropa Alpha", jogo: "Palworld", lider, cor: "#123456", confirmar: true },
      guild,
    });
    await handler(interaction);
    expect(guild.channels.cache.size).toBe(6);
    expect(guild.roles.cache.size).toBe(4);
    expect(member.roles.add).toHaveBeenCalled();
    const t = tropa.getTracker(db, guild.id);
    expect(t.guilds).toHaveLength(1);
    expect(t.guilds[0].roleIds).toHaveLength(4);
    const liderRole = [...guild.roles.cache.values()].find((r) => r.name === "👑 Líder · Tropa Alpha");
    expect(liderRole.color).toBe(0x123456);
  });

  it("/criar-guilda sem confirmar mostra preview com cargos", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({ commandName: "criar-guilda", options: { nome: "Tropa Beta" } });
    await handler(interaction);
    const reply = calls.replies[0];
    expect(reply.embeds.length).toBeGreaterThan(1);
    expect(reply.components).toHaveLength(1);
  });

  it("/setup-cargos confirmar:true cria 9 cargos", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, guild, calls } = makeInteraction({ commandName: "setup-cargos", options: { confirmar: true } });
    await handler(interaction);
    expect(guild.roles.cache.size).toBe(9);
    expect(calls.edits.length).toBe(1);
    expect(tropa.getTracker(db, guild.id).roles.length).toBe(9);
  });

  it("/setup-cargos idempotente: segunda execução não cria", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const a = makeInteraction({ commandName: "setup-cargos", options: { confirmar: true } });
    await handler(a.interaction);
    const b = makeInteraction({ commandName: "setup-cargos", options: { confirmar: true }, guild: a.guild });
    await handler(b.interaction);
    expect(b.guild.roles.cache.size).toBe(9);
    expect(tropa.getTracker(db, b.guild.id).roles.length).toBe(9);
  });

  it("/painel retorna embeds com botões", async () => {
    const db = makeDb();
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({ commandName: "painel" });
    await handler(interaction);
    expect(calls.replies.length).toBe(1);
    expect(calls.replies[0].embeds.length).toBeGreaterThan(0);
    expect(calls.replies[0].components).toHaveLength(1);
  });

  it("botão do painel mostra detalhes efêmeros", async () => {
    const db = makeDb();
    tropa.addGame(db, "guild-tropa", { slug: "tarkov", name: "Tarkov", categoryId: "cat-tarkov", channelIds: ["ch-1"], archived: false, createdAt: Date.now() });
    const handler = tropa.buildInteractionHandler({ log, db });
    const { interaction, calls } = makeInteraction({ customId: "tropa_panel_games" });
    await handler(interaction);
    expect(calls.replies.length).toBe(1);
    expect(calls.replies[0].embeds.length).toBeGreaterThan(0);
    expect(calls.replies[0].ephemeral).toBe(true);
  });
});
