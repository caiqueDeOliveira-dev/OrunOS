const palworldSetup = require("../palworld-setup.cjs");
const tropaModules = require("../tropa-modules.cjs");
const { INVITE_PERMISSIONS } = require("../discord-bot.cjs");
const discordBridge = require("../discord-bridge.cjs");

const CAOS_MAIN_GUILD_ID = "1436425754740129836";
const CAOS_MAX_ITERATIONS = 6;

const DISCORD_CHAT_TOOLS = discordBridge.TOOL_DEFINITIONS.filter((t) =>
  ["discord_status", "discord_server_info", "discord_channels", "discord_roles", "discord_plan"].includes(t.function?.name),
);

async function runCaosBrain({ systemPrompt, content, aiSettings, apiKey, log }) {
  const messages = [{ role: "user", content }];
  let context;
  try {
    const ctxResult = await aiRouter.buildContext({
      messages,
      systemPrompt,
      provider: aiSettings.provider,
      model: aiSettings.model,
      baseUrl: aiSettings.baseUrl,
      apiKey,
    });
    context = ctxResult.context;
  } catch {
    context = [{ role: "system", content: systemPrompt }, ...messages];
  }

  let lastToolText = "";
  let retriedWithoutTool = false;
  for (let i = 0; i < CAOS_MAX_ITERATIONS; i++) {
    let result;
    try {
      result = await aiRouter.chatWithTools({
        provider: aiSettings.provider,
        model: aiSettings.model,
        baseUrl: aiSettings.baseUrl,
        apiKey,
        messages: context,
        tools: DISCORD_CHAT_TOOLS,
      });
    } catch (err) {
      log?.error?.("[discord] CaOS brain chat error:", err.message);
      return lastToolText || `Não consegui consultar o servidor agora: ${err.message}`;
    }

    if (!result.toolCalls || result.toolCalls.length === 0) {
      const finalText = result.text || lastToolText || "";
      const claimedAudit = /\b(analis|audit|auditoria|inspecion|verificad?|status|servidor)\b/i.test(finalText)
        && /\b(categorias?|canais|cargos|membros|guilds?|guild_id)\b/i.test(finalText);
      if (claimedAudit && !retriedWithoutTool) {
        retriedWithoutTool = true;
        context.push({ role: "assistant", content: finalText || null });
        context.push({
          role: "user",
          content: `Não descreva a análise: chame agora as ferramentas discord_status e discord_server_info (guild_id "${CAOS_MAIN_GUILD_ID}") e responda com os dados reais retornados.`,
        });
        continue;
      }
      return finalText;
    }

    if (result.text && result.text.trim()) lastToolText = result.text;

    for (const tc of result.toolCalls) {
      const name = String(tc.name || "").replace(/^discord_/, "");
      let toolResult;
      try {
        toolResult = await discordBridge.execute(name, tc.arguments || {});
      } catch (err) {
        toolResult = { error: err.message };
      }
      log?.info?.("[discord] CaOS tool:", `${tc.name} → ${JSON.stringify(toolResult).slice(0, 300)}`);
      context.push({
        role: "assistant",
        content: result.text || null,
        tool_calls: [{ id: tc.id, type: "function", function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) } }],
      });
      context.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) });
    }
  }
  return lastToolText || "Não consegui completar a análise do servidor.";
}

const CAOS_COMMANDER_PROMPT = `Você é o 🐺 CaOS Commander, o quartel digital do servidor Discord "🐺 TROPA DO CaOS" (Orun OS). Estética dark, preto e vermelho sangue, símbolo de lobo, tom militar/tático, agressivo mas organizado. Responda sempre em pt-BR, curto e direto (1-4 linhas, salvo quando pedirem detalhes).

SERVIDOR PRINCIPAL: "🐺 TROPA DO CaOS" — guild_id ${CAOS_MAIN_GUILD_ID}.

VOCÊ TEM FERRAMENTAS REAIS DE AUDITORIA (use-as — NUNCA diga que não consegue auditar o servidor):
- discord_status — status do bot + lista de servidores com id/nome/membros. Chame primeiro para descobrir guild_id.
- discord_server_info — auditoria completa: categorias, canais, cargos, permissões, posições.
- discord_channels — mapa de canais por categoria.
- discord_roles — lista de cargos com posição/cor.
- discord_plan — plano somente leitura (areas: tropa, palworld, game, guild, roles).
Quando o usuário pedir "status", "auditoria", "servidor-info" ou quiser saber a estrutura, chame as ferramentas e responda com os DADOS REAIS retornados. Não descreva o que faria — execute.

COMANDOS SLASH (quem EXECUTA mudanças no servidor é o usuário, pelos comandos slash do bot — você não escreve código nem registra comandos):
- /servidor-info (auditoria), /preview-redesign (diff), /aplicar-redesign (confirmação), /preview-palworld, /setup-palworld (confirmação), /criar-jogo, /arquivar-jogo, /criar-guilda, /setup-cargos, /painel.
Comandos administrativos exigem Administrador ou Gerenciar Servidor. Se o usuário pedir para CRIAR/APLICAR estrutura, instrua-o a usar o slash command correspondente.

LIMITAÇÕES REAIS (não invente capacidade):
- Você NÃO vê tela/jogo/mapa/coordenadas do usuário; NÃO controla o PC; NÃO joga.
- NUNCA exponha tokens, senhas ou informações privadas.
- NUNCA diga que "não tem acesso", "não roda no ambiente" ou "não consegue": para auditoria você TEM as ferramentas acima e para escrita existem os comandos slash.`;

function register(ipcMain, ctx) {
  const { discordBot, secretStore, aiRouter, buildSystemPrompt, log, db } = ctx;
  const { resolveAISettings } = ctx;

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

  // ── Set up message handler for CaOS Commander ────────────────
  discordBot.setMessageCallback(async (message) => {
    try {
      const agentResponseEnabled = await secretStore.get("discord_agent_response");
      if (!agentResponseEnabled?.enabled) return null;

      const aiSettings = resolveAISettings ? resolveAISettings("CaOS Commander") : (ctx.getGlobalAISettings?.() || {});
      const keys = secretStore.readSecretStore();
      const apiKey = keys[aiSettings.provider];
      const agentSystemPrompt = buildSystemPrompt(null, "CaOS Commander");

      const discordSystemPrompt = `${CAOS_COMMANDER_PROMPT}\n\nContexto do agente base:\n${agentSystemPrompt}\n\nO usuário que enviou a mensagem é: ${message.author.displayName} (${message.author.username}).`;

      const text = await runCaosBrain({
        systemPrompt: discordSystemPrompt,
        content: message.content,
        aiSettings,
        apiKey,
        log,
      });
      return text ? { text } : null;
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
