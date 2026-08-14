// ── CaOS Commander ↔ Discord bridge (Fase 3) ────────────────────────────────
// Cérebro = agente "CaOS Commander" no desktop; mãos = bot Discord.
// O agente inspeciona servidores via tools read-only e executa ações apenas
// com confirm:"yes" (espelho do `confirmar:true` dos comandos do bot).
//
// Regras herdadas dos módulos (não quebrar):
//  - Nada é apagado/renomeado/alterado; tudo é idempotente e reutiliza
//    elementos existentes (nomes com conflito viram sufixos numéricos).
//  - Arquivamento só mexe em elementos rastreados (tropaTracker) e é reversível.
//  - Operações de escrita exigem permissões do bot (View/ManageChannels/ManageRoles).

const { ChannelType, PermissionFlagsBits } = require("discord.js");
const palworld = require("./palworld-setup.cjs");
const tropa = require("./tropa-modules.cjs");

const CONFIRM_TOKEN = "yes";

const AREAS = ["palworld", "tropa", "game", "guild", "roles"];

const WRITE_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
];

let state = { db: null, log: null, discordBot: null };

function init(context = {}) {
  state.db = context.db || null;
  state.log = context.log || null;
  state.discordBot = context.discordBot || null;
  return state;
}

function isConnected() {
  const bot = state.discordBot;
  return Boolean(
    bot &&
    bot.client &&
    typeof bot.client.isReady === "function" &&
    bot.client.isReady() &&
    bot.client.guilds &&
    bot.client.guilds.cache,
  );
}

function getGuild(guildId) {
  if (!isConnected()) {
    throw new Error("O bot do Discord não está conectado. Inicie o Orun OS com o bot ativo e tente novamente.");
  }
  const guild = state.discordBot.client.guilds.cache.get(guildId);
  if (!guild) throw new Error(`Servidor Discord não encontrado: ${guildId}`);
  return guild;
}

function channelTypeLabel(ch) {
  if (!ch || ch.type === undefined || ch.type === null) return "desconhecido";
  if (ch.isThread && ch.isThread()) return "thread";
  switch (ch.type) {
    case ChannelType.GuildText: return "texto";
    case ChannelType.GuildVoice: return "voz";
    case ChannelType.GuildCategory: return "categoria";
    case ChannelType.GuildNews: return "notícias";
    case ChannelType.GuildStageVoice: return "palco";
    case ChannelType.GuildForum: return "fórum";
    default: return String(ch.type);
  }
}

// ── Leitura ────────────────────────────────────────────────────────────────

function listGuilds() {
  if (!isConnected()) return [];
  return [...state.discordBot.client.guilds.cache.values()].map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g.memberCount || 0,
  }));
}

function statusSummary() {
  const ready = isConnected();
  return {
    connected: ready,
    guilds: listGuilds(),
    hint: ready
      ? "Use discord_server_info para inspecionar um servidor ou discord_plan para montar um plano."
      : "Conecte o bot no painel do Discord e aguarde ficar online.",
  };
}

function serverInfo(guildId) {
  const guild = getGuild(guildId);
  const a = palworld.analyzeGuild(guild);
  return {
    name: a.name,
    id: a.id,
    memberCount: a.memberCount,
    ownerId: a.ownerId,
    createdAt: a.createdAt,
    counts: a.counts,
    categories: a.categories.map((c) => ({ id: c.id, name: c.name, channels: c.channelCount })),
    uncategorized: a.uncategorized.length,
    roles: a.roles.map((r) => ({ id: r.id, name: r.name })),
    bot: a.bot,
  };
}

function channelsList(guildId) {
  const guild = getGuild(guildId);
  const channels = [...(guild.channels && guild.channels.cache ? guild.channels.cache.values() : [])];
  const categories = channels
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((x, y) => (x.position || 0) - (y.position || 0))
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      channels: channels
        .filter((c) => c.parentId === cat.id && !(c.isThread && c.isThread()))
        .sort((x, y) => (x.position || 0) - (y.position || 0))
        .map((c) => ({ id: c.id, name: c.name, type: channelTypeLabel(c) })),
    }));
  const uncategorized = channels
    .filter((c) => c.type !== ChannelType.GuildCategory && !c.parentId && !(c.isThread && c.isThread()))
    .sort((x, y) => (x.position || 0) - (y.position || 0))
    .map((c) => ({ id: c.id, name: c.name, type: channelTypeLabel(c) }));
  return { guild: guild.name, categories, uncategorized };
}

