const { Client, GatewayIntentBits, Events, Partials, REST, Routes, PermissionFlagsBits } = require("discord.js");

// Permissões solicitadas no link de convite (escopos bot + applications.commands)
const INVITE_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.ManageChannels |
  PermissionFlagsBits.ManageRoles |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.AttachFiles |
  PermissionFlagsBits.UseApplicationCommands;

class DiscordBot {
  constructor() {
    this.client = null;
    this.token = null;
    this.status = "disconnected"; // disconnected | connecting | connected | error
    this.log = console;
    this.onMessage = null; // callback: (message, channel) => void
    this.onStatusChange = null; // callback: (status) => void
    this.onInteraction = null; // callback: (interaction) => void
    this.commands = []; // array de SlashCommandBuilder (deploy per-guild)
    this.lastDeploy = null; // { at, commands, results } — log do último deploy
    this._messageHandler = null;
    this._readyHandler = null;
    this._errorHandler = null;
    this._interactionHandler = null;
  }

  setLogger(log) {
    this.log = log || console;
  }

  setStatusCallbacks(onStatusChange) {
    this.onStatusChange = onStatusChange;
  }

  setMessageCallback(onMessage) {
    this.onMessage = onMessage;
  }

  setCommands(commands) {
    this.commands = Array.isArray(commands) ? commands : [];
  }

  setInteractionHandler(onInteraction) {
    this.onInteraction = onInteraction;
  }

  async deployCommands() {
    if (!this.client || !this.client.isReady() || this.commands.length === 0) {
      return { deployed: 0, failed: 0, results: [], reason: "not_ready_or_empty" };
    }
    const rest = new REST({ version: "10" }).setToken(this.token);
    const body = this.commands.map((c) => (typeof c.toJSON === "function" ? c.toJSON() : c));
    const results = [];
    for (const guild of this.client.guilds.cache.values()) {
      try {
        await rest.put(Routes.applicationGuildCommands(this.client.user.id, guild.id), { body });
        this.log.info(`[discord] Comandos registrados em "${guild.name}" (${guild.id})`);
        results.push({ guild: { id: guild.id, name: guild.name }, ok: true, commands: body.length });
      } catch (err) {
        this.log.error(`[discord] Falha ao registrar comandos em "${guild.name}":`, err.message);
        results.push({ guild: { id: guild.id, name: guild.name }, ok: false, error: err.message });
      }
    }
    this.lastDeploy = { at: Date.now(), commands: body.length, results };
    return {
      deployed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  // Reexecuta o deploy dos comandos slash (sem reconectar o bot).
  async redeployCommands() {
    if (!this.client || !this.client.isReady()) {
      return { ok: false, error: "Bot não conectado" };
    }
    const res = await this.deployCommands();
    return { ok: res.failed === 0, ...res };
  }

  // Log do último deploy (para exibição no painel).
  getDeployLog() {
    return this.lastDeploy;
  }

  // Link de convite com escopos bot + applications.commands.
  getInviteUrl() {
    if (!this.client || !this.client.isReady() || !this.client.user) {
      return null;
    }
    return `https://discord.com/oauth2/authorize?client_id=${this.client.user.id}&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
  }

  _emitStatus(status) {
    this.status = status;
    if (this.onStatusChange) this.onStatusChange(status);
  }

  async connect(token) {
    if (this.client && this.status === "connected") {
      await this.disconnect();
    }

    this.token = token;
    this._emitStatus("connecting");

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
        partials: [Partials.Channel, Partials.Message],
      });

      this._readyHandler = async () => {
        this.log.info(`[discord] Bot logged in as ${this.client.user.tag}`);
        this._emitStatus("connected");
        this.client.user.setPresence({
          activities: [{ name: "Orun OS", type: 0 }],
          status: "online",
        });
        await this.deployCommands();
      };

      this._messageHandler = async (message) => {
        if (message.author.bot) return;
        if (!this.onMessage) return;

        const channel = message.channel;
        const content = message.content;
        const author = {
          id: message.author.id,
          username: message.author.username,
          displayName: message.author.displayName || message.author.username,
          avatarURL: message.author.displayAvatarURL(),
        };
        const guild = message.guild ? { id: message.guild.id, name: message.guild.name } : null;

        try {
          const response = await this.onMessage({
            content,
            author,
            guild,
            channelId: channel.id,
            channelName: channel.name || "DM",
            isDM: !message.guild,
          });

          if (response && response.text) {
            await channel.send(response.text);
          }
        } catch (err) {
          this.log.error("[discord] Message handler error:", err.message);
        }
      };

      this._errorHandler = (error) => {
        this.log.error("[discord] Client error:", error.message);
        if (error.message.includes("TOKEN_INVALID") || error.message.includes("An invalid token was provided")) {
          this._emitStatus("error");
        }
      };

      this._interactionHandler = async (interaction) => {
        if (!this.onInteraction) return;
        try {
          await this.onInteraction(interaction);
        } catch (err) {
          this.log.error("[discord] Interaction handler error:", err.message);
        }
      };

      this.client.once(Events.ClientReady, this._readyHandler);
      this.client.on(Events.MessageCreate, this._messageHandler);
      this.client.on(Events.InteractionCreate, this._interactionHandler);
      this.client.on(Events.Error, this._errorHandler);

      await this.client.login(token);
      return { ok: true };
    } catch (err) {
      this.log.error("[discord] Connection failed:", err.message);
      this._emitStatus("error");
      return { ok: false, error: err.message };
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.destroy();
      this.client = null;
    }
    this._emitStatus("disconnected");
    return { ok: true };
  }

  getStatus() {
    return this.status;
  }

  getGuilds() {
    if (!this.client || !this.client.isReady()) return [];
    return this.client.guilds.cache.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
      iconURL: g.iconURL(),
    }));
  }

  getChannels(guildId) {
    if (!this.client || !this.client.isReady()) return [];
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return [];
    return guild.channels.cache
      .filter((c) => c.isTextBased())
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));
  }

  async sendMessage(channelId, content) {
    if (!this.client || !this.client.isReady()) {
      return { ok: false, error: "Bot não conectado" };
    }
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        return { ok: false, error: "Canal não encontrado ou não é de texto" };
      }
      const msg = await channel.send(content);
      return { ok: true, messageId: msg.id };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async sendDM(userId, content) {
    if (!this.client || !this.client.isReady()) {
      return { ok: false, error: "Bot não conectado" };
    }
    try {
      const user = await this.client.users.fetch(userId);
      const dm = await user.createDM();
      const msg = await dm.send(content);
      return { ok: true, messageId: msg.id };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  isReady() {
    return this.client && this.client.isReady();
  }
}

module.exports = { DiscordBot, INVITE_PERMISSIONS };
