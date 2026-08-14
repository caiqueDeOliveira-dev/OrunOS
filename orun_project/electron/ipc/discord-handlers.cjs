const palworldSetup = require("../palworld-setup.cjs");
const tropaModules = require("../tropa-modules.cjs");

function register(ipcMain, ctx) {
  const { discordBot, secretStore, aiRouter, buildSystemPrompt, log, db } = ctx;

  // ── Slash commands / interações (área Palworld + módulos da Tropa) ──
  discordBot.setCommands([
    ...palworldSetup.buildCommandDefinitions(),
    ...tropaModules.buildCommandDefinitions(),
  ]);
  const tropaHandler = tropaModules.buildInteractionHandler({ log, db });
  const palworldHandler = palworldSetup.buildInteractionHandler({ log });
  discordBot.setInteractionHandler(async (interaction) => {
    const handled = await tropaHandler(interaction);
    if (handled !== undefined) return handled;
    return palworldHandler(interaction);
  });

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

      const resolveAISettings = ctx.resolveAISettings;
      const aiSettings = resolveAISettings ? resolveAISettings("Marketing") : (ctx.getGlobalAISettings?.() || {});
      const keys = secretStore.readSecretStore();
      const apiKey = keys[aiSettings.provider];
      const agentSystemPrompt = buildSystemPrompt(null, "Marketing");

      const discordSystemPrompt = `${agentSystemPrompt}\n\nVocê é um agente de IA respondendo no Discord. Responda de forma concisa e útil. O usuário que enviou a mensagem é: ${message.author.displayName} (${message.author.username}).`;

      const messages = [{ role: "user", content: message.content }];

      const { context } = await aiRouter.buildContext({
        messages,
        systemPrompt: discordSystemPrompt,
        provider: aiSettings.provider,
        model: aiSettings.model,
        baseUrl: aiSettings.baseUrl,
        apiKey,
      });

      const response = await aiRouter.routeChat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        baseUrl: aiSettings.baseUrl,
        apiKey,
        messages: context,
      });
      return { text: response.text || response };
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