function rolesList(guildId) {
  const guild = getGuild(guildId);
  const roles = [...(guild.roles && guild.roles.cache ? guild.roles.cache.values() : [])]
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position || 0,
      color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : null,
      mentionable: Boolean(r.mentionable),
    }));
  return { guild: guild.name, roles };
}

// ── Planejamento (read-only) ───────────────────────────────────────────────

function selectRoleSpecs(roleSet) {
  if (!roleSet || roleSet === "all") return tropa.ROLE_SETS.flatMap((s) => s.roles);
  const set = tropa.ROLE_SETS.find((s) => s.key === roleSet);
  if (!set) {
    throw new Error(`Conjunto de cargos desconhecido: "${roleSet}". Use: ${tropa.ROLE_SETS.map((s) => s.key).join(", ")} ou "all".`);
  }
  return set.roles;
}

function summarizeSetupPlan(plan, label, includeOptional = false) {
  const s = plan.stats;
  let t = `**${label}**\n`;
  t += `- Categorias: criar ${s.createCategories}, reutilizar ${s.reuseCategories}\n`;
  t += `- Canais: criar ${s.createChannels}, reutilizar ${s.reuseChannels}\n`;
  if (!includeOptional && plan.skippedOptional > 0) t += `- Categorias opcionais ignoradas: ${plan.skippedOptional} (use include_optional:true para incluir)\n`;
  if (plan.conflicts.length > 0) {
    t += `- Conflitos resolvidos (elementos existentes preservados): ${plan.conflicts.length}\n`;
    t += plan.conflicts.map((c) => `  • ${c.name} → ${c.resolution}`).join("\n");
  }
  return t;
}

function summarizeAreaPlan(plan, label) {
  const creates = plan.cat.channels.filter((c) => c.action === "create").length;
  const reuses = plan.cat.channels.filter((c) => c.action === "reuse").length;
  let t = `**${label}**\n`;
  t += `- Categoria: ${plan.cat.action === "reuse" ? "reutilizar" : "criar"} "${plan.cat.actualName}"\n`;
  t += `- Canais: criar ${creates}, reutilizar ${reuses}\n`;
  if (plan.conflicts.length > 0) {
    t += `- Conflitos resolvidos (elementos existentes preservados): ${plan.conflicts.length}\n`;
    t += plan.conflicts.map((c) => `  • ${c.name} → ${c.resolution}`).join("\n");
  }
  return t;
}

function summarizeRolesPlan(rolePlan, label = "Cargos") {
  const creates = rolePlan.filter((r) => r.action === "create").length;
  const reuses = rolePlan.filter((r) => r.action === "reuse").length;
  let t = `**${label}**\n`;
  t += `- Cargos: criar ${creates}, reutilizar ${reuses}\n`;
  t += rolePlan.map((r) => `  ${r.action === "reuse" ? "♻️" : "🆕"} ${r.name}`).join("\n");
  return t;
}

