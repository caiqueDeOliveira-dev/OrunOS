// whatsapp-handler.cjs
// Routes WhatsApp messages to the correct agent and handles AI responses.

const path = require("path");
const fs = require("fs");

/**
 * Find which agent is assigned to a given JID.
 */
function agentForJid(jid, db) {
  const cfg = db.getSetting("whatsapp", {});
  const agentJids = cfg.agentJids || {};
  for (const [agent, agentJid] of Object.entries(agentJids)) {
    if (agentJid && jid === agentJid) return agent;
  }
  return null;
}

/**
 * Handle an incoming WhatsApp message: route to agent, process with AI, reply.
 */
async function handleWhatsAppMessage({ jid, text, imageBase64, fromMe }, ctx) {
  const { db, aiRouter, agentProcessor, secretStore, whatsapp, waAutomation, buildSystemPrompt, resolveAISettings, log, saveNutritionToFile, getErrorMessage } = ctx;

  const cfg = db.getSetting("whatsapp", {});

  const agentId = (() => {
    const matched = agentForJid(jid, db);
    if (matched) {
      if (imageBase64) {
        if (matched === "Finance") return "Finance";
        return "Health";
      }
      if (matched === "Nutritionist" || matched === "Health" || matched === "Personal Trainer") return "Health";
      if (matched === "Social Media" || matched === "Marketing") return "Marketing";
      if (matched === "Personal Assistant") return undefined;
      return matched;
    }
    if (cfg.listenJid && jid === cfg.listenJid) return imageBase64 ? "Health" : undefined;
    return null;
  })();

  if (!agentId) return;

  const imagePrompts = {
    Health: "Analise essa foto de comida. Identifique o prato, estime calorias e macronutrientes. Responda em português do Brasil.",
    Finance: "Analise essa foto de comprovante financeiro (PIX, cartão, boleto, nota fiscal). Identifique: valor, data, descrição/estabelecimento, tipo (receita/despesa), categoria. Se for um comprovante de pagamento, extraia os dados e registre como despesa. Se for um comprovante de recebimento, registre como receita. Responda em português do Brasil.",
  };

  const userMessage = imageBase64
    ? { role: "user", content: text || imagePrompts[agentId] || imagePrompts.Health, image: { base64: imageBase64, mime: "image/jpeg" } }
    : { role: "user", content: text };
  if (!userMessage.content && !imageBase64) return;

  log.info(`[whatsapp] message from ${jid} → agent=${agentId}`);

  // Process automations
  waAutomation.processIncomingMessage(
    { jid, text, agentId },
    {
      sendFn: (j, t) => whatsapp.sendMessage(j, t),
      db,
      scheduleFn: (schedule) => {
        try {
          const schedCfg = db.getSetting("schedules", {});
          const agentSchedule = schedCfg[agentId] || { enabled: false, entries: [] };
          agentSchedule.entries = agentSchedule.entries || [];
          agentSchedule.entries.push({
            date: schedule.date,
            description: schedule.description,
            source: schedule.source,
            groupJid: schedule.groupJid,
            createdAt: new Date().toISOString(),
          });
          db.setSetting("schedules", { ...schedCfg, [agentId]: agentSchedule });
          log.info(`[wa-automation] auto-scheduled for ${agentId}: ${schedule.date}`);
        } catch (err) {
          log.warn("[wa-automation] auto-schedule failed:", err.message);
        }
      },
      log,
    },
  );

  const settings = resolveAISettings(agentId);
  const keys = secretStore.readSecretStore();
  const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);

  // Cross-provider fallback chain
  const fallbackChain = [
    { provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider] },
    ...["groq", "openrouter", "github", "opencodezen"]
      .filter((p) => p !== settings.provider && keys[p])
      .map((p) => ({ provider: p, model: aiRouter.KNOWN_FREE_MODELS?.[p]?.[0], baseUrl: undefined, apiKey: keys[p] })),
  ];

  let lastErr;
  for (const attempt of fallbackChain) {
    if (!attempt.apiKey) continue;
    try {
      log.info(`[whatsapp] trying ${attempt.provider}/${attempt.model}`);
      const { context } = await aiRouter.buildContext({ messages: [userMessage], systemPrompt, provider: attempt.provider, model: attempt.model, baseUrl: attempt.baseUrl, apiKey: attempt.apiKey });
      const result = await aiRouter.routeChat({ provider: attempt.provider, model: attempt.model, baseUrl: attempt.baseUrl, apiKey: attempt.apiKey, messages: context });
      agentProcessor.recordUsageSafely(attempt.provider, result.usage);
      const finalText = agentProcessor.processAgentReply(agentId, result.text);

      if (imageBase64 && agentId === "Health" && saveNutritionToFile) saveNutritionToFile(finalText);

      await whatsapp.sendMessage(jid, finalText);
      return;
    } catch (err) {
      lastErr = err;
      log.warn(`[whatsapp] ${attempt.provider} failed: ${err.message}`);
    }
  }
  log.error("[whatsapp] all providers failed:", lastErr?.message);
  try { await whatsapp.sendMessage(jid, `Erro ao processar: ${getErrorMessage(lastErr)}`); } catch { /* ignore */ }
}

/**
 * Save nutrition analysis to a daily markdown file in user data.
 */
function saveNutritionToFile(text, userDataPath, log) {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(userDataPath, "nutrition");
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${date}.md`);
    const header = fs.existsSync(filePath) ? "" : `# Cardápio ${date}\n\n`;
    fs.appendFileSync(filePath, `${header}${text}\n\n---\n\n`);
    log.info(`[nutrition] saved to ${filePath}`);
  } catch (err) {
    log.warn("[nutrition] failed to save file:", err.message);
  }
}

module.exports = { handleWhatsAppMessage, saveNutritionToFile, agentForJid };
