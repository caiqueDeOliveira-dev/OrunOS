// telegram-handler.cjs
// Routes incoming Telegram messages to the correct agent and processes AI responses.

function createTelegramHandler({ db, aiRouter, agentProcessor, buildSystemPrompt, resolveAISettings, log }) {

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

    const agentName = resolveAgent(chatId);
    if (!agentName) {
      // No agent assigned to this chat — send help message
      await telegram.sendMessage(chatId,
        "Nenhum agente configurado para este chat. " +
        "Use /agent <nome> para atribuir um agente (ex: /agent Health)."
      ).catch(() => {});
      return;
    }

    // Check for slash commands
    if (text?.startsWith("/")) {
      const handled = await handleCommand(chatId, text, agentName, telegram);
      if (handled) return;
    }

    log.info(`[telegram] Processing message from ${from?.firstName || chatId} for agent ${agentName}`);

    try {
      const aiSettings = resolveAISettings(agentName);
      const basePrompt = buildSystemPrompt(null, agentName);
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

      const result = await aiRouter.routeChat(messages, {
        provider: aiSettings.provider,
        model: aiSettings.model,
        systemPrompt: basePrompt,
        temperature: 0.7,
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
        await telegram.sendMessage(chatId, `Agente atual: *${currentAgent}*`, ).catch(() => {});
        return true;
      }
      const validAgents = ["Hampton", "Health", "Finance", "Developer", "Marketing", "Teacher", "Designer", "Creator"];
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
