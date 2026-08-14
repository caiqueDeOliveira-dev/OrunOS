const { ChannelType, PermissionFlagsBits } = require("discord.js");
const bridge = require("../discord-bridge.cjs");
const tropa = require("../tropa-modules.cjs");

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────
function makePerms(flags) {
  return { has: (flag) => flags.includes(flag) };
}

function makeChannel({ id, name, type, parentId, position = 0, setParent = null } = {}) {
  return { id, name, type, parentId, position, ...(setParent ? { setParent } : {}) };
}

function makeCategory({ id, name, position = 0, setParent = null } = {}) {
  return makeChannel({ id, name, type: ChannelType.GuildCategory, parentId: null, position, setParent });
}

function makeGuild({
  name = "TROPA DO CaOS",
  id = "guild-tropa",
  memberCount = 10,
  channels = [],
  roles = [],
  meFlags = FULL_PERMS,
  members = [],
} = {}) {
  const cache = new Map(channels.map((c) => [c.id, c]));
  let counter = 0;
  const guild = {
    name,
    id,
    memberCount,
    ownerId: "owner-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
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
  guild.channels.create = async (opts) => {
    counter += 1;
    const ch = { id: `ch-${counter}`, name: opts.name, type: opts.type, parentId: opts.parent || null, position: 0, setParent: async () => {} };
    cache.set(ch.id, ch);
    return ch;
  };
  guild.roles.create = async (opts) => {
    counter += 1;
    const r = { id: `role-${counter}`, name: opts.name, color: opts.color, position: 0, permissions: makePerms([]) };
    guild.roles.cache.set(r.id, r);
    return r;
  };
  return guild;
}

const FULL_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.UseApplicationCommands,
];

function makeBotClient(guilds) {
  return {
    isReady: () => true,
    guilds: { cache: new Map(guilds.map((g) => [g.id, g])) },
  };
}

function makeDb() {
  const store = new Map();
  return {
    getSetting: (k, fb) => (store.has(k) ? store.get(k) : fb),
    setSetting: (k, v) => { store.set(k, v); },
    _store: store,
  };
}

