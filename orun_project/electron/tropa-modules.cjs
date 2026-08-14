// electron/tropa-modules.cjs
//
// Fase 2 — Módulos da comunidade para o bot Discord do Orun OS.
// Comandos: /criar-jogo, /arquivar-jogo, /criar-guilda, /setup-cargos, /painel.
//
// Regras de segurança (prioridade máxima):
//  - NUNCA apagar, renomear, mover ou alterar permissões de elementos existentes.
//  - Arquivar SÓ mexe em elementos CRIADOS PELO SISTEMA (rastreados em
//    `tropaTracker` no banco). Elementos criados manualmente ficam protegidos.
//  - Nada é criado sem confirmação explícita (botão ou `confirmar:true`).
//  - Idempotente: executar várias vezes não cria duplicatas.

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");
const palworld = require("./palworld-setup.cjs");

const { norm, findVariant, nextSafeName, buildNameIndex } = palworld._internals;

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const TRACKER_KEY = "tropaTracker";
const ARCHIVE_CATEGORY_NAME = "📦・𝐀𝐑𝐐𝐔𝐈𝐕𝐀𝐃𝐎𝐒";

const GAME_CHANNELS = [
  { key: "avisos", name: "📢・avisos-", type: "text" },
  { key: "chat", name: "💬・chat-", type: "text" },
  { key: "clips", name: "🎬・clips-", type: "text" },
  { key: "voz", name: "🔊・voz-", type: "voice" },
];

const GUILD_CHANNELS = [
  { key: "avisos", name: "📢・avisos-", type: "text" },
  { key: "chat", name: "💬・chat-", type: "text" },
  { key: "estrategias", name: "⚔️・estrategias-", type: "text" },
  { key: "ranking", name: "🏆・ranking-", type: "text" },
  { key: "recrutamento", name: "🔎・recrutamento-", type: "text" },
];

const GUILD_ROLES = [
  { key: "lider", name: "👑 Líder · ", color: 0xe4002b },
  { key: "capitao", name: "⚔️ Capitão · ", color: 0xf39c12 },
  { key: "membro", name: "🛡️ Membro · ", color: 0x2ecc71 },
  { key: "recruta", name: "🎯 Recruta · ", color: 0x95a5a6 },
];

// Cargos da comunidade (/setup-cargos). Os cargos de GUILDAS NÃO entram aqui:
// eles são criados por guilda via /criar-guilda.
const ROLE_SETS = [
  {
    key: "comando", label: "👑 COMANDO",
    roles: [
      { key: "fundador", name: "👑 Fundador", color: 0xe4002b },
      { key: "comandante", name: "🐺 Comandante", color: 0xc3002f },
      { key: "oficial", name: "🛡️ Oficial", color: 0xff6b35 },
    ],
  },
  {
    key: "comunidade", label: "⚔️ COMUNIDADE",
    roles: [
      { key: "membro", name: "⚔️ Membro", color: 0x2b6cb0 },
      { key: "veterano", name: "🔥 Veterano", color: 0xe67e22 },
      { key: "elite", name: "🏆 Elite", color: 0xf1c40f },
    ],
  },
  {
    key: "live", label: "🔴 LIVE",
    roles: [
      { key: "streamer", name: "🔴 Streamer", color: 0xe4002b },
      { key: "criador", name: "🎥 Criador", color: 0x9b59b6 },
      { key: "vip", name: "⭐ VIP", color: 0x2ecc71 },
    ],
  },
];

const WRITE_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
];

const PERMISSION_LABELS = new Map([
  [PermissionFlagsBits.ViewChannel, "View Channels"],
  [PermissionFlagsBits.ManageChannels, "Manage Channels"],
  [PermissionFlagsBits.ManageRoles, "Manage Permissions"],
]);

const CONFIRM_LABELS = {
  criar_jogo: "✅ CRIAR JOGO",
  criar_guilda: "✅ CRIAR GUILDA",
  arquivar_jogo: "📦 ARQUIVAR",
  setup_cargos: "✅ CRIAR CARGOS",
};

