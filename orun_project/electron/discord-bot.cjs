const { Client, GatewayIntentBits, Events, Partials } = require("discord.js");

class DiscordBot {
  constructor() {
    this.client = null;
    this.token = null;
    this.status = "disconnected"; // disconnected | connecting | connected | error
    this.log = console;
    this.onMessage = null; // callback: (message, channel) => void
    this.onStatusChange = null; // callback: (status) => void
    this._messageHandler = null;
    this._readyHandler = null;
    this._errorHandler = null;
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

      this._readyHandler = () => {
        this.log.info(`[discord] Bot logged in as ${this.client.user.tag}`);
        this._emitStatus("connected");
        this.client.user.setPresence({
          activities: [{ name: "Orun OS", type: 0 }],
          status: "online",
        });
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

      this.client.once(Events.ClientReady, this._readyHandler);
      this.client.on(Events.MessageCreate, this._messageHandler);
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

module.exports = { DiscordBot };