function connect({ guild, db, bot = null }) {
  bridge.init({ db, log: null, discordBot: bot || { client: makeBotClient([guild]) } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Status / conexão
// ─────────────────────────────────────────────────────────────────────────────
describe("discord-bridge / status", () => {
  it("sem bot no ctx → connected:false", async () => {
    bridge.init({ db: makeDb(), log: null, discordBot: null });
    const res = await bridge.execute("status");
    expect(res.connected).toBe(false);
    expect(Array.isArray(res.guilds)).toBe(true);
  });

  it("bot desconectado → connected:false", async () => {
    bridge.init({ db: makeDb(), log: null, discordBot: { client: { isReady: () => false, guilds: { cache: new Map() } } } });
    const res = await bridge.execute("status");
    expect(res.connected).toBe(false);
  });

  it("conectado lista guildas", async () => {
    const guild = makeGuild({ name: "TROPA DO CaOS", memberCount: 42 });
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("status");
    expect(res.connected).toBe(true);
    expect(res.guilds).toEqual([{ id: "guild-tropa", name: "TROPA DO CaOS", memberCount: 42 }]);
  });

  it("server_info desconectado devolve erro", async () => {
    bridge.init({ db: makeDb(), log: null, discordBot: null });
    const res = await bridge.execute("server_info", { guild_id: "x" });
    expect(res.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Leitura
// ─────────────────────────────────────────────────────────────────────────────
describe("discord-bridge / leitura", () => {
  it("server_info resume análise do servidor", async () => {
    const cat = makeCategory({ id: "cat-1", name: "🎮・Tarkov" });
    const ch = makeChannel({ id: "ch-1", name: "💬・chat-tarkov", type: ChannelType.GuildText, parentId: "cat-1" });
    const guild = makeGuild({ channels: [cat, ch], roles: [], meFlags: FULL_PERMS });
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("server_info", { guild_id: guild.id });
    expect(res.name).toBe("TROPA DO CaOS");
    expect(res.counts.channels).toBe(1);
    expect(res.categories[0].name).toBe("🎮・Tarkov");
    expect(res.bot.missing.length).toBe(0);
  });

  it("channels agrupa por categoria", async () => {
    const cat = makeCategory({ id: "cat-1", name: "GERAL" });
    const text = makeChannel({ id: "t-1", name: "geral", type: ChannelType.GuildText, parentId: "cat-1" });
    const voice = makeChannel({ id: "v-1", name: "voz", type: ChannelType.GuildVoice, parentId: "cat-1" });
    const orphan = makeChannel({ id: "o-1", name: "soltinho", type: ChannelType.GuildText, parentId: null });
    const guild = makeGuild({ channels: [cat, text, voice, orphan] });
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("channels", { guild_id: guild.id });
    expect(res.categories[0].channels).toHaveLength(2);
    expect(res.categories[0].channels[0].type).toBe("texto");
    expect(res.uncategorized).toHaveLength(1);
  });

  it("roles lista cargos ordenados por posição", async () => {
    const r2 = { id: "r2", name: "🐺 Comandante", position: 5, color: 0xc3002f, mentionable: false };
    const r1 = { id: "r1", name: "⚔️ Membro", position: 1, color: 0x2b6cb0, mentionable: true };
    const guild = makeGuild({ roles: [r2, r1] });
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("roles", { guild_id: guild.id });
    expect(res.roles[0].name).toBe("⚔️ Membro");
    expect(res.roles[0].color).toBe("#2b6cb0");
    expect(res.roles[1].name).toBe("🐺 Comandante");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Planejamento (read-only)
// ─────────────────────────────────────────────────────────────────────────────
describe("discord-bridge / discord_plan", () => {
  it("palworld: plano somente leitura", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "palworld" });
    expect(res.read_only).toBe(true);
    expect(res.summary).toContain("Categorias");
    expect(res.detail.area).toBe("palworld");
  });

  it("tropa: plano com include_optional", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "tropa", include_optional: true });
    expect(res.read_only).toBe(true);
    expect(res.summary).toContain("Tropa do CaOS");
  });

  it("game: exige game", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "game" });
    expect(res.error).toBeDefined();
    expect(res.error).toContain("game");
  });

  it("game: plano da área do jogo", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "game", game: "Tarkov" });
    expect(res.summary).toContain("Tarkov");
    expect(res.summary).toContain("Categoria");
  });

  it("guild: exige guild_name", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "guild" });
    expect(res.error).toContain("guild_name");
  });

  it("guild: plano inclui cargos", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "guild", guild_name: "Tropa Alpha" });
    expect(res.summary).toContain("Tropa Alpha");
    expect(res.summary).toContain("Cargos");
    expect(res.detail.rolePlan).toHaveLength(4);
  });

  it("roles: role_set comando = 3 cargos; all = 9", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res1 = await bridge.execute("plan", { guild_id: guild.id, area: "roles", role_set: "comando" });
    expect(res1.detail.rolePlan).toHaveLength(3);
    const res2 = await bridge.execute("plan", { guild_id: guild.id, area: "roles", role_set: "all" });
    expect(res2.detail.rolePlan).toHaveLength(9);
  });

  it("roles: role_set inválido → erro", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "roles", role_set: "xpto" });
    expect(res.error).toBeDefined();
  });

  it("area desconhecida → erro", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("plan", { guild_id: guild.id, area: "hacker" });
    expect(res.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ações com confirmação
// ─────────────────────────────────────────────────────────────────────────────
describe("discord-bridge / discord_apply", () => {
  it("sem confirm → recusa e não cria nada", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "game", game: "Tarkov" });
    expect(res.refused).toBe(true);
    expect(guild.channels.cache.size).toBe(0);
  });

  it("sem permissões → erro e não cria nada", async () => {
    const guild = makeGuild({ meFlags: [] });
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "game", game: "Tarkov", confirm: "yes" });
    expect(res.error).toBeDefined();
    expect(res.missing.length).toBeGreaterThan(0);
    expect(guild.channels.cache.size).toBe(0);
  });

  it("game: cria área + grava no tracker", async () => {
    const guild = makeGuild();
    const db = makeDb();
    connect({ guild, db });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "game", game: "Tarkov", confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.game).toBe("Tarkov");
    expect(res.channels_created).toBe(4);
    const tracker = tropa.getTracker(db, guild.id);
    expect(tracker.games).toHaveLength(1);
    expect(tracker.games[0].slug).toBe("tarkov");
    expect(tracker.games[0].archived).toBe(false);
    expect(guild.channels.cache.size).toBe(5); // 1 categoria + 4 canais
  });

  it("game: idempotente — segunda execução reutiliza", async () => {
    const guild = makeGuild();
    const db = makeDb();
    connect({ guild, db });
    await bridge.execute("apply", { guild_id: guild.id, area: "game", game: "Tarkov", confirm: "yes" });
    const sizeAfterFirst = guild.channels.cache.size;
    const res2 = await bridge.execute("apply", { guild_id: guild.id, area: "game", game: "Tarkov", confirm: "yes" });
    expect(res2.ok).toBe(true);
    expect(res2.channels_created).toBe(0);
    expect(guild.channels.cache.size).toBe(sizeAfterFirst);
  });

  it("guild: cria área + cargos + grava tracker", async () => {
    const guild = makeGuild();
    const db = makeDb();
    connect({ guild, db });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "guild", guild_name: "Tropa Alpha", confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.roles_created).toBe(4);
    const tracker = tropa.getTracker(db, guild.id);
    expect(tracker.guilds).toHaveLength(1);
    expect(tracker.guilds[0].slug).toBe("tropa-alpha");
    expect(guild.roles.cache.size).toBe(4);
  });

  it("roles: cria 9 cargos da comunidade + tracker", async () => {
    const guild = makeGuild();
    const db = makeDb();
    connect({ guild, db });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "roles", role_set: "all", confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.roles_created).toBe(9);
    const tracker = tropa.getTracker(db, guild.id);
    expect(tracker.roles).toHaveLength(9);
  });

  it("palworld: executa setup", async () => {
    const guild = makeGuild();
    const db = makeDb();
    connect({ guild, db });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "palworld", confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.stats.categoriesCreated).toBeGreaterThan(0);
    expect(res.stats.channelsCreated).toBeGreaterThan(0);
  });

  it("tropa: executa setup com include_optional", async () => {
    const guild = makeGuild();
    const db = makeDb();
    connect({ guild, db });
    const res = await bridge.execute("apply", { guild_id: guild.id, area: "tropa", include_optional: true, confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.stats.categoriesCreated).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Arquivamento
// ─────────────────────────────────────────────────────────────────────────────
describe("discord-bridge / discord_archive_game", () => {
  function guildWithTrackedGame() {
    const cat = makeCategory({ id: "game-cat-1", name: "🎮・Tarkov", setParent: async () => {} });
    const guild = makeGuild({ channels: [cat] });
    const db = makeDb();
    tropa.addGame(db, guild.id, {
      slug: "tarkov",
      name: "Tarkov",
      categoryId: "game-cat-1",
      channelIds: [],
      archived: false,
      createdAt: Date.now(),
    });
    connect({ guild, db });
    return { guild, db };
  }

  it("sem confirm → recusa", async () => {
    const { guild } = guildWithTrackedGame();
    const res = await bridge.execute("archive_game", { guild_id: guild.id, game: "Tarkov" });
    expect(res.refused).toBe(true);
  });

  it("jogo não rastreado → protegido", async () => {
    const guild = makeGuild();
    connect({ guild, db: makeDb() });
    const res = await bridge.execute("archive_game", { guild_id: guild.id, game: "Manual", confirm: "yes" });
    expect(res.refused).toBe(true);
    expect(res.reason).toContain("protegidos");
  });

  it("já arquivado → already_archived", async () => {
    const { guild } = guildWithTrackedGame();
    const db = makeDb();
    tropa.addGame(db, guild.id, {
      slug: "tarkov", name: "Tarkov", categoryId: "game-cat-1", channelIds: [], archived: true, createdAt: Date.now(),
    });
    connect({ guild, db });
    const res = await bridge.execute("archive_game", { guild_id: guild.id, game: "Tarkov", confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.already_archived).toBe(true);
  });

  it("arquiva categoria rastreada", async () => {
    const { guild, db } = guildWithTrackedGame();
    const res = await bridge.execute("archive_game", { guild_id: guild.id, game: "Tarkov", confirm: "yes" });
    expect(res.ok).toBe(true);
    expect(res.archived).toBe(true);
    const tracker = tropa.getTracker(db, guild.id);
    expect(tracker.games[0].archived).toBe(true);
  });

  it("categoria sumida (removida manualmente) → erro", async () => {
    const guild = makeGuild();
    const db = makeDb();
    tropa.addGame(db, guild.id, {
      slug: "tarkov", name: "Tarkov", categoryId: "sumiu", channelIds: [], archived: false, createdAt: Date.now(),
    });
    connect({ guild, db });
    const res = await bridge.execute("archive_game", { guild_id: guild.id, game: "Tarkov", confirm: "yes" });
    expect(res.error).toBeDefined();
    expect(res.error).toContain("não foi encontrada");
  });
});
