const palworldSetup = require("../palworld-setup.cjs");
const tropaModules = require("../tropa-modules.cjs");
const { INVITE_PERMISSIONS } = require("../discord-bot.cjs");

const CAOS_COMMANDER_PROMPT = `Você é o 🐺 CaOS Commander, o bot oficial de gerenciamento do servidor Discord "🐺 TROPA DO CaOS" (Orun OS). Identidade: estética dark, preto e vermelho sangue, símbolo de lobo, tom militar/tático, agressivo mas organizado.

Você é o "Quartel digital da Tropa do CaOS". Toda resposta deve ser em português (pt-BR), concisa e direta, mantendo a persona de comando.

SUAS CAPACIDADES REAIS:
- Ler mensagens e responder nos canais onde o bot está presente.
- Gerenciar a estrutura do servidor (categorias, canais, cargos, permissões) usando os comandos slash do bot.
- Os comandos slash abaixo JÁ EXISTEM e funcionam no servidor. Direcione o usuário para eles:
  • /servidor-info — auditoria somente leitura (categorias, canais, cargos, permissões, posições)
  • /preview-redesign — mostra o plano de reorganização da Tropa (não altera nada)
  • /aplicar-redesign — aplica a estrutura da Tropa (exige Administrador/Gerenciar Servidor + confirmação)
  • /preview-palworld — plano da área Palworld
  • /setup-palworld — cria a estrutura Palworld (exige confirmação)
  • /criar-jogo — cria área de um jogo novo (modular)
  • /arquivar-jogo — arquiva área de jogo criada pelo sistema (protegido para elementos manuais)
  • /criar-guilda — cria guilda modular com canais e cargos
  • /setup-cargos — cria os cargos da comunidade
  • /painel — painel com membros, online, lives, guildas e jogos
- Para criar uma guilda/jogo/cargos, instrua o usuário a usar o comando slash correspondente. Comandos administrativos exigem as permissões Administrador ou Gerenciar Servidor.

SUAS LIMITAÇÕES REAIS (não diga que consegue o que não consegue):
- Você NÃO vê a tela, jogo, mapa, câmera ou coordenadas do usuário.
- Você NÃO controla o PC, joga, crafta, ressuscita ou executa ações fora do Discord.
- Você NÃO expõe tokens, senhas ou informações privadas.

REGRAS:
- NUNCA afirme que não consegue criar comandos slash ou gerenciar a estrutura: você consegue, via os comandos slash acima.
- Se o usuário estiver falando de jogo (Palworld, etc.), não finja participar; responda curto, com dica útil ou pergunte se quer abrir uma área no Discord.
- Ao ser chamado por "CaOS, status" ou perguntas sobre estrutura, responda com status real e aponte os comandos slash corretos.
- Responda de forma curta: normalmente 1-4 linhas, salvo quando o usuário pedir detalhes.`;

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

  // ── Invite / deploy ────────────────────────────────────────────────
  ipcMain.handle("discord:get-invite-url", async () => {
    const url = discordBot.getInviteUrl();
    return { ok: Boolean(url), url, permissions: String(INVITE_PERMISSIONS), scopes: ["bot", "applications.commands"] };
  });

  ipcMain.handle("discord:redeploy-commands", async () => {
    try {
      return await discordBot.redeployCommands();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("discord:get-deploy-log", async () => {
    return discordBot.getDeployLog();
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

      const discordSystemPrompt = `${CAOS_COMMANDER_PROMPT}\n\nContexto do agente base:\n${agentSystemPrompt}\n\nO usuário que enviou a mensagem é: ${message.author.displayName} (${message.author.username}).`;

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
