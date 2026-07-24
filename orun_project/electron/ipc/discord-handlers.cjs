function register(ipcMain, ctx) {
  const { discordBot, secretStore, aiRouter, buildSystemPrompt, log } = ctx;

  // ── Connection ──────────────────────────────────────────────────
  ipcMain.handle("discord:get-token", async () => {
    try {
      const data = await secretStore.get("discord_bot_token");
      return data?.token || "";
    } catch { return ""; }
  });

  ipcMain.handle("discord:set-token", async (_e, token) => {
    await secretStore.set("discord_bot_token", { token });
    return { ok: true };
  });

  ipcMain.handle("discord:connect", async (_e, token) => {
    try {
      const result = await discordBot.connect(token);
      if (result.ok && token) {
        await secretStore.set("discord_bot_token", { token });
      }
      return result;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("discord:disconnect", async () => {
    try {
      return await discordBot.disconnect();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("discord:get-status", async () => {
    return discordBot.getStatus();
  });

  // ── Guilds & Channels ──────────────────────────────────────────
  ipcMain.handle("discord:get-guilds", async () => {
    return discordBot.getGuilds();
  });

  ipcMain.handle("discord:get-channels", async (_e, guildId) => {
    return discordBot.getChannels(guildId);
  });

  // ── Messages ──────────────────────────────────────────────────
  ipcMain.handle("discord:send-message", async (_e, channelId, content) => {
    return discordBot.sendMessage(channelId, content);
  });

  ipcMain.handle("discord:send-dm", async (_e, userId, content) => {
    return discordBot.sendDM(userId, content);
  });

  // ── Configure Marketing agent to respond to Discord ───────────
  ipcMain.handle("discord:set-agent-response", async (_e, enabled) => {
    await secretStore.set("discord_agent_response", { enabled });
    return { ok: true };
  });

  ipcMain.handle("discord:get-agent-response", async () => {
    try {
      const data = await secretStore.get("discord_agent_response");
      return data?.enabled ?? false;
    } catch { return false; }
  });

  // ── Set up message handler for Marketing agent ────────────────
  discordBot.setMessageCallback(async (message) => {
    try {
      const agentResponseEnabled = await secretStore.get("discord_agent_response");
      if (!agentResponseEnabled?.enabled) return null;

      const aiSettings = ctx.getGlobalAISettings?.() || {};
      const systemPrompt = buildSystemPrompt("Marketing", null);

      const messages = [
        { role: "system", content: `${systemPrompt}\n\nVocê é um agente de IA respondendo no Discord. Responda de forma concisa e útil. O usuário que enviou a mensagem é: ${message.author.displayName} (${message.author.username}).` },
        { role: "user", content: message.content },
      ];

      const response = await aiRouter.routeChat(messages, aiSettings);
      return { text: response };
    } catch (err) {
      log.error("[discord] Agent response error:", err.message);
      return null;
    }
  });

  // ── Restore token on startup ─────────────────────────────────
  (async () => {
    try {
      const data = await secretStore.get("discord_bot_token");
      if (data?.token) {
        await discordBot.connect(data.token);
      }
    } catch { /* ignore */ }
  })();
}

module.exports = { register };