function buildAreaPlan(guild, area, args) {
  switch (area) {
    case "palworld": {
      const plan = palworld.planSetup(guild, palworld.PALWORLD_STRUCTURE);
      return { kind: "setup-palworld", plan, label: "Setup Palworld", summary: summarizeSetupPlan(plan, "Setup Palworld") };
    }
    case "tropa": {
      const includeOptional = args.include_optional === true;
      const plan = palworld.planSetup(guild, palworld.TROPA_STRUCTURE, { includeOptional });
      return {
        kind: "setup-tropa",
        plan,
        label: "Setup Tropa do CaOS",
        summary: summarizeSetupPlan(plan, "Setup Tropa do CaOS", includeOptional),
      };
    }
    case "game": {
      if (!args.game || !String(args.game).trim()) throw new Error("Parâmetro obrigatório para área 'game': game.");
      const spec = tropa.gameAreaSpec(args.game);
      const plan = tropa.planArea(guild, spec);
      return { kind: "game", spec, plan, label: `Área do jogo ${spec.clean}`, summary: summarizeAreaPlan(plan, `🎮 ${spec.clean}`) };
    }
    case "guild": {
      if (!args.guild_name || !String(args.guild_name).trim()) throw new Error("Parâmetro obrigatório para área 'guild': guild_name.");
      const color = args.color ? tropa.parseHexColor(args.color) : null;
      const spec = tropa.guildAreaSpec(args.guild_name, color);
      const plan = tropa.planArea(guild, spec);
      const rolePlan = tropa.planRoles(guild, spec.roles);
      const summary = `${summarizeAreaPlan(plan, `⚔️ ${spec.clean}`)}\n${summarizeRolesPlan(rolePlan, `Cargos da guilda ${spec.clean}`)}`;
      return { kind: "guild", spec, plan, rolePlan, label: `Guilda ${spec.clean}`, summary };
    }
    case "roles": {
      const selected = selectRoleSpecs(args.role_set);
      const rolePlan = tropa.planRoles(guild, selected);
      return { kind: "roles", rolePlan, label: "Cargos da comunidade", summary: summarizeRolesPlan(rolePlan, "Cargos da comunidade") };
    }
    default:
      throw new Error(`Área desconhecida: "${area}". Use uma de: ${AREAS.join(", ")}`);
  }
}

function planSummary(guildId, area, args) {
  const guild = getGuild(guildId);
  const info = buildAreaPlan(guild, area, args);
  const detail = {
    area,
    guild: { id: guild.id, name: guild.name },
    plan: info.plan ? info.plan.cat || info.plan.categories || null : null,
    rolePlan: info.rolePlan || null,
  };
  return {
    read_only: true,
    summary: info.summary,
    detail,
    next_step: `Para executar, chame discord_apply com guild_id="${guildId}", area="${area}" e confirm:"${CONFIRM_TOKEN}".`,
  };
}

// ── Ações (com confirmação) ────────────────────────────────────────────────

function checkBotPerms(guild, area) {
  const perms = area === "roles" ? [PermissionFlagsBits.ManageRoles] : WRITE_PERMISSIONS;
  return tropa.missingBotPerms(guild, perms);
}

function refusal() {
  return {
    refused: true,
    reason: `Ação destrutiva/criativa exige confirmação explícita. Chame novamente com confirm:"${CONFIRM_TOKEN}" para executar.`,
    hint: "Nenhum elemento foi criado ou alterado.",
  };
}

async function applyArea(guild, area, args) {
  if (args.confirm !== CONFIRM_TOKEN) return refusal();

  const missing = checkBotPerms(guild, area);
  if (missing.length) {
    return {
      error: `O bot não possui as permissões necessárias: ${missing.join(", ")}. Nenhum elemento foi alterado.`,
      missing,
    };
  }

  const info = buildAreaPlan(guild, area, args);

  if (info.kind === "setup-palworld" || info.kind === "setup-tropa") {
    const structure = info.kind === "setup-palworld" ? palworld.PALWORLD_STRUCTURE : palworld.TROPA_STRUCTURE;
    const res = await palworld.executeSetup(guild, {
      structure,
      log: state.log,
      includeOptional: args.include_optional === true,
    });
    return {
      ok: true,
      area,
      summary: info.summary,
      stats: res.stats,
      tracker_updated: false,
    };
  }

  if (info.kind === "game") {
    const { categoryId, executed } = await tropa.executeArea(guild, info.plan, state.log, `Criar jogo "${info.spec.clean}" (Orun OS)`);
    tropa.addGame(state.db, guild.id, {
      slug: info.spec.slug,
      name: info.spec.clean,
      categoryId,
      channelIds: executed.channels.map((c) => c.id),
      archived: false,
      createdAt: Date.now(),
    });
    if (state.log && typeof state.log.info === "function") state.log.info("[discord-bridge] jogo criado", { servidor: guild.name, jogo: info.spec.clean });
    return { ok: true, area: "game", game: info.spec.clean, category_id: categoryId, channels_created: executed.channels.length, tracker_updated: true };
  }

  if (info.kind === "guild") {
    const { categoryId, executed } = await tropa.executeArea(guild, info.plan, state.log, `Criar guilda "${info.spec.clean}" (Orun OS)`);
    const created = await tropa.executeRoles(guild, info.rolePlan, state.log, `Cargos da guilda "${info.spec.clean}" (Orun OS)`);
    const roleIds = tropa.resolveRoleIds(info.rolePlan, created);
    if (args.leader_id && roleIds.lider) await tropa.assignRole(guild, args.leader_id, roleIds.lider);
    tropa.addGuild(state.db, guild.id, {
      slug: info.spec.slug,
      name: info.spec.clean,
      categoryId,
      channelIds: executed.channels.map((c) => c.id),
      roleIds: Object.values(roleIds).filter(Boolean),
      createdAt: Date.now(),
    });
    if (state.log && typeof state.log.info === "function") state.log.info("[discord-bridge] guilda criada", { servidor: guild.name, guilda: info.spec.clean });
    return { ok: true, area: "guild", guild: info.spec.clean, category_id: categoryId, channels_created: executed.channels.length, roles_created: created.length, tracker_updated: true };
  }

  // roles
  const created = await tropa.executeRoles(guild, info.rolePlan, state.log, "Cargos da Tropa do CaOS (Orun OS)");
  for (const r of created) tropa.addRole(state.db, guild.id, r.id, r.name);
  if (state.log && typeof state.log.info === "function") state.log.info("[discord-bridge] cargos criados", { servidor: guild.name, criados: created.length });
  return { ok: true, area: "roles", roles_created: created.length, tracker_updated: true };
}

