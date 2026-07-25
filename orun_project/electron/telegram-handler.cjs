// telegram-handler.cjs
// Routes incoming Telegram messages to the correct agent and processes AI responses.

function createTelegramHandler({ db, aiRouter, agentProcessor, buildSystemPrompt, resolveAISettings, secretStore, log }) {

  // Map Telegram chat IDs to agent names
  function resolveAgent(chatId) {
    const cfg = db.getSetting("telegram", {});
    const agentMap = cfg.agentChats || {};
    return agentMap[chatId] || null;
  }

  // Process incoming message and generate AI response
  async function handleMessage(msg, telegram) {
    const { chatId, text, imageFileId, from } = msg;

    if (!text && !imageFileId) return;

    // Handle slash commands first (before agent check, so /agent works even without assignment)
    if (text?.startsWith("/")) {
      const currentAgent = resolveAgent(chatId);
      const handled = await handleCommand(chatId, text, currentAgent, telegram);
      if (handled) return;
    }

    const agentName = resolveAgent(chatId);
    if (!agentName) {
      await telegram.sendMessage(chatId,
        "Nenhum agente configurado para este chat. " +
        "Use /agent <nome> para atribuir um agente (ex: /agent Health)."
      ).catch(() => {});
      return;
    }

    log.info(`[telegram] Processing message from ${from?.firstName || chatId} for agent ${agentName}`);

    try {
      const aiSettings = resolveAISettings(agentName);
      const basePrompt = buildSystemPrompt(null, agentName);
      const keys = secretStore.readSecretStore();
      const apiKey = keys[aiSettings.provider];
      const messages = [{ role: "user", content: text || "Analyze this image" }];

      // Image handling for Health agent
      if (imageFileId && agentName === "Health") {
        messages[0] = {
          role: "user",
          content: [
            { type: "text", text: "Analise esta imagem de comida. Identifique os alimentos, estime calorias e macros. Responda em português." },
            { type: "image_url", image_url: { url: imageFileId } },
          ],
        };
      }

      const { context } = await aiRouter.buildContext({
        messages,
        systemPrompt: basePrompt,
        provider: aiSettings.provider,
        model: aiSettings.model,
        baseUrl: aiSettings.baseUrl,
        apiKey,
      });

      const result = await aiRouter.routeChat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        baseUrl: aiSettings.baseUrl,
        apiKey,
        messages: context,
      });

      const rawReply = result?.text || result || "";
      const processed = agentProcessor.processAgentReply(rawReply, agentName);
      const finalText = processed.text || String(rawReply);

      await telegram.sendMessage(chatId, finalText);
      log.info(`[telegram] Response sent to ${chatId}`);
    } catch (err) {
      log.error(`[telegram] AI processing failed:`, err.message);
      await telegram.sendMessage(chatId,
        `Erro ao processar mensagem: ${err.message}`
      ).catch(() => {});
    }
  }

  // Handle slash commands
  async function handleCommand(chatId, text, currentAgent, telegram) {
    const parts = text.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    if (cmd === "/agent" || cmd === "/agente") {
      if (!arg) {
        await telegram.sendMessage(chatId, currentAgent ? `Agente atual: *${currentAgent}*` : "Nenhum agente definido. Use /agent <nome> para escolher.").catch(() => {});
        return true;
      }
      const validAgents = ["Hampton", "Health", "Finance", "Developer", "Marketing", "Teacher", "Designer", "Creator", "Personal Assistant"];
      const match = validAgents.find(a => a.toLowerCase() === arg.toLowerCase());
      if (!match) {
        await telegram.sendMessage(chatId, `Agentes disponíveis: ${validAgents.join(", ")}`).catch(() => {});
        return true;
      }
      const cfg = db.getSetting("telegram", {});
      const agentChats = cfg.agentChats || {};
      agentChats[chatId] = match;
      db.setSetting("telegram", { ...cfg, agentChats });
      await telegram.sendMessage(chatId, `Agente alterado para *${match}*`).catch(() => {});
      return true;
    }

    if (cmd === "/start" || cmd === "/ajuda" || cmd === "/help") {
      await telegram.sendMessage(chatId,
        "*Orun OS — Telegram Bot*\n\n" +
        "Comandos:\n" +
        "/agent <nome> — Mudar agente (Health, Finance, Developer, Marketing, etc.)\n" +
        "/agent — Ver agente atual\n" +
        "/start — Esta mensagem"
      ).catch(() => {});
      return true;
    }

    return false;
  }

  return { handleMessage, resolveAgent };
}

module.exports = { createTelegramHandler };
