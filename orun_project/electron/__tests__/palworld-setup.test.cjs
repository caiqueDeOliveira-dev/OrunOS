const { ChannelType, PermissionFlagsBits } = require("discord.js");
const palworld = require("../palworld-setup.cjs");

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────
function makePerms(flags) {
  return { has: (flag) => flags.includes(flag) };
}

function makeChannel({ id, name, type, parentId, position = 0 }) {
  return { id, name, type, parentId, position };
}

function makeRole({ id, name, position, flags = [] }) {
  return { id, name, position, permissions: makePerms(flags) };
}

function makeGuild({
  name = "Teste",
  id = "guild-1",
  memberCount = 5,
  ownerId = "owner-1",
  channels = [],
  roles = [],
  meFlags = [],
  withCreate = false,
} = {}) {
  const cache = new Map(channels.map((c) => [c.id, c]));
  let counter = 0;
  const guild = {
    name,
    id,
    memberCount,
    ownerId,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    channels: { cache },
    roles: { cache: new Map(roles.map((r) => [r.id, r])) },
    members: {
      me: meFlags.length
        ? { id: "bot-1", permissions: makePerms(meFlags), user: { tag: "Orun#0001" } }
        : null,
    },
  };
  if (withCreate) {
    guild.channels.create = async (opts) => {
      counter += 1;
      const ch = {
        id: `new-${counter}`,
        name: opts.name,
        type: opts.type,
        parentId: opts.parent || null,
        position: 0,
      };
      cache.set(ch.id, ch);
      return ch;
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

const STRUCTURE_CATEGORIES = 9;
const STRUCTURE_CHANNELS = 26;

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura
// ─────────────────────────────────────────────────────────────────────────────
describe("palworld-setup / estrutura", () => {
  it("define 9 categorias e 26 canais", () => {
    expect(palworld.PALWORLD_STRUCTURE).toHaveLength(STRUCTURE_CATEGORIES);
    const total = palworld.PALWORLD_STRUCTURE.reduce((acc, c) => acc + c.channels.length, 0);
    expect(total).toBe(STRUCTURE_CHANNELS);
  });

  it("cada categoria tem key, name, type=category e channels", () => {
    for (const cat of palworld.PALWORLD_STRUCTURE) {
      expect(cat.type).toBe("category");
      expect(cat.key).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(Array.isArray(cat.channels)).toBe(true);
    }
  });

  it("cada canal tem type text ou voice", () => {
    for (const cat of palworld.PALWORLD_STRUCTURE) {
      for (const ch of cat.channels) {
        expect(["text", "voice"]).toContain(ch.type);
        expect(ch.key).toBeTruthy();
        expect(ch.name).toBeTruthy();
      }
    }
  });

  it("buildCommandDefinitions retorna os 5 comandos esperados", () => {
    const defs = palworld.buildCommandDefinitions();
    const names = defs.map((d) => d.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "servidor-info",
        "preview-palworld",
        "setup-palworld",
        "preview-redesign",
        "aplicar-redesign",
      ]),
    );
    expect(defs).toHaveLength(5);
    const setup = defs.find((d) => d.name === "setup-palworld");
    const redesign = defs.find((d) => d.name === "aplicar-redesign");
    expect(setup.default_member_permissions).toBeDefined();
    expect(redesign.default_member_permissions).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura da Tropa do CaOS
// ─────────────────────────────────────────────────────────────────────────────
describe("palworld-setup / Tropa do CaOS", () => {
  it("define identidade preto/vermelho", () => {
    expect(palworld.TROPA_IDENTITY.name).toBe("TROPA DO CaOS");
    expect(palworld.TROPA_IDENTITY.symbol).toBe("🐺");
    expect(palworld.TROPA_IDENTITY.accentColor).toBe(0xe4002b);
  });

  it("TROPA_STRUCTURE tem 8 áreas principais e 3 opcionais", () => {
    const cats = palworld.TROPA_STRUCTURE;
    expect(cats).toHaveLength(11);
    const optional = cats.filter((c) => c.optional);
    expect(optional.map((c) => c.key)).toEqual(["orun-lab", "command-center", "musica"]);
    expect(cats.filter((c) => !c.optional)).toHaveLength(8);
  });

  it("planSetup da Tropa não cria áreas opcionais por padrão", () => {
    const plan = palworld.planSetup(makeGuild(), palworld.TROPA_STRUCTURE);
    expect(plan.stats.createCategories).toBe(8);
    expect(plan.stats.createChannels).toBe(30);
    expect(plan.skippedOptional).toBe(3);
  });

  it("planSetup da Tropa com includeOptional cria também as opcionais", () => {
    const plan = palworld.planSetup(makeGuild(), palworld.TROPA_STRUCTURE, { includeOptional: true });
    expect(plan.stats.createCategories).toBe(11);
    expect(plan.stats.createChannels).toBe(42);
    expect(plan.skippedOptional).toBe(0);
  });

  it("buildPreviewEmbeds da Tropa usa a cor vermelha e o título do redesign", () => {
    const plan = palworld.planSetup(makeGuild(), palworld.TROPA_STRUCTURE);
    const embeds = palworld.buildPreviewEmbeds(plan, palworld.TROPA_CTX);
    expect(embeds[0].color).toBe(palworld.TROPA_IDENTITY.accentColor);
    expect(embeds[0].title).toBe("🏴 REDESIGN — TROPA DO CaOS");
  });

  it("buildConfirmRow da Tropa usa os custom ids tropa_*", () => {
    const row = palworld.buildConfirmRow(palworld.TROPA_CTX);
    const ids = row.components.map((b) => b.data.custom_id);
    expect(ids).toContain("tropa_confirm");
    expect(ids).toContain("tropa_cancel");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// planSetup
// ─────────────────────────────────────────────────────────────────────────────
describe("palworld-setup / planSetup", () => {
  it("em servidor vazio planeja criar 9 categorias e 26 canais", () => {
    const plan = palworld.planSetup(makeGuild());
    expect(plan.stats.createCategories).toBe(STRUCTURE_CATEGORIES);
    expect(plan.stats.createChannels).toBe(STRUCTURE_CHANNELS);
    expect(plan.stats.reuseCategories).toBe(0);
    expect(plan.stats.reuseChannels).toBe(0);
    expect(plan.categories).toHaveLength(STRUCTURE_CATEGORIES);
  });

  it("colisão case-insensitive PALS vs pals vira conflito mesmo em servidor vazio", () => {
    const plan = palworld.planSetup(makeGuild());
    expect(plan.conflicts.length).toBeGreaterThan(0);
    const palsCat = plan.categories.find((c) => c.key === "pals");
    const palsCh = palsCat.channels.find((c) => c.key === "pals");
    expect(palsCat.actualName).toBe("🐾・PALS");
    expect(palsCh.actualName).toBe("🐾・pals-2");
    expect(palsCh.conflict).toBe(true);
  });

  it("reutiliza tudo quando a estrutura já existe (idempotência)", () => {
    const channels = [];
    let catIdx = 0;
    for (const cat of palworld.PALWORLD_STRUCTURE) {
      catIdx += 1;
      const catId = `cat-${catIdx}`;
      channels.push(makeChannel({ id: catId, name: cat.name, type: ChannelType.GuildCategory }));
      for (const ch of cat.channels) {
        const type = ch.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
        channels.push(makeChannel({ id: `${catId}-${ch.key}`, name: ch.name, type, parentId: catId }));
      }
    }
    const plan = palworld.planSetup(makeGuild({ channels }));
    expect(plan.stats.createCategories).toBe(0);
    expect(plan.stats.createChannels).toBe(0);
    expect(plan.stats.reuseCategories).toBe(STRUCTURE_CATEGORIES);
    expect(plan.stats.reuseChannels).toBe(STRUCTURE_CHANNELS);
    expect(plan.categories.every((c) => c.action === "reuse")).toBe(true);
  });

  it("nome de canal em uso vira variante segura preservando o existente", () => {
    const channels = [makeChannel({ id: "old-chat", name: "💬・chat-palworld", type: ChannelType.GuildText })];
    const plan = palworld.planSetup(makeGuild({ channels }));
    const servidor = plan.categories.find((c) => c.key === "servidor");
    const chat = servidor.channels.find((c) => c.key === "chat");
    expect(chat.action).toBe("create");
    expect(chat.actualName).toBe("💬・chat-palworld-2");
    expect(chat.conflict).toBe(true);
    expect(plan.conflicts.length).toBeGreaterThan(0);
  });

  it("colisão de case categoria PALS vs canal pals vira nome seguro e é reusável depois", () => {
    const channels = [makeChannel({ id: "pals-ch", name: "🐾・pals", type: ChannelType.GuildText })];
    const plan = palworld.planSetup(makeGuild({ channels }));

    const palsCat = plan.categories.find((c) => c.key === "pals");
    expect(palsCat.action).toBe("create");
    expect(palsCat.actualName).toBe("🐾・PALS-2");
    expect(palsCat.conflict).toBe(true);

    const palsCh = palsCat.channels.find((c) => c.key === "pals");
    expect(palsCh.action).toBe("create");
    expect(palsCh.actualName).toBe("🐾・pals-3");

    // Execução seguinte: reutiliza as variantes (idempotência)
    const secondChannels = [
      ...channels,
      makeChannel({ id: "cat-pals-2", name: "🐾・PALS-2", type: ChannelType.GuildCategory }),
      makeChannel({ id: "pals-3", name: "🐾・pals-3", type: ChannelType.GuildText, parentId: "cat-pals-2" }),
    ];
    const plan2 = palworld.planSetup(makeGuild({ channels: secondChannels }));
    const palsCat2 = plan2.categories.find((c) => c.key === "pals");
    expect(palsCat2.action).toBe("reuse");
    expect(palsCat2.actualName).toBe("🐾・PALS-2");
    const palsCh2 = palsCat2.channels.find((c) => c.key === "pals");
    expect(palsCh2.action).toBe("reuse");
    expect(palsCh2.actualName).toBe("🐾・pals-3");
  });

  it("canal com nome igual ao de categoria bloqueia e gera conflito", () => {
    const channels = [
      makeChannel({ id: "blocker", name: "⚔️・AVENTURA", type: ChannelType.GuildText }),
    ];
    const plan = palworld.planSetup(makeGuild({ channels }));
    const aventura = plan.categories.find((c) => c.key === "aventura");
    expect(aventura.action).toBe("create");
    expect(aventura.actualName).toBe("⚔️・AVENTURA-2");
    expect(aventura.conflictReason).toContain("não é uma categoria");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// executeSetup
// ─────────────────────────────────────────────────────────────────────────────
describe("palworld-setup / executeSetup", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  it("cria 9 categorias e 26 canais em servidor vazio", async () => {
    const guild = makeGuild({ meFlags: FULL_PERMS, withCreate: true });
    const { plan, stats } = await palworld.executeSetup(guild, { log, actor: { tag: "Dono#1", id: "u1" } });
    expect(stats.categoriesCreated).toBe(STRUCTURE_CATEGORIES);
    expect(stats.channelsCreated).toBe(STRUCTURE_CHANNELS);
    expect(stats.reused).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.errorDetails).toHaveLength(0);
    expect(plan.stats.createCategories).toBe(STRUCTURE_CATEGORIES);
    expect(guild.channels.cache.size).toBe(STRUCTURE_CATEGORIES + STRUCTURE_CHANNELS);
    expect(log.info).toHaveBeenCalled();
  });

  it("segunda execução não cria nada (reusa tudo)", async () => {
    const guild = makeGuild({ meFlags: FULL_PERMS, withCreate: true });
    await palworld.executeSetup(guild, { log, actor: { tag: "Dono#1", id: "u1" } });
    const { stats } = await palworld.executeSetup(guild, { log, actor: { tag: "Dono#1", id: "u1" } });
    expect(stats.categoriesCreated).toBe(0);
    expect(stats.channelsCreated).toBe(0);
    expect(stats.errors).toBe(0);
    expect(guild.channels.cache.size).toBe(STRUCTURE_CATEGORIES + STRUCTURE_CHANNELS);
  });

  it("preserva canal existente com nome em conflito", async () => {
    const channels = [makeChannel({ id: "old-chat", name: "💬・chat-palworld", type: ChannelType.GuildText })];
    const guild = makeGuild({ channels, meFlags: FULL_PERMS, withCreate: true });
    const { stats } = await palworld.executeSetup(guild, { log, actor: { tag: "Dono#1", id: "u1" } });
    expect(guild.channels.cache.get("old-chat")).toBeDefined();
    expect(guild.channels.cache.get("old-chat").name).toBe("💬・chat-palworld");
    expect(stats.conflicts).toBeGreaterThan(0);
    expect(guild.channels.cache.size).toBe(1 + STRUCTURE_CATEGORIES + STRUCTURE_CHANNELS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeGuild
// ─────────────────────────────────────────────────────────────────────────────
describe("palworld-setup / analyzeGuild", () => {
  it("contabiliza categorias, canais e canais sem categoria", () => {
    const channels = [
      makeChannel({ id: "c1", name: "📁 Geral", type: ChannelType.GuildCategory }),
      makeChannel({ id: "c2", name: "💬 geral", type: ChannelType.GuildText, parentId: "c1" }),
      makeChannel({ id: "c3", name: "🔊 voz", type: ChannelType.GuildVoice, parentId: "c1" }),
      makeChannel({ id: "c4", name: "💬 solto", type: ChannelType.GuildText }),
    ];
    const data = palworld.analyzeGuild(makeGuild({ channels }));
    expect(data.counts.categories).toBe(1);
    expect(data.counts.channels).toBe(3);
    expect(data.counts.uncategorized).toBe(1);
    expect(data.categories[0].channelCount).toBe(2);
  });

  it("identifica permissões administrativas dos cargos", () => {
    const roles = [
      makeRole({ id: "r1", name: "Fundador", position: 10, flags: [PermissionFlagsBits.Administrator] }),
      makeRole({ id: "r2", name: "Oficial", position: 5, flags: [PermissionFlagsBits.ManageGuild] }),
      makeRole({ id: "r3", name: "Comum", position: 2 }),
    ];
    const data = palworld.analyzeGuild(makeGuild({ roles }));
    expect(data.roles.map((r) => r.name)).toContain("Fundador");
    expect(data.roles.map((r) => r.name)).toContain("Oficial");
    expect(data.roles.map((r) => r.name)).not.toContain("Comum");
  });

  it("lista permissões ausentes do bot", () => {
    const guild = makeGuild({ meFlags: [PermissionFlagsBits.ViewChannel] });
    const data = palworld.analyzeGuild(guild);
    expect(data.bot.missing).toContain("Manage Channels");
    expect(data.bot.permissions[0].has).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Interações (handler)
// ─────────────────────────────────────────────────────────────────────────────
describe("palworld-setup / buildInteractionHandler", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  function makeInteraction({ commandName = null, customId = null, confirmar, memberPerms = true } = {}) {
    const guild = makeGuild({ meFlags: FULL_PERMS, withCreate: true });
    const interaction = {
      guild,
      user: { tag: "Dono#1", id: "u1" },
      isChatInputCommand: () => Boolean(commandName),
      isButton: () => Boolean(customId),
      commandName,
      customId,
      memberPermissions: memberPerms ? makePerms([PermissionFlagsBits.Administrator]) : null,
      options: { getBoolean: () => confirmar },
      reply: vi.fn().mockResolvedValue(undefined),
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      deferUpdate: vi.fn().mockResolvedValue(undefined),
    };
    return { interaction, guild };
  }

  it("responde /servidor-info com embeds efêmeros", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction } = makeInteraction({ commandName: "servidor-info" });
    await handler(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    const args = interaction.reply.mock.calls[0][0];
    expect(args.embeds.length).toBeGreaterThan(0);
  });

  it("responde /preview-palworld com plano e botões", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction } = makeInteraction({ commandName: "preview-palworld" });
    await handler(interaction);
    const args = interaction.reply.mock.calls[0][0];
    expect(args.embeds.length).toBeGreaterThan(0);
    expect(args.components).toHaveLength(1);
  });

  it("/setup-palworld sem confirmar mostra preview", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction } = makeInteraction({ commandName: "setup-palworld", confirmar: undefined });
    await handler(interaction);
    expect(interaction.reply).toHaveBeenCalled();
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });

  it("/setup-palworld confirmar:true cria a estrutura", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ commandName: "setup-palworld", confirmar: true });
    await handler(interaction);
    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalled();
    expect(guild.channels.cache.size).toBe(STRUCTURE_CATEGORIES + STRUCTURE_CHANNELS);
  });

  it("nega criação sem permissão de administrador", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({
      commandName: "setup-palworld",
      confirmar: true,
      memberPerms: false,
    });
    await handler(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
    const content = interaction.reply.mock.calls[0][0].content;
    expect(content).toContain("Administrador");
    expect(guild.channels.cache.size).toBe(0);
  });

  it("botão palworld_confirm executa o setup", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ customId: "palworld_confirm" });
    await handler(interaction);
    expect(interaction.deferUpdate).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalled();
    expect(guild.channels.cache.size).toBe(STRUCTURE_CATEGORIES + STRUCTURE_CHANNELS);
  });

  it("botão palworld_cancel cancela sem criar nada", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ customId: "palworld_cancel" });
    await handler(interaction);
    expect(interaction.deferUpdate).toHaveBeenCalled();
    expect(guild.channels.cache.size).toBe(0);
  });

  it("/preview-redesign mostra plano da Tropa sem criar nada", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ commandName: "preview-redesign" });
    await handler(interaction);
    const args = interaction.reply.mock.calls[0][0];
    expect(args.embeds.length).toBeGreaterThan(0);
    expect(guild.channels.cache.size).toBe(0);
  });

  it("/aplicar-redesign confirmar:true cria a estrutura principal da Tropa", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ commandName: "aplicar-redesign", confirmar: true });
    await handler(interaction);
    expect(interaction.deferReply).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalled();
    expect(guild.channels.cache.size).toBe(8 + 30);
  });

  it("botão tropa_confirm aplica o redesign", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ customId: "tropa_confirm" });
    await handler(interaction);
    expect(interaction.deferUpdate).toHaveBeenCalled();
    expect(guild.channels.cache.size).toBe(8 + 30);
  });

  it("botão tropa_cancel cancela sem criar nada", async () => {
    const handler = palworld.buildInteractionHandler({ log });
    const { interaction, guild } = makeInteraction({ customId: "tropa_cancel" });
    await handler(interaction);
    expect(interaction.deferUpdate).toHaveBeenCalled();
    expect(guild.channels.cache.size).toBe(0);
  });
});