async function archiveGame(guildId, args) {
  if (args.confirm !== CONFIRM_TOKEN) return refusal();
  const guild = getGuild(guildId);

  const t = tropa.getTracker(state.db, guild.id);
  const slug = tropa.slugify(args.game);
  const game = t.games.find((g) => g.slug === slug);
  if (!game) {
    return {
      refused: true,
      reason: `"${args.game}" não foi criado pelo sistema — só arquivo áreas de jogo rastreadas (criadas pelo bot). Elementos criados manualmente ficam protegidos.`,
    };
  }
  if (game.archived) return { ok: true, game: game.name, already_archived: true };

  const channels = guild.channels && guild.channels.cache ? guild.channels.cache : new Map();
  const cat = channels.get(game.categoryId) || null;
  if (!cat) {
    return { error: `A categoria de "${game.name}" não foi encontrada (foi removida manualmente?).` };
  }

  const missing = tropa.missingBotPerms(guild, WRITE_PERMISSIONS);
  if (missing.length) {
    return { error: `O bot não possui as permissões necessárias: ${missing.join(", ")}. Nenhum elemento foi alterado.`, missing };
  }

  const res = await tropa.executeArchive(guild, game, cat, state.log);
  game.archived = true;
  tropa.addGame(state.db, guild.id, game);
  if (state.log && typeof state.log.info === "function") state.log.info("[discord-bridge] jogo arquivado", { servidor: guild.name, jogo: game.name });
  return { ok: true, game: game.name, archived: true, archive_category_id: res.archiveCategoryId };
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

async function execute(name, args = {}) {
  try {
    switch (name) {
      case "status":
        return statusSummary();
      case "server_info":
        return serverInfo(args.guild_id);
      case "channels":
        return channelsList(args.guild_id);
      case "roles":
        return rolesList(args.guild_id);
      case "plan":
        return planSummary(args.guild_id, args.area, args);
      case "apply":
        return applyArea(getGuild(args.guild_id), args.area, args);
      case "archive_game":
        return archiveGame(args.guild_id, args);
      default:
        return { error: `Ferramenta desconhecida: ${name}` };
    }
  } catch (err) {
    if (state.log && typeof state.log.error === "function") state.log.error("[discord-bridge]", err.message);
    return { error: err.message || "Erro ao executar ação no Discord." };
  }
}

// ── Tool definitions (OpenAI format) ───────────────────────────────────────

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "discord_status",
      description:
        "Verifica se o bot do Discord está conectado e lista os servidores (guilds) disponíveis com id, nome e número de membros. Sempre chame primeiro para descobrir guild_id.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_server_info",
      description:
        "Analisa um servidor Discord: contagem de categorias/canais/cargos, canais por categoria, cargos com permissões administrativas e permissões atuais do bot. Use para inspecionar antes de planejar.",
      parameters: {
        type: "object",
        properties: { guild_id: { type: "string", description: "ID do servidor Discord" } },
        required: ["guild_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_channels",
      description: "Lista todos os canais de um servidor Discord, agrupados por categoria, com id, nome e tipo (texto/voz/categoria).",
      parameters: {
        type: "object",
        properties: { guild_id: { type: "string", description: "ID do servidor Discord" } },
        required: ["guild_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_roles",
      description: "Lista todos os cargos de um servidor Discord com id, nome, posição e cor.",
      parameters: {
        type: "object",
        properties: { guild_id: { type: "string", description: "ID do servidor Discord" } },
        required: ["guild_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_plan",
      description:
        "Gera um plano SOMENTE DE LEITURA de estrutura para um servidor Discord. areas: palworld (estrutura Palworld), tropa (estrutura da Tropa do CaOS; use include_optional:true p/ categorias opcionais), game (área de jogo; informe game), guild (área de guilda; informe guild_name, color opcional), roles (cargos da comunidade; role_set: comando|comunidade|live|all). NADA é criado — apenas o que seria feito.",
      parameters: {
        type: "object",
        properties: {
          guild_id: { type: "string", description: "ID do servidor Discord" },
          area: { type: "string", enum: AREAS, description: "Área a planejar" },
          game: { type: "string", description: "Nome do jogo (área game)" },
          guild_name: { type: "string", description: "Nome da guilda (área guild)" },
          color: { type: "string", description: "Cor hex da guilda, ex.: #e4002b (área guild, opcional)" },
          include_optional: { type: "boolean", description: "Incluir categorias opcionais na área tropa (opcional)" },
          role_set: { type: "string", enum: ["comando", "comunidade", "live", "all"], description: "Conjunto de cargos (área roles; padrão all)" },
        },
        required: ["guild_id", "area"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_apply",
      description:
        "EXECUTA a criação de estrutura no servidor Discord (idempotente e não destrutiva: reutiliza elementos existentes e preserva o que já está lá). EXIGE confirm:\"yes\". Sempre mostre ao usuário o resultado de discord_plan e obtenha confirmação no chat ANTES de chamar. areas: palworld, tropa, game (game), guild (guild_name, color, leader_id), roles (role_set).",
      parameters: {
        type: "object",
        properties: {
          guild_id: { type: "string", description: "ID do servidor Discord" },
          area: { type: "string", enum: AREAS, description: "Área a executar" },
          game: { type: "string", description: "Nome do jogo (área game)" },
          guild_name: { type: "string", description: "Nome da guilda (área guild)" },
          color: { type: "string", description: "Cor hex da guilda (área guild, opcional)" },
          leader_id: { type: "string", description: "ID do usuário líder para receber o cargo 👑 Líder (área guild, opcional)" },
          include_optional: { type: "boolean", description: "Incluir categorias opcionais na área tropa (opcional)" },
          role_set: { type: "string", enum: ["comando", "comunidade", "live", "all"], description: "Conjunto de cargos (área roles; padrão all)" },
          confirm: { type: "string", description: `Obrigatório: "${CONFIRM_TOKEN}" para executar` },
        },
        required: ["guild_id", "area", "confirm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "discord_archive_game",
      description:
        "Arquiva a área de um jogo criada pelo sistema (rastreada): move a categoria para a área de arquivo e esconde de @everyone. Só funciona para jogos criados pelo bot; elementos manuais ficam protegidos. EXIGE confirm:\"yes\".",
      parameters: {
        type: "object",
        properties: {
          guild_id: { type: "string", description: "ID do servidor Discord" },
          game: { type: "string", description: "Nome do jogo a arquivar" },
          confirm: { type: "string", description: `Obrigatório: "${CONFIRM_TOKEN}" para executar` },
        },
        required: ["guild_id", "game", "confirm"],
      },
    },
  },
];

module.exports = {
  init,
  execute,
  isConnected,
  TOOL_DEFINITIONS,
};
