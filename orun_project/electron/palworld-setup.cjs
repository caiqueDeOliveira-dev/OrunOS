// electron/palworld-setup.cjs
//
// Área Palworld para o bot Discord do Orun OS.
//
// Regras de segurança (prioridade máxima):
//  - NUNCA apagar, renomear, mover ou alterar permissões de elementos existentes.
//  - SOMENTE adicionar a área Palworld (categorias + canais).
//  - Nada é criado sem confirmação explícita (botão ou `/setup-palworld confirmar:true`).
//  - Idempotente: executar várias vezes não cria duplicatas.

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura desejada (nomes literais do pedido)
// ─────────────────────────────────────────────────────────────────────────────
const PALWORLD_STRUCTURE = [
  { key: "palworld", name: "🐾・ＰＡＬＷＯＲＬＤ・⚔️", type: "category", channels: [] },
  {
    key: "informacoes", name: "📢・INFORMAÇÕES", type: "category",
    channels: [
      { key: "regras", name: "📜・regras-palworld", type: "text" },
      { key: "avisos", name: "📢・avisos", type: "text" },
      { key: "eventos", name: "🗓️・eventos", type: "text" },
    ],
  },
  {
    key: "servidor", name: "🌍・SERVIDOR", type: "category",
    channels: [
      { key: "status", name: "🌐・status-do-servidor", type: "text" },
      { key: "chat", name: "💬・chat-palworld", type: "text" },
      { key: "sugestoes", name: "💡・sugestões", type: "text" },
    ],
  },
  {
    key: "pals", name: "🐾・PALS", type: "category",
    channels: [
      { key: "pals", name: "🐾・pals", type: "text" },
      { key: "breeding", name: "🥚・breeding", type: "text" },
      { key: "trocas", name: "🔄・trocas", type: "text" },
      { key: "guias", name: "📖・guias", type: "text" },
    ],
  },
  {
    key: "aventura", name: "⚔️・AVENTURA", type: "category",
    channels: [
      { key: "exploracao", name: "🗺️・exploração", type: "text" },
      { key: "bosses", name: "👹・bosses", type: "text" },
      { key: "raids", name: "⚔️・raids", type: "text" },
      { key: "endgame", name: "💀・endgame", type: "text" },
    ],
  },
  {
    key: "bases", name: "🏠・BASES", type: "category",
    channels: [
      { key: "construcoes", name: "🏠・construções", type: "text" },
      { key: "ideias", name: "💡・ideias-de-base", type: "text" },
      { key: "prints", name: "📸・prints", type: "text" },
    ],
  },
  {
    key: "midia", name: "🎮・MÍDIA", type: "category",
    channels: [
      { key: "screenshots", name: "📸・screenshots", type: "text" },
      { key: "clips", name: "🎬・clips", type: "text" },
      { key: "conquistas", name: "🏆・conquistas", type: "text" },
    ],
  },
  {
    key: "corujao", name: "👨‍👦・𝐂𝐎𝐑𝐔𝐉𝐀̃𝐎 𝐏𝐀𝐋𝐖𝐎𝐑𝐋𝐃・🌙", type: "category",
    channels: [
      { key: "desafios", name: "🎯・desafios", type: "text" },
      { key: "ranking", name: "🏆・ranking", type: "text" },
      { key: "melhores", name: "📸・melhores-momentos", type: "text" },
    ],
  },
  {
    key: "voz", name: "🔊・VOZ", type: "category",
    channels: [
      { key: "voz1", name: "🔊・Palworld 1", type: "voice" },
      { key: "voz2", name: "🔊・Palworld 2", type: "voice" },
      { key: "afk", name: "💤・AFK", type: "voice" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Identidade da Tropa do CaOS (preto + vermelho)
// ─────────────────────────────────────────────────────────────────────────────
const TROPA_IDENTITY = {
  name: "TROPA DO CaOS",
  symbol: "🐺",
  tagline: "Quartel digital da Tropa do CaOS.",
  primaryColor: 0x0b0b0f, // preto
  accentColor: 0xe4002b, // vermelho sangue
  header:
    "╔════════════════════════════╗\n🐺 TROPA DO CaOS\n╚════════════════════════════╝",
};

// Estrutura da Tropa. Áreas com `optional: true` NÃO são criadas automaticamente
// (precisam de autorização explícita) — aparecem apenas como sugestão no preview.
const TROPA_STRUCTURE = [
  {
    key: "tropa", name: "🐺・𝐓𝐑𝐎𝐏𝐀 𝐃𝐎 𝐂𝐚𝐎𝐒", type: "category",
    channels: [
      { key: "boas-vindas", name: "👋・boas-vindas", type: "text" },
      { key: "regras", name: "📜・regras", type: "text" },
      { key: "anuncios", name: "📢・anuncios", type: "text" },
      { key: "cargos", name: "🎭・cargos", type: "text" },
    ],
  },
  {
    key: "recrutamento", name: "🩸・𝐑𝐄𝐂𝐑𝐔𝐓𝐀𝐌𝐄𝐍𝐓𝐎", type: "category",
    channels: [
      { key: "chat", name: "💬・recrutamento", type: "text" },
      { key: "formulario", name: "📝・formulario", type: "text" },
      { key: "contas", name: "🔗・contas", type: "text" },
    ],
  },
  {
    key: "quartel", name: "🏴・𝐐𝐔𝐀𝐑𝐓𝐄𝐋", type: "category",
    channels: [
      { key: "chat-geral", name: "💬・chat-geral", type: "text" },
      { key: "memes", name: "😂・memes", type: "text" },
      { key: "fotos", name: "📸・fotos", type: "text" },
      { key: "clips", name: "🎬・clips", type: "text" },
    ],
  },
  {
    key: "caos-live", name: "🔴・𝐂𝐀𝐎𝐒 𝐋𝐈𝐕𝐄", type: "category",
    channels: [
      { key: "ao-vivo", name: "🔴・ao-vivo", type: "text" },
      { key: "agenda", name: "📅・agenda", type: "text" },
      { key: "notificacoes", name: "📢・notificacoes", type: "text" },
      { key: "melhores-momentos", name: "🎬・melhores-momentos", type: "text" },
      { key: "chat-da-live", name: "💬・chat-da-live", type: "text" },
    ],
  },
  {
    key: "guildas", name: "⚔️・𝐆𝐔𝐈𝐋𝐃𝐀𝐒", type: "category",
    channels: [
      { key: "avisos", name: "📢・avisos", type: "text" },
      { key: "chat", name: "💬・chat-guildas", type: "text" },
      { key: "estrategias", name: "⚔️・estrategias", type: "text" },
      { key: "ranking", name: "🏆・ranking", type: "text" },
      { key: "recrutamento", name: "🔎・recrutamento", type: "text" },
    ],
  },
  {
    key: "zona-gamer", name: "🎮・𝐙𝐎𝐍𝐀 𝐆𝐀𝐌𝐄𝐑", type: "category",
    channels: [
      { key: "chat", name: "💬・chat-gamer", type: "text" },
      { key: "jogos", name: "🎮・jogos", type: "text" },
      { key: "clips", name: "🎬・clips", type: "text" },
    ],
  },
  {
    key: "family-squad", name: "👨‍👦・𝐅𝐀𝐌𝐈𝐋𝐘 𝐒𝐐𝐔𝐀𝐃", type: "category",
    channels: [
      { key: "jogatina", name: "🎮・jogatina", type: "text" },
      { key: "desafios", name: "🏆・desafios", type: "text" },
      { key: "momentos", name: "📸・momentos", type: "text" },
    ],
  },
  {
    key: "caos-voice", name: "🔊・𝐂𝐀𝐎𝐒 𝐕𝐎𝐈𝐂𝐄", type: "category",
    channels: [
      { key: "sala-1", name: "🔊・Sala 1", type: "voice" },
      { key: "sala-2", name: "🔊・Sala 2", type: "voice" },
      { key: "afk", name: "💤・AFK", type: "voice" },
    ],
  },
  {
    key: "orun-lab", name: "🤖・𝐎𝐑𝐔𝐍 𝐋𝐀𝐁", type: "category", optional: true,
    channels: [
      { key: "ia", name: "🤖・ia", type: "text" },
      { key: "programacao", name: "💻・programacao", type: "text" },
      { key: "projetos", name: "🛠️・projetos", type: "text" },
      { key: "orun-shield", name: "🐺・orun-shield", type: "text" },
    ],
  },
  {
    key: "command-center", name: "🖥️・𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐂𝐄𝐍𝐓𝐄𝐑", type: "category", optional: true,
    channels: [
      { key: "hardware", name: "🖥️・hardware", type: "text" },
      { key: "linux", name: "🐧・linux", type: "text" },
      { key: "eletronica", name: "🔧・eletronica", type: "text" },
      { key: "homelab", name: "🏠・homelab", type: "text" },
      { key: "redes", name: "🌐・redes", type: "text" },
    ],
  },
  {
    key: "musica", name: "🎵・𝐂𝐀𝐎𝐒 𝐌𝐔𝐒𝐈𝐂", type: "category", optional: true,
    channels: [
      { key: "musica", name: "🎵・musica", type: "text" },
      { key: "playlists", name: "🎧・playlists", type: "text" },
      { key: "soul-blues-jazz", name: "🎷・soul-blues-jazz", type: "text" },
    ],
  },
];

// Contextos das áreas (estrutura + identidade visual + rótulos)
const PALWORLD_CTX = {
  key: "palworld",
  logTag: "[palworld]",
  structure: PALWORLD_STRUCTURE,
  previewTitle: "🐾 PLANO PALWORLD",
  previewColor: 0xe67e22,
  reportDoneTitle: "🐾 RESULTADO PALWORLD",
  reportDoneColor: 0x57f287,
  reportAlreadyTitle: "🐾 PALWORLD JÁ ESTÁ CONFIGURADO",
  reportAlreadyColor: 0x5865f2,
  confirmCustomId: "palworld_confirm",
  cancelCustomId: "palworld_cancel",
  confirmLabel: "✅ CRIAR PALWORLD",
  cancelLabel: "❌ CANCELAR",
  messageDone: "PALWORLD CONFIGURADO!",
  messageAlready: "PALWORLD JÁ ESTÁ CONFIGURADO",
  commandName: "setup-palworld",
};

const TROPA_CTX = {
  key: "tropa",
  logTag: "[tropa]",
  structure: TROPA_STRUCTURE,
  previewTitle: "🏴 REDESIGN — TROPA DO CaOS",
  previewColor: TROPA_IDENTITY.accentColor,
  reportDoneTitle: "🏴 TROPA DO CaOS — ESTRUTURA APLICADA",
  reportDoneColor: TROPA_IDENTITY.accentColor,
  reportAlreadyTitle: "🏴 TROPA DO CaOS — JÁ ESTÁ ORGANIZADA",
  reportAlreadyColor: TROPA_IDENTITY.primaryColor,
  confirmCustomId: "tropa_confirm",
  cancelCustomId: "tropa_cancel",
  confirmLabel: "✅ APLICAR REDESIGN",
  cancelLabel: "❌ CANCELAR",
  messageDone: "REDESIGN APLICADO!",
  messageAlready: "A TROPA JÁ ESTÁ ORGANIZADA",
  commandName: "aplicar-redesign",
};

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de permissões (somente para diagnóstico)
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_PERMISSIONS = [
  { flag: PermissionFlagsBits.Administrator, label: "Administrador" },
  { flag: PermissionFlagsBits.ManageGuild, label: "Gerenciar Servidor" },
  { flag: PermissionFlagsBits.ManageChannels, label: "Gerenciar Canais" },
  { flag: PermissionFlagsBits.ManageRoles, label: "Gerenciar Cargos" },
  { flag: PermissionFlagsBits.ManageMessages, label: "Gerenciar Mensagens" },
  { flag: PermissionFlagsBits.ManageWebhooks, label: "Gerenciar Webhooks" },
  { flag: PermissionFlagsBits.KickMembers, label: "Expulsar Membros" },
  { flag: PermissionFlagsBits.BanMembers, label: "Banir Membros" },
  { flag: PermissionFlagsBits.MentionEveryone, label: "Mencionar @everyone" },
  { flag: PermissionFlagsBits.ViewAuditLog, label: "Ver Registro de Auditoria" },
  { flag: PermissionFlagsBits.ModerateMembers, label: "Moderar Membros" },
  { flag: PermissionFlagsBits.ManageEvents, label: "Gerenciar Eventos" },
];

// Verificações de permissões do bot (pedido: View Channels, Manage Channels,
// Manage Permissions, Send Messages, Use Application Commands).
// No Discord, "Manage Permissions" corresponde à flag MANAGE_ROLES.
const BOT_PERMISSION_CHECKS = [
  { flag: PermissionFlagsBits.ViewChannel, label: "View Channels" },
  { flag: PermissionFlagsBits.ManageChannels, label: "Manage Channels" },
  { flag: PermissionFlagsBits.ManageRoles, label: "Manage Permissions" },
  { flag: PermissionFlagsBits.SendMessages, label: "Send Messages" },
  { flag: PermissionFlagsBits.UseApplicationCommands, label: "Use Application Commands" },
];

// Permissões mínimas para criar a estrutura (somente as novas categorias/canais).
const SETUP_PERMISSIONS = [
  { flag: PermissionFlagsBits.ViewChannel, label: "View Channels" },
  { flag: PermissionFlagsBits.ManageChannels, label: "Manage Channels" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function norm(name) {
  return String(name || "").toLowerCase();
}

function clamp(str, max) {
  if (typeof str !== "string") return "";
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function buildNameIndex(channels) {
  const index = new Map();
  for (const c of channels) {
    const key = norm(c.name);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(c);
  }
  return index;
}

function nextSafeName(name, nameIndex, plannedNames) {
  let candidate = name;
  let suffix = 2;
  for (let i = 0; i <= 100; i++) {
    if (!(nameIndex.get(norm(candidate)) || []).length && !plannedNames.has(norm(candidate))) {
      return candidate;
    }
    candidate = `${name}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

// Procura um canal/categoria pelo nome exato OU por variantes seguras
// ("<nome>-2", "<nome>-3" ...) criadas em execuções anteriores.
function findVariant(name, channels, { type, parentId } = {}) {
  const candidates = [name];
  for (let i = 2; i <= 100; i++) candidates.push(`${name}-${i}`);
  for (const candidate of candidates) {
    for (const c of channels) {
      if (norm(c.name) !== norm(candidate)) continue;
      if (type !== undefined && c.type !== type) continue;
      if (parentId !== undefined && c.parentId !== parentId) continue;
      return c;
    }
  }
  return null;
}

function channelTypeLabel(c) {
  switch (c.type) {
    case ChannelType.GuildText: return "texto";
    case ChannelType.GuildVoice: return "voz";
    case ChannelType.GuildCategory: return "categoria";
    case ChannelType.GuildForum: return "fórum";
    case ChannelType.GuildAnnouncement: return "anúncio";
    case ChannelType.GuildStageVoice: return "palco";
    case ChannelType.GuildPublicThread: return "thread pública";
    case ChannelType.GuildPrivateThread: return "thread privada";
    case ChannelType.GuildNewsThread: return "thread de anúncio";
    default: return `tipo ${c.type}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnóstico (somente leitura) — /servidor-info
// ─────────────────────────────────────────────────────────────────────────────
function analyzeGuild(guild) {
  const channels = [...(guild.channels && guild.channels.cache ? guild.channels.cache.values() : [])];
  const categoriesRaw = channels.filter((c) => c.type === ChannelType.GuildCategory);
  const childChannels = channels.filter(
    (c) => c.type !== ChannelType.GuildCategory && !(c.isThread && c.isThread()),
  );

  const categories = categoriesRaw
    .map((cat) => {
      const kids = childChannels.filter((c) => c.parentId === cat.id);
      return {
        id: cat.id,
        name: cat.name,
        position: cat.position,
        channelCount: kids.length,
        channels: kids
          .map((c) => ({ id: c.id, name: c.name, type: channelTypeLabel(c), position: c.position }))
          .sort((a, b) => a.position - b.position),
      };
    })
    .sort((a, b) => a.position - b.position);

  const uncategorized = childChannels
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, name: c.name, type: channelTypeLabel(c), position: c.position }))
    .sort((a, b) => a.position - b.position);

  const roles = [...(guild.roles && guild.roles.cache ? guild.roles.cache.values() : [])]
    .map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      adminPerms: ADMIN_PERMISSIONS.filter(({ flag }) => r.permissions && r.permissions.has(flag)).map(
        ({ label }) => label,
      ),
    }))
    .filter((r) => r.adminPerms.length > 0 || r.position === 0)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  const me = guild.members && guild.members.me ? guild.members.me : null;
  const botChecks = BOT_PERMISSION_CHECKS.map((p) => ({
    label: p.label,
    has: Boolean(me && me.permissions && me.permissions.has(p.flag)),
  }));

  return {
    name: guild.name,
    id: guild.id,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    createdAt: guild.createdAt ? new Date(guild.createdAt).toISOString() : null,
    counts: {
      categories: categories.length,
      channels: childChannels.length,
      uncategorized: uncategorized.length,
      roles: roles.length,
    },
    categories,
    uncategorized,
    roles,
    bot: {
      id: me ? me.id : null,
      tag: me && me.user ? me.user.tag : null,
      permissions: botChecks,
      missing: botChecks.filter((c) => !c.has).map((c) => c.label),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Planejamento (somente leitura) — /preview-palworld
// ─────────────────────────────────────────────────────────────────────────────
function planSetup(guild, structure = PALWORLD_STRUCTURE, { includeOptional = false } = {}) {
  const channels = [...(guild.channels && guild.channels.cache ? guild.channels.cache.values() : [])];
  const nameIndex = buildNameIndex(channels);
  const plannedNames = new Set();
  const conflicts = [];
  const categories = [];
  const activeSpecs = structure.filter((c) => includeOptional || !c.optional);
  const skippedOptional = structure.length - activeSpecs.length;

  for (const catSpec of activeSpecs) {
    const reusedCat = findVariant(catSpec.name, channels, { type: ChannelType.GuildCategory });
    let catEntry;

    if (reusedCat) {
      const viaVariant = norm(reusedCat.name) !== norm(catSpec.name);
      catEntry = {
        key: catSpec.key,
        desiredName: catSpec.name,
        action: "reuse",
        actualName: reusedCat.name,
        id: reusedCat.id,
        type: ChannelType.GuildCategory,
        conflict: viaVariant,
        conflictReason: viaVariant
          ? `A categoria "${catSpec.name}" não pôde ser usada (nome já existente); a categoria "${reusedCat.name}" será reutilizada.`
          : null,
        channels: [],
      };
      if (viaVariant) {
        conflicts.push({ name: catSpec.name, resolution: `A categoria existente "${reusedCat.name}" será reutilizada sem alterações.` });
      }
    } else {
      const blocker = (nameIndex.get(norm(catSpec.name)) || []).find((c) => c.type !== ChannelType.GuildCategory);
      const actualName = nextSafeName(catSpec.name, nameIndex, plannedNames);
      plannedNames.add(norm(actualName));
      catEntry = {
        key: catSpec.key,
        desiredName: catSpec.name,
        action: "create",
        actualName,
        id: null,
        type: ChannelType.GuildCategory,
        conflict: Boolean(blocker),
        conflictReason: blocker
          ? `Existe um canal chamado "${catSpec.name}" que não é uma categoria. Ele NÃO será alterado.`
          : null,
        channels: [],
      };
      if (blocker) {
        conflicts.push({ name: catSpec.name, resolution: `O canal existente foi preservado; a categoria será criada como "${actualName}".` });
      }
    }

    const parentId = reusedCat ? reusedCat.id : null;

    for (const chSpec of catSpec.channels) {
      const chType = chSpec.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
      let chEntry = null;

      if (parentId) {
        const found = findVariant(chSpec.name, channels, { type: chType, parentId });
        if (found) {
          const viaVariant = norm(found.name) !== norm(chSpec.name);
          chEntry = {
            key: chSpec.key,
            desiredName: chSpec.name,
            action: "reuse",
            actualName: found.name,
            id: found.id,
            type: chType,
            conflict: viaVariant,
            conflictReason: viaVariant
              ? `O nome "${chSpec.name}" já estava em uso; o canal "${found.name}" será reutilizado.`
              : null,
          };
          if (viaVariant) {
            conflicts.push({ name: chSpec.name, resolution: `O canal existente "${found.name}" será reutilizado.` });
          }
        }
      }

      if (!chEntry) {
        const inCatWithName = parentId
          ? channels.find((c) => c.parentId === parentId && norm(c.name) === norm(chSpec.name))
          : null;
        const globalCollision = (nameIndex.get(norm(chSpec.name)) || []).some((c) => c !== inCatWithName);
        const blocked =
          Boolean(inCatWithName) ||
          globalCollision ||
          plannedNames.has(norm(chSpec.name)) ||
          norm(chSpec.name) === norm(catSpec.name);

        const actualName = nextSafeName(chSpec.name, nameIndex, plannedNames);
        plannedNames.add(norm(actualName));
        chEntry = {
          key: chSpec.key,
          desiredName: chSpec.name,
          action: "create",
          actualName,
          id: null,
          type: chType,
          conflict: blocked,
          conflictReason: blocked
            ? `O nome "${chSpec.name}" já existe no servidor (ou colide com o nome da categoria). O elemento existente NÃO será alterado.`
            : null,
        };
        if (blocked) {
          conflicts.push({ name: chSpec.name, resolution: `O elemento existente foi preservado; será criado "${actualName}".` });
        }
      }

      catEntry.channels.push(chEntry);
    }

    categories.push(catEntry);
  }

  return {
    categories,
    conflicts,
    skippedOptional,
    stats: summarizePlan(categories),
  };
}

function summarizePlan(categories) {
  let createCategories = 0;
  let reuseCategories = 0;
  let createChannels = 0;
  let reuseChannels = 0;
  for (const cat of categories) {
    if (cat.action === "create") createCategories += 1;
    else reuseCategories += 1;
    for (const ch of cat.channels) {
      if (ch.action === "create") createChannels += 1;
      else reuseChannels += 1;
    }
  }
  return {
    createCategories,
    reuseCategories,
    createChannels,
    reuseChannels,
    totalCategories: categories.length,
    totalChannels: createChannels + reuseChannels,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução (idempotente) — /setup-palworld confirmar:true
// ─────────────────────────────────────────────────────────────────────────────
async function createWithNameFallback(guild, baseOpts, log) {
  let attempt = 0;
  let name = baseOpts.name;
  while (attempt <= 5) {
    try {
      return await guild.channels.create({ ...baseOpts, name });
    } catch (err) {
      const msg = String((err && err.message) || "").toLowerCase();
      const nameIssue = msg.includes("already exists") || msg.includes("name") || msg.includes("invalid form body");
      if (!nameIssue) throw err;
      attempt += 1;
      name = `${baseOpts.name}-${attempt + 1}`;
      if (log && typeof log.warn === "function") {
        log.warn(`[palworld] nome "${baseOpts.name}" em conflito na API; tentando "${name}"`);
      }
    }
  }
  throw new Error(`Não foi possível criar "${baseOpts.name}" (conflito de nome persistente).`);
}

async function executeSetup(guild, { structure, log, actor, includeOptional } = {}) {
  const plan = planSetup(guild, structure, { includeOptional });
  const stats = { categoriesCreated: 0, channelsCreated: 0, reused: 0, conflicts: 0, errors: 0, errorDetails: [] };
  const actorLabel = actor && actor.tag ? `${actor.tag} (${actor.id})` : "desconhecido";
  const reason = "Setup Palworld (Orun OS)";

  for (const catEntry of plan.categories) {
    let categoryId = catEntry.id;

    if (catEntry.action === "create") {
      try {
        const created = await createWithNameFallback(
          guild,
          { name: catEntry.actualName, type: ChannelType.GuildCategory, reason },
          log,
        );
        categoryId = created.id;
        stats.categoriesCreated += 1;
        if (catEntry.conflict) stats.conflicts += 1;
      } catch (err) {
        stats.errors += 1;
        stats.errorDetails.push({ element: `categoria "${catEntry.actualName}"`, error: err.message });
        if (log && typeof log.error === "function") log.error("[palworld] erro ao criar categoria:", err.message);
        categoryId = null;
      }
    } else {
      stats.reused += 1;
    }

    if (!categoryId) continue;

    for (const chEntry of catEntry.channels) {
      if (chEntry.action === "reuse") {
        stats.reused += 1;
        continue;
      }
      try {
        await createWithNameFallback(
          guild,
          { name: chEntry.actualName, type: chEntry.type, parent: categoryId, reason },
          log,
        );
        stats.channelsCreated += 1;
        if (chEntry.conflict) stats.conflicts += 1;
      } catch (err) {
        stats.errors += 1;
        stats.errorDetails.push({ element: `canal "${chEntry.actualName}"`, error: err.message });
        if (log && typeof log.error === "function") log.error("[palworld] erro ao criar canal:", err.message);
      }
    }
  }

  if (log && typeof log.info === "function") {
    log.info("[palworld] setup executado", {
      servidor: { id: guild.id, nome: guild.name },
      usuario: actorLabel,
      horario: new Date().toISOString(),
      categoriasCriadas: stats.categoriesCreated,
      canaisCriados: stats.channelsCreated,
      reutilizados: stats.reused,
      conflitos: stats.conflicts,
      erros: stats.errors,
    });
  }

  return { plan, stats };
}

// ─────────────────────────────────────────────────────────────────────────────
// Permissões
// ─────────────────────────────────────────────────────────────────────────────
function canManageGuild(interaction) {
  const perms = interaction.memberPermissions;
  if (!perms) return false;
  return perms.has(PermissionFlagsBits.Administrator) || perms.has(PermissionFlagsBits.ManageGuild);
}

function getMissingBotPermissions(guild) {
  const me = guild.members && guild.members.me ? guild.members.me : null;
  if (!me || !me.permissions) return SETUP_PERMISSIONS.map((p) => p.label);
  return SETUP_PERMISSIONS.filter((p) => !me.permissions.has(p.flag)).map((p) => p.label);
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatação de mensagens
// ─────────────────────────────────────────────────────────────────────────────
function splitIntoChunks(text, max = 3900) {
  const chunks = [];
  for (let i = 0; i < text.length; i += max) chunks.push(text.slice(i, i + max));
  return chunks;
}

function sectionsToEmbeds(sections, { color, title }) {
  const embeds = [];
  let first = true;
  for (const section of sections) {
    for (const chunk of splitIntoChunks(section)) {
      embeds.push({ color, title: first ? title : undefined, description: chunk });
      first = false;
    }
  }
  return embeds;
}

function buildServidorInfoEmbeds(data) {
  const sections = [];

  let header = `**🏷️ Nome:** ${data.name}\n`;
  header += `**🆔 ID:** ${data.id}\n`;
  header += `**👥 Membros:** ${data.memberCount}\n`;
  header += `**👑 Dono:** ${data.ownerId ? `<@${data.ownerId}>` : "—"}\n`;
  if (data.createdAt) header += `**📅 Criado:** ${new Date(data.createdAt).toLocaleString("pt-BR")}\n`;
  header += `**📁 Categorias:** ${data.counts.categories} · **💬 Canais:** ${data.counts.channels} · **🏷️ Cargos:** ${data.counts.roles}\n`;
  sections.push(header);

  let catText = `**📁 CATEGORIAS (${data.categories.length})**\n`;
  if (data.categories.length === 0) catText += "Nenhuma categoria.\n";
  for (const cat of data.categories) {
    catText += `🗂️ \`${cat.id}\` **${cat.name}** — pos ${cat.position} — ${cat.channelCount} canal(is)\n`;
  }
  if (data.uncategorized.length) {
    catText += `\n**📄 SEM CATEGORIA (${data.uncategorized.length})**\n`;
    for (const c of data.uncategorized) catText += `🔹 \`${c.id}\` **${c.name}** (${c.type})\n`;
  }
  sections.push(catText);

  let chText = `**💬 CANAIS (${data.counts.channels})**\n`;
  for (const cat of data.categories) {
    for (const c of cat.channels) {
      chText += `🔹 \`${c.id}\` **${c.name}** (${c.type}) — em "${cat.name}" — pos ${c.position}\n`;
    }
  }
  if (data.categories.length === 0 && data.uncategorized.length === 0) chText += "Nenhum canal.\n";
  sections.push(chText);

  let roleText = `**🏷️ CARGOS (${data.roles.length} com permissões administrativas)**\n`;
  if (data.roles.length === 0) roleText += "Nenhum cargo com permissões administrativas.\n";
  for (const r of data.roles) {
    roleText += `🎖️ \`${r.id}\` **${r.name}** — pos ${r.position}${r.adminPerms.length ? ` — ${r.adminPerms.join(", ")}` : ""}\n`;
  }
  sections.push(roleText);

  let botText = "**🤖 PERMISSÕES DO BOT**\n";
  if (data.bot.id) botText += `🆔 \`${data.bot.id}\`\n`;
  for (const p of data.bot.permissions) {
    botText += `${p.has ? "✅" : "❌"} ${p.label}\n`;
  }
  botText += data.bot.missing.length
    ? `\n**Faltam:** ${data.bot.missing.join(", ")}`
    : "\nO bot possui todas as permissões verificadas.";
  sections.push(botText);

  return sectionsToEmbeds(sections, { color: 0x5865f2, title: "📊 SERVIDOR — DIAGNÓSTICO (somente leitura)" });
}

function buildPreviewEmbeds(plan, ctx = PALWORLD_CTX) {
  const sections = [];
  const s = plan.stats;

  let header = `**📁 Categorias:** ${s.createCategories} para criar · ${s.reuseCategories} reutilizadas\n`;
  header += `**💬 Canais:** ${s.createChannels} para criar · ${s.reuseChannels} reutilizados\n`;
  if (plan.conflicts.length) header += `**⚠️ Conflitos detectados:** ${plan.conflicts.length}\n`;
  if (plan.skippedOptional) {
    header += `**ℹ️ Áreas opcionais não criadas:** ${plan.skippedOptional} (aparecem no futuro com autorização explícita)\n`;
  }
  header += "\n> Nenhum elemento existente será alterado. **Nada será criado até você confirmar.**\n";
  sections.push(header);

  for (const cat of plan.categories) {
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
    catLine += chLines ? `\n${chLines}` : "";
    sections.push(catLine);
  }

  if (plan.conflicts.length) {
    let cText = "**⚠️ CONFLITOS ENCONTRADOS**\n";
    for (const c of plan.conflicts) {
      cText += `- **"${c.name}"** já existe. Nenhum elemento existente será alterado. ${c.resolution}\n`;
    }
    sections.push(cText);
  }

  sections.push(
    `**ℹ️ Para confirmar:** clique em **${ctx.confirmLabel}** abaixo, ou use \`/${ctx.commandName} confirmar:true\`.`,
  );

  return sectionsToEmbeds(sections, { color: ctx.previewColor, title: ctx.previewTitle });
}

function buildReportEmbeds(plan, stats, ctx = PALWORLD_CTX) {
  const alreadyConfigured = stats.categoriesCreated === 0 && stats.channelsCreated === 0 && stats.errors === 0;
  const sections = [];

  let header;
  if (alreadyConfigured) {
    header = `${ctx.messageAlready}\n\nNenhum elemento novo foi necessário — tudo foi reutilizado.\n`;
  } else {
    header = `${ctx.messageDone}\n\n`;
  }
  header += `📁 Categorias criadas: ${stats.categoriesCreated}\n`;
  header += `💬 Canais criados: ${stats.channelsCreated}\n`;
  header += `♻️ Elementos reutilizados: ${stats.reused}\n`;
  header += `⚠️ Conflitos ignorados (existentes preservados): ${stats.conflicts}\n`;
  header += `❌ Erros: ${stats.errors}\n`;
  if (plan.skippedOptional) header += `ℹ️ Áreas opcionais não criadas: ${plan.skippedOptional}\n`;
  header += "\n> Nenhum elemento existente foi alterado.\n";
  sections.push(header);

  if (stats.errors > 0 && stats.errorDetails.length) {
    let errText = "**❌ DETALHES DOS ERROS**\n";
    for (const d of stats.errorDetails.slice(0, 20)) {
      errText += `- ${d.element}: ${clamp(d.error, 200)}\n`;
    }
    sections.push(errText);
  }

  if (plan.conflicts.length) {
    let cText = "**⚠️ CONFLITOS ENCONTRADOS**\n";
    for (const c of plan.conflicts) {
      cText += `- **"${c.name}"** já existia e não foi alterado. ${c.resolution}\n`;
    }
    sections.push(cText);
  }

  return sectionsToEmbeds(sections, {
    color: alreadyConfigured ? ctx.reportAlreadyColor : ctx.reportDoneColor,
    title: alreadyConfigured ? ctx.reportAlreadyTitle : ctx.reportDoneTitle,
  });
}

function buildConfirmRow(ctx = PALWORLD_CTX) {
  const confirm = new ButtonBuilder()
    .setCustomId(ctx.confirmCustomId)
    .setLabel(ctx.confirmLabel)
    .setStyle(ButtonStyle.Success);
  const cancel = new ButtonBuilder()
    .setCustomId(ctx.cancelCustomId)
    .setLabel(ctx.cancelLabel)
    .setStyle(ButtonStyle.Secondary);
  return new ActionRowBuilder().addComponents(confirm, cancel);
}

// ─────────────────────────────────────────────────────────────────────────────
// Comandos slash
// ─────────────────────────────────────────────────────────────────────────────
function buildCommandDefinitions() {
  return [
    new SlashCommandBuilder()
      .setName("servidor-info")
      .setDescription("Analisa o servidor em modo somente leitura (estrutura, canais, cargos, permissões)."),
    new SlashCommandBuilder()
      .setName("preview-palworld")
      .setDescription("Mostra o plano da área Palworld antes de criar (não cria nada)."),
    new SlashCommandBuilder()
      .setName("setup-palworld")
      .setDescription("Cria a estrutura Palworld (exige confirmação).")
      .addBooleanOption((o) =>
        o.setName("confirmar").setDescription("Confirma a criação da estrutura Palworld").setRequired(false),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("preview-redesign")
      .setDescription("Mostra o plano de reorganização da Tropa do CaOS (não altera nada)."),
    new SlashCommandBuilder()
      .setName("aplicar-redesign")
      .setDescription("Aplica a estrutura da Tropa do CaOS (exige confirmação).")
      .addBooleanOption((o) =>
        o.setName("confirmar").setDescription("Confirma a aplicação do redesign").setRequired(false),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers de interação
// ─────────────────────────────────────────────────────────────────────────────
async function handleServidorInfoCommand(interaction, log) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const data = analyzeGuild(guild);
  const embeds = buildServidorInfoEmbeds(data);
  if (log && typeof log.info === "function") {
    log.info("[palworld] /servidor-info", { servidor: guild.name, usuario: interaction.user.tag });
  }
  return interaction.reply({ embeds, ephemeral: true });
}

async function handlePreviewCommand(interaction, log, ctx = PALWORLD_CTX) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  const plan = planSetup(guild, ctx.structure);
  const embeds = buildPreviewEmbeds(plan, ctx);
  if (log && typeof log.info === "function") {
    log.info(`${ctx.logTag} /preview`, { servidor: guild.name, usuario: interaction.user.tag, plano: plan.stats });
  }
  return interaction.reply({ embeds, components: [buildConfirmRow(ctx)], ephemeral: true });
}

async function runConfirmedSetup(interaction, log, ctx = PALWORLD_CTX) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este comando só funciona dentro de um servidor.", ephemeral: true });
  }
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: "❌ Você precisa da permissão **Administrador** ou **Gerenciar Servidor** para executar o setup.",
      ephemeral: true,
    });
  }
  const missing = getMissingBotPermissions(guild);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum elemento foi alterado.`,
      ephemeral: true,
    });
  }
  await interaction.deferReply({ ephemeral: true });
  const { plan, stats } = await executeSetup(guild, { structure: ctx.structure, log, actor: interaction.user });
  return interaction.editReply({ embeds: buildReportEmbeds(plan, stats, ctx) });
}

async function handleSetupCommand(interaction, log, ctx = PALWORLD_CTX) {
  const confirm = interaction.options.getBoolean("confirmar");
  if (confirm === true) return runConfirmedSetup(interaction, log, ctx);
  if (confirm === false) {
    if (log && typeof log.info === "function") {
      log.info(`${ctx.logTag} setup cancelado via comando`, { servidor: interaction.guild && interaction.guild.name, usuario: interaction.user.tag });
    }
    return interaction.reply({ content: "❌ Criação cancelada. Nenhum elemento foi criado.", ephemeral: true });
  }
  return handlePreviewCommand(interaction, log, ctx);
}

async function handleConfirmButton(interaction, log, ctx = PALWORLD_CTX) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "⚠️ Este botão só funciona dentro de um servidor.", ephemeral: true });
  }
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: "❌ Você precisa da permissão **Administrador** ou **Gerenciar Servidor** para confirmar a criação.",
      ephemeral: true,
    });
  }
  const missing = getMissingBotPermissions(guild);
  if (missing.length) {
    return interaction.reply({
      content: `❌ O bot não possui as permissões necessárias: ${missing.map((m) => `\`${m}\``).join(", ")}. Nenhum elemento foi alterado.`,
      ephemeral: true,
    });
  }
  await interaction.deferUpdate();
  const { plan, stats } = await executeSetup(guild, { structure: ctx.structure, log, actor: interaction.user });
  return interaction.editReply({ embeds: buildReportEmbeds(plan, stats, ctx), components: [] });
}

async function handleCancelButton(interaction, log, ctx = PALWORLD_CTX) {
  await interaction.deferUpdate();
  if (log && typeof log.info === "function") {
    log.info(`${ctx.logTag} setup cancelado via botão`, { servidor: interaction.guild && interaction.guild.name, usuario: interaction.user.tag });
  }
  return interaction.editReply({ content: "❌ Criação cancelada. Nenhum elemento foi criado.", embeds: [], components: [] });
}

function buildInteractionHandler({ log } = {}) {
  return async function onInteraction(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
          case "servidor-info":
            return await handleServidorInfoCommand(interaction, log);
          case "preview-palworld":
            return await handlePreviewCommand(interaction, log, PALWORLD_CTX);
          case "setup-palworld":
            return await handleSetupCommand(interaction, log, PALWORLD_CTX);
          case "preview-redesign":
            return await handlePreviewCommand(interaction, log, TROPA_CTX);
          case "aplicar-redesign":
            return await handleSetupCommand(interaction, log, TROPA_CTX);
          default:
            return undefined;
        }
      }
      if (interaction.isButton()) {
        if (interaction.customId === PALWORLD_CTX.confirmCustomId) return await handleConfirmButton(interaction, log, PALWORLD_CTX);
        if (interaction.customId === PALWORLD_CTX.cancelCustomId) return await handleCancelButton(interaction, log, PALWORLD_CTX);
        if (interaction.customId === TROPA_CTX.confirmCustomId) return await handleConfirmButton(interaction, log, TROPA_CTX);
        if (interaction.customId === TROPA_CTX.cancelCustomId) return await handleCancelButton(interaction, log, TROPA_CTX);
      }
      return undefined;
    } catch (err) {
      if (log && typeof log.error === "function") log.error("[palworld] erro ao processar interação:", err.message);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: "❌ Ocorreu um erro inesperado. Nenhum elemento foi alterado.", ephemeral: true });
        } else {
          await interaction.reply({ content: "❌ Ocorreu um erro inesperado. Nenhum elemento foi alterado.", ephemeral: true });
        }
      } catch {
        // silencioso: a resposta já não é possível
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  PALWORLD_STRUCTURE,
  TROPA_STRUCTURE,
  TROPA_IDENTITY,
  PALWORLD_CTX,
  TROPA_CTX,
  analyzeGuild,
  planSetup,
  executeSetup,
  buildCommandDefinitions,
  buildInteractionHandler,
  buildServidorInfoEmbeds,
  buildPreviewEmbeds,
  buildReportEmbeds,
  buildConfirmRow,
  canManageGuild,
  getMissingBotPermissions,
  splitIntoChunks,
  sectionsToEmbeds,
  createWithNameFallback,
  _internals: {
    norm,
    nextSafeName,
    findVariant,
    buildNameIndex,
    summarizePlan,
    channelTypeLabel,
  },
};