const PANEL_BUTTONS = [
  { key: "games", label: "Jogos", emoji: "🎮" },
  { key: "guilds", label: "Guildas", emoji: "⚔️" },
  { key: "lives", label: "Lives", emoji: "🔴" },
  { key: "orun", label: "Orun", emoji: "🤖" },
  { key: "admin", label: "Administração", emoji: "⚙️" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de nome
// ─────────────────────────────────────────────────────────────────────────────
function cleanName(input) {
  let s = String(input || "").trim();
  s = s.replace(/[#@:]+/g, "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return s.slice(0, 60);
}

function slugify(input) {
  const s = String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "jogo";
}

function parseHexColor(input) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(input || "").trim());
  return m ? parseInt(m[1], 16) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Especificações de área (jogo / guilda)
// ─────────────────────────────────────────────────────────────────────────────
function gameAreaSpec(nome) {
  const clean = cleanName(nome);
  const slug = slugify(nome);
  return {
    kind: "game",
    clean,
    slug,
    categoryName: `🎮・${clean}`,
    channels: GAME_CHANNELS.map((c) => ({ key: c.key, name: `${c.name}${slug}`, type: c.type })),
  };
}

function guildAreaSpec(nome, color) {
  const clean = cleanName(nome);
  const slug = slugify(nome);
  return {
    kind: "guild",
    clean,
    slug,
    categoryName: `⚔️・${clean}`,
    channels: GUILD_CHANNELS.map((c) => ({ key: c.key, name: `${c.name}${slug}`, type: c.type })),
    roles: GUILD_ROLES.map((r) => ({
      key: r.key,
      name: `${r.name}${clean}`,
      color: r.key === "lider" && color ? color : r.color,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracker (sistema de proteção) — elementos criados pelo bot
// ─────────────────────────────────────────────────────────────────────────────
function getTracker(db, guildId) {
  if (!db || typeof db.getSetting !== "function") return { games: [], guilds: [], roles: [] };
  const all = db.getSetting(TRACKER_KEY, {}) || {};
  if (!all[guildId]) all[guildId] = { games: [], guilds: [], roles: [] };
  return all[guildId];
}

function saveTracker(db, guildId, data) {
  if (!db || typeof db.setSetting !== "function") return;
  const all = db.getSetting(TRACKER_KEY, {}) || {};
  all[guildId] = data;
  db.setSetting(TRACKER_KEY, all);
}

function isSystemCreated(db, guildId, id) {
  const t = getTracker(db, guildId);
  const owned = new Set();
  for (const g of t.games) {
    owned.add(g.categoryId);
    for (const c of g.channelIds || []) owned.add(c);
  }
  for (const g of t.guilds) {
    owned.add(g.categoryId);
    for (const c of g.channelIds || []) owned.add(c);
    for (const r of g.roleIds || []) owned.add(r);
  }
  for (const r of t.roles) owned.add(r.id);
  return owned.has(id);
}

function addGame(db, guildId, entry) {
  const t = getTracker(db, guildId);
  const existing = t.games.find((g) => g.slug === entry.slug);
  if (existing) Object.assign(existing, entry);
  else t.games.push(entry);
  saveTracker(db, guildId, t);
}

function addGuild(db, guildId, entry) {
  const t = getTracker(db, guildId);
  const existing = t.guilds.find((g) => g.slug === entry.slug);
  if (existing) Object.assign(existing, entry);
  else t.guilds.push(entry);
  saveTracker(db, guildId, t);
}

function addRole(db, guildId, id, name) {
  const t = getTracker(db, guildId);
  if (!t.roles.some((r) => r.id === id)) t.roles.push({ id, name, createdAt: Date.now() });
  saveTracker(db, guildId, t);
}

// ─────────────────────────────────────────────────────────────────────────────
// Planejamento (somente leitura) — categoria + canais
// ─────────────────────────────────────────────────────────────────────────────
function planArea(guild, spec) {
  const channels = [...(guild.channels && guild.channels.cache ? guild.channels.cache.values() : [])];
  const nameIndex = buildNameIndex(channels);
  const planned = new Set();
  const conflicts = [];

  const reusedCat = findVariant(spec.categoryName, channels, { type: ChannelType.GuildCategory });
  let cat;
  if (reusedCat) {
    const viaVariant = norm(reusedCat.name) !== norm(spec.categoryName);
    cat = {
      key: spec.kind,
      action: "reuse",
      actualName: reusedCat.name,
      id: reusedCat.id,
      conflict: viaVariant,
      channels: [],
    };
    if (viaVariant) {
      conflicts.push({ name: spec.categoryName, resolution: `A categoria existente "${reusedCat.name}" será reutilizada sem alterações.` });
    }
  } else {
    const blocker = (nameIndex.get(norm(spec.categoryName)) || []).find((c) => c.type !== ChannelType.GuildCategory);
    const actualName = nextSafeName(spec.categoryName, nameIndex, planned);
    planned.add(norm(actualName));
    cat = {
      key: spec.kind,
      action: "create",
      actualName,
      id: null,
      conflict: Boolean(blocker),
      channels: [],
    };
    if (blocker) {
      conflicts.push({ name: spec.categoryName, resolution: `Canal existente preservado; a categoria será criada como "${actualName}".` });
    }
  }

  const parentId = reusedCat ? reusedCat.id : null;
  for (const chSpec of spec.channels) {
    const chType = chSpec.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
    let entry = null;

    if (parentId) {
      const found = findVariant(chSpec.name, channels, { type: chType, parentId });
      if (found) {
        entry = {
          key: chSpec.key,
          action: "reuse",
          actualName: found.name,
          id: found.id,
          type: chType,
          conflict: norm(found.name) !== norm(chSpec.name),
        };
      }
    }

    if (!entry) {
      const inCat = parentId ? channels.find((c) => c.parentId === parentId && norm(c.name) === norm(chSpec.name)) : null;
      const globalCollision = (nameIndex.get(norm(chSpec.name)) || []).some((c) => c !== inCat);
      const blocked = Boolean(inCat) || globalCollision || planned.has(norm(chSpec.name)) || norm(chSpec.name) === norm(cat.actualName);
      const actualName = nextSafeName(chSpec.name, nameIndex, planned);
      planned.add(norm(actualName));
      entry = {
        key: chSpec.key,
        action: "create",
        actualName,
        id: null,
        type: chType,
        conflict: blocked,
      };
      if (blocked) {
        conflicts.push({ name: chSpec.name, resolution: `O elemento existente foi preservado; será criado "${actualName}".` });
      }
    }
    cat.channels.push(entry);
  }

  return {
    cat,
    conflicts,
    stats: {
      create: (cat.action === "create" ? 1 : 0) + cat.channels.filter((c) => c.action === "create").length,
      reuse: (cat.action === "reuse" ? 1 : 0) + cat.channels.filter((c) => c.action === "reuse").length,
    },
  };
}

async function executeArea(guild, plan, log, reason) {
  const executed = { category: null, channels: [] };
  let categoryId = plan.cat.id;
  if (plan.cat.action === "create") {
    const created = await palworld.createWithNameFallback(
      guild,
      { name: plan.cat.actualName, type: ChannelType.GuildCategory, reason },
      log,
    );
    categoryId = created.id;
    executed.category = created;
  }
  for (const ch of plan.cat.channels) {
    if (ch.action === "reuse") continue;
    const created = await palworld.createWithNameFallback(
      guild,
      { name: ch.actualName, type: ch.type, parent: categoryId, reason },
      log,
    );
    executed.channels.push(created);
  }
  return { categoryId, executed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Planejamento / execução de cargos
// ─────────────────────────────────────────────────────────────────────────────
function planRoles(guild, roleSpecs) {
  const existing = new Map(
    [...(guild.roles && guild.roles.cache ? guild.roles.cache.values() : [])].map((r) => [norm(r.name), r]),
  );
  return roleSpecs.map((spec) => {
    const found = existing.get(norm(spec.name));
    return found
      ? { key: spec.key, action: "reuse", name: found.name, id: found.id, color: spec.color }
      : { key: spec.key, action: "create", name: spec.name, id: null, color: spec.color };
  });
}

async function executeRoles(guild, rolePlan, log, reason) {
  const created = [];
  for (const rp of rolePlan) {
    if (rp.action === "reuse") continue;
    try {
      const role = await guild.roles.create({
        name: rp.name,
        color: rp.color,
        mentionable: false,
        hoist: false,
        reason,
      });
      created.push(role);
    } catch (err) {
      if (log && typeof log.error === "function") log.error("[tropa] erro ao criar cargo:", err.message);
      throw err;
    }
  }
  return created;
}

function resolveRoleIds(rolePlan, created) {
  const byName = new Map(created.map((r) => [norm(r.name), r.id]));
  const result = {};
  for (const rp of rolePlan) {
    if (rp.action === "reuse") result[rp.key] = rp.id;
    else result[rp.key] = byName.get(norm(rp.name)) || null;
  }
  return result;
}

async function assignRole(guild, userId, roleId) {
  try {
    let member = null;
    if (guild.members && guild.members.cache) member = guild.members.cache.get(userId) || null;
    if (!member && guild.members && typeof guild.members.fetch === "function") member = await guild.members.fetch(userId);
    if (member && member.roles && typeof member.roles.add === "function") await member.roles.add(roleId);
  } catch {
    // não bloqueia a criação da guilda
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Arquivamento de jogo (reversível; só mexe em elementos rastreados)
// ─────────────────────────────────────────────────────────────────────────────
async function executeArchive(guild, game, cat, log) {
  const channels = [...(guild.channels && guild.channels.cache ? guild.channels.cache.values() : [])];
  const reason = `Arquivar jogo "${game.name}" (Orun OS)`;

  let archiveCat = findVariant(ARCHIVE_CATEGORY_NAME, channels, { type: ChannelType.GuildCategory });
  if (!archiveCat) {
    archiveCat = await palworld.createWithNameFallback(
      guild,
      { name: ARCHIVE_CATEGORY_NAME, type: ChannelType.GuildCategory, reason },
      log,
    );
  }

  if (archiveCat.permissionOverwrites && typeof archiveCat.permissionOverwrites.create === "function" && guild.roles && guild.roles.everyone) {
    const everyone = guild.roles.everyone;
    const current = archiveCat.permissionOverwrites.cache ? archiveCat.permissionOverwrites.cache.get(everyone.id) : null;
    const alreadyDenied = current && current.deny && current.deny.has(PermissionFlagsBits.ViewChannel);
    if (!alreadyDenied) {
      await archiveCat.permissionOverwrites.create(everyone.id, { ViewChannel: false });
    }
  }

  if (cat && typeof cat.setParent === "function") {
    await cat.setParent(archiveCat.id, { lockPermissions: false });
  }

  return { archiveCategoryId: archiveCat.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Permissões
// ─────────────────────────────────────────────────────────────────────────────
function missingBotPerms(guild, flags) {
  const me = guild.members && guild.members.me ? guild.members.me : null;
  if (!me || !me.permissions) return [];
  return flags.filter((f) => !me.permissions.has(f)).map((f) => PERMISSION_LABELS.get(f) || String(f));
}

function requireManager(interaction) {
  if (palworld.canManageGuild(interaction)) return true;
  interaction.reply({
    content: "❌ Você precisa da permissão **Administrador** ou **Gerenciar Servidor**.",
    ephemeral: true,
  });
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Embeds
// ─────────────────────────────────────────────────────────────────────────────
function buildAreaPreviewEmbeds(plan, { title, color, kindLabel, confirmLabel }) {
  const sections = [];
  const s = plan.stats;
  let header = `**📁 ${kindLabel}:** ${s.create} para criar · ${s.reuse} reutilizado(s)\n`;
  if (plan.conflicts.length) header += `**⚠️ Conflitos detectados:** ${plan.conflicts.length}\n`;
  header += "\n> Nenhum elemento existente será alterado. **Nada será criado até você confirmar.**\n";
  sections.push(header);

  const cat = plan.cat;
  let catLine = `${cat.action === "reuse" ? "♻️" : cat.conflict ? "⚠️" : "🆕"} 📁 ${cat.actualName}`;
  if (cat.action === "reuse") catLine += " *(reutilizada)*";
  else if (cat.conflict) catLine += " *(nome seguro)*";
  const chLines = cat.channels
    .map((ch) => {
      const icon = ch.type === ChannelType.GuildVoice ? "🔊" : "💬";
      let line = `   ${ch.action === "reuse" ? "♻️" : ch.conflict ? "⚠️" : "🆕"} ${icon} ${ch.actualName}`;
      if (ch.action === "reuse") line += " *(reutilizado)*";
      else if (ch.conflict) line += " *(nome seguro)*";
      return line;
    })
    .join("\n");
  sections.push(chLines ? `${catLine}\n${chLines}` : catLine);

  if (plan.conflicts.length) {
    let cText = "**⚠️ CONFLITOS ENCONTRADOS**\n";
    for (const c of plan.conflicts) {
      cText += `- **"${c.name}"** já existe. Nenhum elemento existente será alterado. ${c.resolution}\n`;
    }
    sections.push(cText);
  }

  sections.push(`**ℹ️ Para confirmar:** clique em **${confirmLabel}** abaixo, ou use \`confirmar:true\` no comando.`);
  return palworld.sectionsToEmbeds(sections, { color, title });
}

function buildAreaReportEmbeds(plan, executed, { title, color, kindLabel }) {
  const createdCount = (executed.category ? 1 : 0) + executed.channels.length;
  const already = createdCount === 0 && plan.stats.reuse > 0;
  const sections = [];
  sections.push(
    `${already ? "♻️ Já estava pronto — nada novo foi necessário." : "✅ Concluído!"}\n\n` +
      `📁 ${kindLabel}: ${createdCount} criado(s)\n` +
      `♻️ Reutilizados: ${plan.stats.reuse}\n` +
      `⚠️ Conflitos (existentes preservados): ${plan.conflicts.length}`,
  );
  if (plan.conflicts.length) {
    let cText = "**⚠️ CONFLITOS ENCONTRADOS**\n";
    for (const c of plan.conflicts) {
      cText += `- **"${c.name}"** já existia e não foi alterado. ${c.resolution}\n`;
    }
    sections.push(cText);
  }
  sections.push("> Nenhum elemento existente foi alterado.");
  return palworld.sectionsToEmbeds(sections, { color, title });
}

function buildRolesPreviewEmbeds(rolePlan, sets) {
  const sections = [];
  const createCount = rolePlan.filter((r) => r.action === "create").length;
  const reuseCount = rolePlan.filter((r) => r.action === "reuse").length;
  sections.push(
    `**🏷️ Cargos:** ${createCount} para criar · ${reuseCount} reutilizados\n\n` +
      "> Nenhum cargo existente será alterado. **Nada será criado até você confirmar.**",
  );
  for (const set of sets) {
    let text = `**${set.label}**\n`;
    for (const spec of set.roles) {
      const entry = rolePlan.find((r) => r.key === spec.key);
      if (!entry) continue;
      text += `${entry.action === "reuse" ? "♻️" : "🆕"} ${entry.name}\n`;
    }
    sections.push(text);
  }
  sections.push("**ℹ️ Para confirmar:** clique em **✅ CRIAR CARGOS** abaixo, ou use `/setup-cargos confirmar:true`.");
  return palworld.sectionsToEmbeds(sections, { color: 0x9b59b6, title: "🏷️ CARGOS DA TROPA DO CaOS" });
}

function buildRolesReportEmbeds(rolePlan, created) {
  const createCount = rolePlan.filter((r) => r.action === "create").length;
  const reuseCount = rolePlan.filter((r) => r.action === "reuse").length;
  const sections = [];
  sections.push(
    `✅ Cargos criados: ${createCount}\n♻️ Reutilizados: ${reuseCount}\n\n> Nenhum cargo existente foi alterado.`,
  );
  let text = "";
  for (const rp of rolePlan) text += `${rp.action === "reuse" ? "♻️" : "🆕"} ${rp.name}\n`;
  sections.push(text);
  return palworld.sectionsToEmbeds(sections, { color: 0x57f287, title: "🏷️ CARGOS DA TROPA DO CaOS" });
}

function buildArchivePreviewEmbeds(game, cat) {
  const sections = [];
  sections.push(
    `📦 **${game.name}** será arquivado:\n\n` +
      `🗂️ A categoria **${cat.name}** será movida para **${ARCHIVE_CATEGORY_NAME}** e ficará oculta do @everyone.\n\n` +
      "> O arquivamento é **reversível** e **nada é apagado**. Elementos criados por você permanecem intactos.",
  );
  return palworld.sectionsToEmbeds(sections, { color: 0x5865f2, title: `📦 ARQUIVAR — ${game.name}` });
}

function buildArchiveReportEmbeds(game) {
  const sections = [
    `📦 **${game.name}** arquivado com sucesso.\n\n` +
      `🗂️ Categoria movida para **${ARCHIVE_CATEGORY_NAME}** e oculta do @everyone.\n\n` +
      "> Nada foi apagado. Para desarquivar, mova a categoria de volta manualmente (ou aguarde uma próxima fase).",
  ];
  return palworld.sectionsToEmbeds(sections, { color: 0x5865f2, title: `📦 ARQUIVADO — ${game.name}` });
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel
// ─────────────────────────────────────────────────────────────────────────────
function presenceCounts(guild) {
  const members = [...(guild.members && guild.members.cache ? guild.members.cache.values() : [])];
  if (!members.length) return null;
  let online = 0;
  let gaming = 0;
  let live = 0;
  for (const m of members) {
    if (!m.presence) continue;
    const st = m.presence.status;
    if (st === "online" || st === "idle" || st === "dnd") online += 1;
    for (const a of m.presence.activities || []) {
      if (a.type === 0) gaming += 1;
      else if (a.type === 1) live += 1;
    }
  }
  return { online, gaming, live };
}

function countChannelsByType(guild, type) {
  const cache = guild.channels && guild.channels.cache ? guild.channels.cache : null;
  if (!cache) return "—";
  if (typeof cache.filter === "function") return cache.filter((c) => c.type === type).size;
  let n = 0;
  for (const c of cache.values()) if (c.type === type) n += 1;
  return n;
}

function buildPanelEmbeds(guild, tracker) {
  const activeGames = tracker.games.filter((g) => !g.archived).length;
  const archivedGames = tracker.games.length - activeGames;
  const sections = [];

  let header = `🐺 **${guild.name}**\n\n`;
  header += `👥 Membros: **${guild.memberCount}**\n`;
  const pc = presenceCounts(guild);
  if (pc) header += `🟢 Online: **${pc.online}** · 🎮 Jogando: **${pc.gaming}**${pc.live ? ` · 🔴 Live: **${pc.live}**` : ""}\n`;
  header += `🎮 Jogos ativos: **${activeGames}**${archivedGames ? ` *(📦 ${archivedGames} arquivados)*` : ""}\n`;
  header += `⚔️ Guildas: **${tracker.guilds.length}**\n`;
  header += `🔴 Lives: **0** *(integração em breve)*\n`;
  header += `📁 Categorias: **${countChannelsByType(guild, ChannelType.GuildCategory)}** · 💬 Canais: **${countChannelsByType(guild, ChannelType.GuildText) + countChannelsByType(guild, ChannelType.GuildVoice)}**\n`;
  header += "\n> Use os botões abaixo para detalhes.\n";
  sections.push(header);

  return palworld.sectionsToEmbeds(sections, { color: 0xe4002b, title: "🖥️ PAINEL DA TROPA DO CaOS" });
}

function buildPanelDetailEmbeds(key, guild, tracker) {
  if (key === "games") {
    const games = tracker.games;
    let text = games.length ? "" : "Nenhum jogo criado via sistema ainda. Use `/criar-jogo`.\n";
    for (const g of games) {
      text += `${g.archived ? "📦" : "🎮"} **${g.name}** ${g.archived ? "*(arquivado)*" : ""} — <#${g.categoryId}>\n`;
    }
    return palworld.sectionsToEmbeds([text], { color: 0xe67e22, title: "🎮 JOGOS" });
  }
  if (key === "guilds") {
    const guilds = tracker.guilds;
    let text = guilds.length ? "" : "Nenhuma guilda criada via sistema ainda. Use `/criar-guilda`.\n";
    for (const g of guilds) {
      text += `⚔️ **${g.name}** — <#${g.categoryId}> · ${g.channelIds.length} canais · ${g.roleIds.length} cargos\n`;
    }
    return palworld.sectionsToEmbeds([text], { color: 0xf39c12, title: "⚔️ GUILDAS" });
  }
  if (key === "lives") {
    return palworld.sectionsToEmbeds(
      ["🔴 Integração de lives (YouTube/Twitch) chega numa próxima fase.\n\nEnquanto isso, os canais de live da estrutura já estão prontos: 📅 agenda e 📢 notificações."],
      { color: 0xe4002b, title: "🔴 LIVES" },
    );
  }
  if (key === "orun") {
    return palworld.sectionsToEmbeds(
      ["🤖 **Orun OS** — assistente pessoal multi-agente.\n\n• O agente **CaOS Commander** chega numa próxima fase e poderá operar este servidor pelo desktop.\n• Este bot é o *braço* da comunidade no Discord."],
      { color: 0x0b0b0f, title: "🤖 ORUN" },
    );
  }
  const commands = [
    "`/criar-jogo` — cria área de jogo",
    "`/arquivar-jogo` — arquiva jogo criado pelo sistema",
    "`/criar-guilda` — cria guilda + cargos",
    "`/setup-cargos` — cria cargos da comunidade",
    "`/painel` — este painel",
    "`/servidor-info` — diagnóstico (somente leitura)",
    "`/preview-redesign` e `/aplicar-redesign` — estrutura da Tropa",
    "`/preview-palworld` e `/setup-palworld` — área Palworld",
  ];
  return palworld.sectionsToEmbeds(
    [`⚙️ **COMANDOS DE ADMINISTRAÇÃO**\n\n${commands.join("\n")}\n\n> Somente quem tem **Administrador** ou **Gerenciar Servidor** executa comandos de escrita.`],
    { color: 0x95a5a6, title: "⚙️ ADMINISTRAÇÃO" },
  );
}

function buildPanelButtons() {
  const row = new ActionRowBuilder();
  for (const b of PANEL_BUTTONS) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`tropa_panel_${b.key}`).setLabel(b.label).setEmoji(b.emoji).setStyle(ButtonStyle.Secondary),
    );
  }
  return row;
}

// ─────────────────────────────────────────────────────────────────────────────
// Botões de confirmação
// ─────────────────────────────────────────────────────────────────────────────
function buildConfirmRow(kind) {
  const confirm = new ButtonBuilder()
    .setCustomId(`tropa_${kind}_confirm`)
    .setLabel(CONFIRM_LABELS[kind] || "✅ CONFIRMAR")
    .setStyle(ButtonStyle.Success);
  const cancel = new ButtonBuilder()
    .setCustomId(`tropa_${kind}_cancel`)
    .setLabel("❌ CANCELAR")
    .setStyle(ButtonStyle.Secondary);
  return new ActionRowBuilder().addComponents(confirm, cancel);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers de comandos
// ─────────────────────────────────────────────────────────────────────────────
async function handleCriarJogo(interaction, log, db, pendingStore) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const nome = interaction.options.getString("jogo");
  const spec = gameAreaSpec(nome);
  const confirm = interaction.options.getBoolean("confirmar");

  if (confirm !== true) {
    if (!requireManager(interaction)) return;
    const plan = planArea(guild, spec);
    const embeds = buildAreaPreviewEmbeds(plan, {
      title: `🎮 PLANO — ${spec.clean}`,
      color: 0xe67e22,
      kindLabel: "Área do jogo",
      confirmLabel: CONFIRM_LABELS.criar_jogo,
    });
    const res = await interaction.reply({ embeds, components: [buildConfirmRow("criar_jogo")], ephemeral: true, fetchReply: true });
    if (res && res.id) pendingStore.set(res.id, { kind: "criar_jogo", slug: spec.slug, clean: spec.clean });
    return res;
  }

  if (!requireManager(interaction)) return;
  const missing = missingBotPerms(guild, WRITE_PERMISSIONS);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum elemento foi alterado.`,
      ephemeral: true,
    });
  }
  await interaction.deferReply({ ephemeral: true });
  const plan = planArea(guild, spec);
  const { categoryId, executed } = await executeArea(guild, plan, log, `Criar jogo "${spec.clean}" (Orun OS)`);
  addGame(db, guild.id, {
    slug: spec.slug,
    name: spec.clean,
    categoryId,
    channelIds: executed.channels.map((c) => c.id),
    archived: false,
    createdAt: Date.now(),
  });
  if (log && typeof log.info === "function") {
    log.info("[tropa] /criar-jogo", { servidor: guild.name, jogo: spec.clean, usuario: interaction.user.tag });
  }
  return interaction.editReply({
    embeds: buildAreaReportEmbeds(plan, executed, { title: `🎮 RESULTADO — ${spec.clean}`, color: 0x57f287, kindLabel: "Área do jogo" }),
  });
}

async function handleArquivarJogo(interaction, log, db, pendingStore) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const nome = interaction.options.getString("jogo");
  const slug = slugify(nome);
  const confirm = interaction.options.getBoolean("confirmar");

  const t = getTracker(db, guild.id);
  const game = t.games.find((g) => g.slug === slug);
  if (!game) {
    return interaction.reply({
      content: `❌ **${nome}** não foi criado pelo sistema — só consigo arquivar áreas de jogo criadas por mim (via \`/criar-jogo\`). Elementos criados manualmente ficam **protegidos**.`,
      ephemeral: true,
    });
  }
  if (game.archived) {
    return interaction.reply({ content: `📦 **${game.name}** já está arquivado.`, ephemeral: true });
  }
  const cat = guild.channels && guild.channels.cache ? guild.channels.cache.get(game.categoryId) : null;
  if (!cat) {
    return interaction.reply({
      content: `⚠️ A categoria do jogo **${game.name}** não foi encontrada (foi removida manualmente?).`,
      ephemeral: true,
    });
  }

  if (confirm !== true) {
    if (!requireManager(interaction)) return;
    const embeds = buildArchivePreviewEmbeds(game, cat);
    const res = await interaction.reply({ embeds, components: [buildConfirmRow("arquivar_jogo")], ephemeral: true, fetchReply: true });
    if (res && res.id) pendingStore.set(res.id, { kind: "arquivar_jogo", slug });
    return res;
  }

  if (!requireManager(interaction)) return;
  const missing = missingBotPerms(guild, WRITE_PERMISSIONS);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum elemento foi alterado.`,
      ephemeral: true,
    });
  }
  await interaction.deferReply({ ephemeral: true });
  await executeArchive(guild, game, cat, log);
  game.archived = true;
  addGame(db, guild.id, game);
  if (log && typeof log.info === "function") {
    log.info("[tropa] /arquivar-jogo", { servidor: guild.name, jogo: game.name, usuario: interaction.user.tag });
  }
  return interaction.editReply({ embeds: buildArchiveReportEmbeds(game) });
}

async function handleCriarGuilda(interaction, log, db, pendingStore) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const nome = interaction.options.getString("nome");
  const corRaw = interaction.options.getString("cor");
  const color = parseHexColor(corRaw);
  const lider = interaction.options.getUser("lider");
  if (corRaw && color === null) {
    return interaction.reply({ content: "❌ Cor inválida. Use formato hex, ex.: `#e4002b`.", ephemeral: true });
  }
  const spec = guildAreaSpec(nome, color);
  const confirm = interaction.options.getBoolean("confirmar");

  if (confirm !== true) {
    if (!requireManager(interaction)) return;
    const plan = planArea(guild, spec);
    const rolePlan = planRoles(guild, spec.roles);
    const embeds = [
      ...buildAreaPreviewEmbeds(plan, {
        title: `⚔️ PLANO — GUILDA ${spec.clean}`,
        color: 0xf39c12,
        kindLabel: "Área da guilda",
        confirmLabel: CONFIRM_LABELS.criar_guilda,
      }),
      ...buildGuildRolesPreviewEmbeds(rolePlan, spec.clean),
    ];
    const res = await interaction.reply({ embeds, components: [buildConfirmRow("criar_guilda")], ephemeral: true, fetchReply: true });
    if (res && res.id) {
      pendingStore.set(res.id, { kind: "criar_guilda", slug: spec.slug, clean: spec.clean, color, liderId: lider ? lider.id : null });
    }
    return res;
  }

  if (!requireManager(interaction)) return;
  const missing = missingBotPerms(guild, WRITE_PERMISSIONS);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum elemento foi alterado.`,
      ephemeral: true,
    });
  }
  await interaction.deferReply({ ephemeral: true });
  const plan = planArea(guild, spec);
  const rolePlan = planRoles(guild, spec.roles);
  const { categoryId, executed } = await executeArea(guild, plan, log, `Criar guilda "${spec.clean}" (Orun OS)`);
  const created = await executeRoles(guild, rolePlan, log, `Cargos da guilda "${spec.clean}" (Orun OS)`);
  const roleIdsById = resolveRoleIds(rolePlan, created);
  if (lider && roleIdsById.lider) await assignRole(guild, lider.id, roleIdsById.lider);
  addGuild(db, guild.id, {
    slug: spec.slug,
    name: spec.clean,
    categoryId,
    channelIds: executed.channels.map((c) => c.id),
    roleIds: Object.values(roleIdsById).filter(Boolean),
    createdAt: Date.now(),
  });
  if (log && typeof log.info === "function") {
    log.info("[tropa] /criar-guilda", { servidor: guild.name, guilda: spec.clean, usuario: interaction.user.tag });
  }
  return interaction.editReply({
    embeds: [
      ...buildAreaReportEmbeds(plan, executed, { title: `⚔️ RESULTADO — GUILDA ${spec.clean}`, color: 0x57f287, kindLabel: "Área da guilda" }),
      ...buildRolesReportEmbeds(rolePlan, created),
    ],
  });
}

function buildGuildRolesPreviewEmbeds(rolePlan, clean) {
  const sections = [];
  sections.push(`**🏷️ Cargos da guilda \`${clean}\`**\n`);
  let text = "";
  for (const rp of rolePlan) {
    text += `${rp.action === "reuse" ? "♻️" : "🆕"} ${rp.name}\n`;
  }
  sections.push(text);
  return palworld.sectionsToEmbeds(sections, { color: 0xf39c12 });
}

async function handleSetupCargos(interaction, log, db, pendingStore) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const confirm = interaction.options.getBoolean("confirmar");
  const allRoles = ROLE_SETS.flatMap((s) => s.roles);

  if (confirm !== true) {
    if (!requireManager(interaction)) return;
    const rolePlan = planRoles(guild, allRoles);
    const embeds = buildRolesPreviewEmbeds(rolePlan, ROLE_SETS);
    const res = await interaction.reply({ embeds, components: [buildConfirmRow("setup_cargos")], ephemeral: true, fetchReply: true });
    if (res && res.id) pendingStore.set(res.id, { kind: "setup_cargos" });
    return res;
  }

  if (!requireManager(interaction)) return;
  const missing = missingBotPerms(guild, [PermissionFlagsBits.ManageRoles]);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum cargo foi criado.`,
      ephemeral: true,
    });
  }
  await interaction.deferReply({ ephemeral: true });
  const rolePlan = planRoles(guild, allRoles);
  const created = await executeRoles(guild, rolePlan, log, "Cargos da Tropa do CaOS (Orun OS)");
  for (const r of created) addRole(db, guild.id, r.id, r.name);
  if (log && typeof log.info === "function") {
    log.info("[tropa] /setup-cargos", { servidor: guild.name, criados: created.length, usuario: interaction.user.tag });
  }
  return interaction.editReply({ embeds: buildRolesReportEmbeds(rolePlan, created) });
}

async function handlePainel(interaction, log, db) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const privado = interaction.options.getBoolean("privado") === true;
  const tracker = getTracker(db, guild.id);
  const embeds = buildPanelEmbeds(guild, tracker);
  if (log && typeof log.info === "function") {
    log.info("[tropa] /painel", { servidor: guild.name, usuario: interaction.user.tag, privado });
  }
  return interaction.reply({ embeds, components: [buildPanelButtons()], ephemeral: privado });
}

async function handlePanelButton(interaction, log, db) {
  const key = (interaction.customId || "").replace("tropa_panel_", "");
  const guild = interaction.guild;
  const tracker = getTracker(db, guild && guild.id);
  const embeds = buildPanelDetailEmbeds(key, guild, tracker);
  return interaction.reply({ embeds, ephemeral: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Botões de confirmação/cancelamento
// ─────────────────────────────────────────────────────────────────────────────
async function handleConfirm(interaction, log, db, pendingStore, kind) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este botão só funciona dentro de um servidor.", ephemeral: true });
  }
  if (!requireManager(interaction)) return;
  const state = pendingStore.get(interaction.message && interaction.message.id);
  if (!state || state.kind !== kind) {
    return interaction.reply({
      content: "❌ Confirmação expirada ou inválida. Refaça o comando para gerar um novo plano.",
      ephemeral: true,
    });
  }
  const missing = missingBotPerms(guild, WRITE_PERMISSIONS);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum elemento foi alterado.`,
      ephemeral: true,
    });
  }
  await interaction.deferUpdate();
  try {
    if (kind === "criar_jogo") {
      const spec = gameAreaSpec(state.clean);
      const plan = planArea(guild, spec);
      const { categoryId, executed } = await executeArea(guild, plan, log, `Criar jogo "${spec.clean}" (Orun OS)`);
      addGame(db, guild.id, {
        slug: spec.slug,
        name: spec.clean,
        categoryId,
        channelIds: executed.channels.map((c) => c.id),
        archived: false,
        createdAt: Date.now(),
      });
      if (log && typeof log.info === "function") {
        log.info("[tropa] jogo criado (botão)", { servidor: guild.name, jogo: spec.clean, usuario: interaction.user.tag });
      }
      return interaction.editReply({
        embeds: buildAreaReportEmbeds(plan, executed, { title: `🎮 RESULTADO — ${spec.clean}`, color: 0x57f287, kindLabel: "Área do jogo" }),
        components: [],
      });
    }
    if (kind === "criar_guilda") {
      const spec = guildAreaSpec(state.clean, state.color);
      const plan = planArea(guild, spec);
      const rolePlan = planRoles(guild, spec.roles);
      const { categoryId, executed } = await executeArea(guild, plan, log, `Criar guilda "${spec.clean}" (Orun OS)`);
      const created = await executeRoles(guild, rolePlan, log, `Cargos da guilda "${spec.clean}" (Orun OS)`);
      const roleIdsById = resolveRoleIds(rolePlan, created);
      if (state.liderId && roleIdsById.lider) await assignRole(guild, state.liderId, roleIdsById.lider);
      addGuild(db, guild.id, {
        slug: spec.slug,
        name: spec.clean,
        categoryId,
        channelIds: executed.channels.map((c) => c.id),
        roleIds: Object.values(roleIdsById).filter(Boolean),
        createdAt: Date.now(),
      });
      return interaction.editReply({
        embeds: [
          ...buildAreaReportEmbeds(plan, executed, { title: `⚔️ RESULTADO — GUILDA ${spec.clean}`, color: 0x57f287, kindLabel: "Área da guilda" }),
          ...buildRolesReportEmbeds(rolePlan, created),
        ],
        components: [],
      });
    }
    if (kind === "arquivar_jogo") {
      const t = getTracker(db, guild.id);
      const game = t.games.find((g) => g.slug === state.slug);
      if (!game) {
        return interaction.editReply({ content: "❌ Jogo não encontrado no sistema.", embeds: [], components: [] });
      }
      const cat = guild.channels && guild.channels.cache ? guild.channels.cache.get(game.categoryId) : null;
      if (!cat) {
        return interaction.editReply({ content: `⚠️ Categoria do jogo **${game.name}** não encontrada.`, embeds: [], components: [] });
      }
      await executeArchive(guild, game, cat, log);
      game.archived = true;
      addGame(db, guild.id, game);
      return interaction.editReply({ embeds: buildArchiveReportEmbeds(game), components: [] });
    }
    if (kind === "setup_cargos") {
      const allRoles = ROLE_SETS.flatMap((s) => s.roles);
      const rolePlan = planRoles(guild, allRoles);
      const created = await executeRoles(guild, rolePlan, log, "Cargos da Tropa do CaOS (Orun OS)");
      for (const r of created) addRole(db, guild.id, r.id, r.name);
      return interaction.editReply({ embeds: buildRolesReportEmbeds(rolePlan, created), components: [] });
    }
    return undefined;
  } finally {
    pendingStore.delete(interaction.message && interaction.message.id);
  }
}

async function handleCancel(interaction, log, pendingStore, kind) {
  const state = pendingStore.get(interaction.message && interaction.message.id);
  if (state && state.kind === kind) pendingStore.delete(interaction.message.id);
  await interaction.deferUpdate();
  if (log && typeof log.info === "function") {
    log.info("[tropa] operação cancelada via botão", { servidor: interaction.guild && interaction.guild.name, usuario: interaction.user.tag });
  }
  return interaction.editReply({ content: "❌ Operação cancelada. Nenhum elemento foi criado/alterado.", embeds: [], components: [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// Comandos slash
// ─────────────────────────────────────────────────────────────────────────────
function buildCommandDefinitions() {
  return [
    new SlashCommandBuilder()
      .setName("criar-jogo")
      .setDescription("Cria uma área de jogo (categoria + canais).")
      .addStringOption((o) => o.setName("jogo").setDescription("Nome do jogo").setRequired(true))
      .addBooleanOption((o) => o.setName("confirmar").setDescription("Confirma a criação direta").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("arquivar-jogo")
      .setDescription("Arquiva um jogo criado pelo sistema (esconde do @everyone).")
      .addStringOption((o) => o.setName("jogo").setDescription("Nome do jogo criado via /criar-jogo").setRequired(true))
      .addBooleanOption((o) => o.setName("confirmar").setDescription("Confirma o arquivamento").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("criar-guilda")
      .setDescription("Cria uma guilda (categoria + canais + cargos).")
      .addStringOption((o) => o.setName("nome").setDescription("Nome da guilda").setRequired(true))
      .addStringOption((o) => o.setName("jogo").setDescription("Jogo da guilda (opcional)").setRequired(false))
      .addUserOption((o) => o.setName("lider").setDescription("Membro que recebe o cargo de Líder").setRequired(false))
      .addStringOption((o) => o.setName("cor").setDescription("Cor do cargo de Líder (hex, ex.: #e4002b)").setRequired(false))
      .addBooleanOption((o) => o.setName("confirmar").setDescription("Confirma a criação direta").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("setup-cargos")
      .setDescription("Cria os cargos da comunidade (COMANDO, COMUNIDADE, LIVE).")
      .addBooleanOption((o) => o.setName("confirmar").setDescription("Confirma a criação dos cargos").setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("painel")
      .setDescription("Painel com status da Tropa e botões de detalhes.")
      .addBooleanOption((o) => o.setName("privado").setDescription("Mostra o painel só para você").setRequired(false)),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler de interações
// ─────────────────────────────────────────────────────────────────────────────
function buildInteractionHandler({ log, db } = {}) {
  const pendingStore = new Map();
  return async function onInteraction(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
          case "criar-jogo":
            return await handleCriarJogo(interaction, log, db, pendingStore);
          case "arquivar-jogo":
            return await handleArquivarJogo(interaction, log, db, pendingStore);
          case "criar-guilda":
            return await handleCriarGuilda(interaction, log, db, pendingStore);
          case "setup-cargos":
            return await handleSetupCargos(interaction, log, db, pendingStore);
          case "painel":
            return await handlePainel(interaction, log, db);
          default:
            return undefined;
        }
      }
      if (interaction.isButton()) {
        const id = interaction.customId || "";
        if (id.startsWith("tropa_panel_")) return await handlePanelButton(interaction, log, db);
        for (const kind of ["criar_jogo", "criar_guilda", "arquivar_jogo", "setup_cargos"]) {
          if (id === `tropa_${kind}_confirm`) return await handleConfirm(interaction, log, db, pendingStore, kind);
          if (id === `tropa_${kind}_cancel`) return await handleCancel(interaction, log, pendingStore, kind);
        }
      }
      return undefined;
    } catch (err) {
      if (log && typeof log.error === "function") log.error("[tropa] erro ao processar interação:", err.message);
      try {
        const payload = { content: "❌ Ocorreu um erro inesperado. Nenhum elemento foi alterado.", ephemeral: true };
        if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch {
        // silencioso: a resposta já não é possível
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  TRACKER_KEY,
  ARCHIVE_CATEGORY_NAME,
  GAME_CHANNELS,
  GUILD_CHANNELS,
  GUILD_ROLES,
  ROLE_SETS,
  cleanName,
  slugify,
  parseHexColor,
  gameAreaSpec,
  guildAreaSpec,
  getTracker,
  saveTracker,
  isSystemCreated,
  addGame,
  addGuild,
  addRole,
  planArea,
  executeArea,
  planRoles,
  executeRoles,
  resolveRoleIds,
  assignRole,
  executeArchive,
  missingBotPerms,
  requireManager,
  buildAreaPreviewEmbeds,
  buildAreaReportEmbeds,
  buildRolesPreviewEmbeds,
  buildRolesReportEmbeds,
  buildArchivePreviewEmbeds,
  buildArchiveReportEmbeds,
  buildPanelEmbeds,
  buildPanelDetailEmbeds,
  buildPanelButtons,
  buildConfirmRow,
  buildCommandDefinitions,
  buildInteractionHandler,
};
