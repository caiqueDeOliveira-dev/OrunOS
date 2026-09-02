// whatsapp-handler.cjs
//
// Roteia mensagens do WhatsApp para o agente correto e processa a resposta.
//
// Pipeline (regra-fim da arquitetura):
//   Grupo/canal → AgentChannel → Agente
//   Remetente   → UserIdentity → User → Profile → Workspace
//
// Regras:
//   - Mensagens de nós mesmos (fromMe) nunca são processadas.
//   - Remetente desconhecido entra em ONBOARDING (pedido de nome) — nunca é
//     criado um usuário silenciosamente.
//   - Dedup por external_message_id (evita re-processo do mesmo upsert).
//   - Áudio → STT → agente → resposta: TTS quando configurado (AUTO/ALWAYS).
//   - Persistência escopada por workspace + usuário + agente + canal.
//   - Memória injetada/gravada com escopo por workspace + user + agent.

const path = require("path");
const fs = require("fs");
const identityResolver = require("./identity-resolver.cjs");
const sttRouter = require("./stt-router.cjs");
const ttsRouter = require("./tts-router.cjs");
const careerBridge = require("./career.cjs");
const vehicleProfile = require("./vehicle-profile.cjs");

/**
 * Extract bare numeric part of a WhatsApp JID (drops device/server suffix).
 */
function jidBare(jid) {
  if (!jid) return "";
  return String(jid).split(":")[0].replace(/@.*$/, "").replace(/[^\d]/g, "");
}

/**
 * True when the bot (selfJid e/ou selfLid) está na lista de menções. Para o
 * socket, selfJid vem como "5599...:52@s.whatsapp.net"; menções podem chegar
 * como número ("5511...@s.whatsapp.net") ou como LID ("2409...@lid") — o
 * WhatsApp moderno entrega o @ usando o LID próprio do bot. Por isso
 * comparamos o JID da menção com ambos os identificadores do self.
 */
function isMentioned(mentionedJids, selfJid, selfLid) {
  if (!Array.isArray(mentionedJids)) return false;
  const selfBares = [jidBare(selfJid), jidBare(selfLid)].filter(Boolean);
  if (selfBares.length === 0) return false;
  return mentionedJids.some((j) => selfBares.includes(jidBare(j)));
}

/**
 * Find which agent is assigned to a given JID (legacy agentJids mapping).
 */
function agentForJid(jid, db) {
  const cfg = db.getSetting("whatsapp", {});
  const agentJids = cfg.agentJids || {};
  for (const [agent, agentJid] of Object.entries(agentJids)) {
    if (agentJid && jid === agentJid) return agent;
  }
  return null;
}

function getLogger(log) {
  if (log && typeof log.info === "function") return log;
  return require("./logger.cjs");
}

/**
 * Resolve o agente do canal: agent_channels primeiro, legado (agentJids) depois.
 */
function resolveAgent(payload, db, log) {
  const { jid, imageBase64, audioBase64 } = payload;
  const channel = identityResolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: jid }, db);
  if (channel && channel.agent) {
    if (imageBase64) {
      if (channel.agent === "Finance") return "Finance";
      return "Health";
    }
    return channel.agent;
  }

  const matched = agentForJid(jid, db);
  if (matched) {
    if (imageBase64) return matched === "Finance" ? "Finance" : "Health";
    if (matched === "Nutritionist" || matched === "Health" || matched === "Personal Trainer") return "Health";
    if (matched === "Social Media" || matched === "Marketing") return "Marketing";
    if (matched === "Personal Assistant") return matched;
    return matched;
  }

  const cfg = db.getSetting("whatsapp", {});
  if (cfg.listenJid && jid === cfg.listenJid) return imageBase64 || audioBase64 ? "Health" : undefined;
  return null;
}

/**
 * Fluxo de onboarding controlado: desconhecido → pergunta nome → cria usuário.
 */
async function handleOnboarding(payload, resolved, agentId, ctx) {
  const { jid, senderJid, senderName, text } = payload;
  const { db, whatsapp, log } = ctx;
  const logg = getLogger(log);
  const senderKey = senderJid || jid;

  if (resolved.status === "unknown") {
    logg.info(`[whatsapp] nova identidade (${senderKey}) — aguardando nome`);
    await whatsapp.sendMessage(jid, `Olá! Aqui é o *${agentId}* do Orun OS. Para eu te atender direito, qual é o seu nome?`);
    return;
  }

  // status === "onboarding": a próxima mensagem de texto é o nome.
  const name = (text || "").trim();
  if (!name) {
    await whatsapp.sendMessage(jid, "Pode me dizer seu nome?");
    return;
  }
  try {
    const { userId, workspaceId } = identityResolver.completeOnboarding(
      { identityId: resolved.identity.id, name, displayName: senderName || name },
      db
    );
    logg.info(`[whatsapp] onboarding completo: ${senderKey} → user=${userId} workspace=${workspaceId}`);
    await whatsapp.sendMessage(jid, `Prazer, *${name}*! Estou pronto pra te ajudar. 😉`);
  } catch (err) {
    logg.warn("[whatsapp] onboarding falhou:", err.message);
    try { await whatsapp.sendMessage(jid, "Ops, algo deu errado. Pode tentar de novo?"); } catch { /* ignore */ }
  }
}

/**
 * Transcreve áudio recebido (whisper local → groq fallback).
 */
async function transcribeAudio(audioBase64, audioMime, db, secretStore, log) {
  const logg = getLogger(log);
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const mimeType = audioMime || "audio/ogg; codecs=opus";
  const sttCfg = db.getSetting("stt", {}) || {};
  const engine = sttCfg.engine || "whisper";

  if (engine === "groq") {
    const apiKey = secretStore?.readSecretStore?.()?.groq;
    if (apiKey) {
      try {
        return await sttRouter.transcribeGroq(apiKey, audioBuffer, mimeType, "pt");
      } catch (err) {
        logg.warn("[whatsapp] groq STT falhou:", err.message);
      }
    }
  }

  const baseUrl = sttCfg.baseUrl || "http://127.0.0.1:8090";
  try {
    return await sttRouter.transcribeWhisper(baseUrl, audioBuffer, mimeType, "pt");
  } catch (err) {
    logg.warn("[whatsapp] whisper STT falhou:", err.message);
  }
  return { text: "", error: "no STT engine available" };
}

/**
 * Sintetiza áudio de resposta (edge/engine configurado). Retorna null em falha.
 */
async function synthesizeReplyAudio(text, agentId, db, secretStore, log) {
  const logg = getLogger(log);
  try {
    const tts = db.getSetting("tts", {}) || {};
    const engine = tts.engine || "edge";
    const voiceId = tts.voiceId || null;
    const cfg = { ...(db.getSetting("ttsEngineConfig", {})[engine] || {}) };
    const secrets = secretStore?.readSecretStore?.() || {};
    if (secrets[`tts-${engine}`]) cfg.apiKey = secrets[`tts-${engine}`];
    const clean = text.replace(/[*_#`]/g, "").slice(0, 4000);
    const { buffer, mime } = await ttsRouter.synthesize(engine, cfg, voiceId, clean);
    try { db.recordTTSUsage?.(engine, clean.length); } catch { /* ignore */ }
    return { buffer, mime };
  } catch (err) {
    logg.warn(`[whatsapp] TTS falhou para ${agentId}:`, err.message);
    return null;
  }
}

/**
 * Persiste a conversa/mensagens escopadas. Retorna { conversationId, channelId }.
 */
function persistInbound(db, { jid, agentId, userId, workspaceId, senderKey, externalMessageId, text, imageBase64, audioBase64, timestamp }) {
  try {
    const channel = identityResolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: jid }, db);
    const conversation = db.getOrCreateConversation({
      workspaceId,
      userId,
      agent: agentId,
      channelId: channel ? channel.id : null,
      externalConversationId: jid,
      title: `${agentId} · WhatsApp`,
    });
    const result = db.addScopedMessage(conversation.id, {
      id: identityResolver.uuid(),
      workspaceId,
      userId,
      role: "user",
      content: text,
      type: imageBase64 ? "image" : audioBase64 ? "audio" : "text",
      direction: "inbound",
      externalMessageId,
      mediaUrl: imageBase64 ? "wa:image:base64" : audioBase64 ? "wa:audio:base64" : null,
      metadata: JSON.stringify({ channelJid: jid, senderJid: senderKey, ts: timestamp || Date.now() }),
    });
    return { conversationId: conversation.id, channelId: channel ? channel.id : null, persisted: result.ok };
  } catch (err) {
    getLogger(null).db?.warn?.("[whatsapp] persistInbound falhou:", err.message);
    return { conversationId: null, channelId: null, persisted: false };
  }
}

function persistOutbound(db, { conversationId, workspaceId, userId, agentId, text, audioBase64 }) {
  if (!conversationId) return;
  try {
    db.addScopedMessage(conversationId, {
      id: identityResolver.uuid(),
      workspaceId,
      userId,
      role: "assistant",
      content: text,
      type: audioBase64 ? "audio" : "text",
      direction: "outbound",
      externalMessageId: null,
      mediaUrl: audioBase64 ? "wa:audio:base64" : null,
      metadata: JSON.stringify({ agent: agentId }),
    });
  } catch { /* ignore */ }
}

/**
 * Handle an incoming WhatsApp message: route to agent, process with AI, reply.
 */
async function handleWhatsAppMessage(payload, ctx) {
  const {
    jid, senderJid, senderName, text, imageBase64, audioBase64, audioMime, fromMe, externalMessageId, timestamp,
mentionedJids, selfJid, selfLid,
  } = payload || {};
  const {
    db, aiRouter, agentProcessor, secretStore, whatsapp, waAutomation, buildSystemPrompt,
    resolveAISettings, log, saveNutritionToFile, getErrorMessage, memoryEngine,
  } = ctx;
  const logg = getLogger(log);

  // Mensagens do próprio dono (fromMe) agora são processadas normalmente —
  // os ecos das respostas enviadas pelo socket são filtrados em whatsapp.cjs
  // (trackSentMessage/sentMessageIds), evitando loop.

  const agentId = resolveAgent(payload, db, logg);
  if (!agentId) return;

  // Modo de resposta por canal (agent_channels.mode): em grupos com mode
  // "mention", o bot só responde quando é mencionado explicitamente com @.
  // O self jid vem no payload do socket (sock.user.id). O corte aqui acontece
  // ANTES de onboarding/rota determinística — ruído de grupo não gera
  // conversas nem dispara a rota do Carreiras.
  const channel = identityResolver.resolveAgentForChannel({ provider: "whatsapp", externalChannelId: jid }, db);
  if (channel && channel.mode === "mention" && jid?.endsWith("@g.us")) {
    const isMention = isMentioned(mentionedJids, selfJid, selfLid);
    logg.info(`[whatsapp] grupo ${jid} em modo @ — mencionados=${JSON.stringify(mentionedJids || [])} selfJid=${selfJid || "null"} selfLid=${selfLid || "null"} bareSelf=${jidBare(selfJid) || "null"} bareSelfLid=${jidBare(selfLid) || "null"} -> ${isMention ? "mencao detectada, processando" : "sem mencao, ignorada"}`);
    if (!isMention) return;
  }

  const senderKey = senderJid || jid;
  const resolved = identityResolver.resolveSender({ provider: "whatsapp", providerUserId: senderKey, displayName: senderName }, db);

  if (resolved.status === "unknown" || resolved.status === "onboarding") {
    return handleOnboarding(payload, resolved, agentId, ctx);
  }
  if (resolved.status === "orphan") {
    logg.warn(`[whatsapp] identidade órfã ${senderKey} — ignorando`);
    return;
  }

  const { userId, workspaceId } = resolved;

  // Dedup: mesma mensagem externa já processada → ignora.
  if (externalMessageId && db.getMessageByExternalId(externalMessageId)) {
    logg.info(`[whatsapp] dedup: ${externalMessageId} já processada`);
    return;
  }

  // Process automations (existing behavior).
  if (waAutomation?.processIncomingMessage) {
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
            logg.info(`[wa-automation] auto-scheduled for ${agentId}: ${schedule.date}`);
          } catch (err) {
            logg.warn("[wa-automation] auto-schedule failed:", err.message);
          }
        },
        log: logg,
      }
    );
  }

  // STT: áudio → texto.
  let finalText = text || "";
  if (audioBase64) {
    logg.info(`[whatsapp] transcrevendo áudio de ${senderKey}`);
    const sttResult = await transcribeAudio(audioBase64, audioMime, db, secretStore, logg);
    finalText = sttResult.text || "";
    if (!finalText) {
      try { await whatsapp.sendMessage(jid, "Não consegui entender o áudio. Tenta de novo ou manda por texto."); } catch { /* ignore */ }
      return;
    }
  }
  if (!finalText && !imageBase64) return;

  // Rota determinística do agente Carreiras: perguntas de vagas/currículo
  // respondem direto do estado (sem chamada de LLM) — estilo rota do CaOS.
  // Só dispara no canal resolvido do próprio agente: o regex pode casar
  // substrings como "busca"/"procura"/"achou" dentro de mensagens de OUTROS
  // agentes (ex.: "me busca o preço de uma peça" no Automotive), e assim
  // evitamos gravar material de outro agente no workspace Carreiras.
  if (agentId === "Carreiras" && careerBridge.isCareerQuestion(finalText)) {
    const careerReply = await careerBridge.buildWhatsAppReply(finalText);
    const { conversationId: careerConvId } = persistInbound(db, {
      jid, agentId, userId, workspaceId, senderKey, externalMessageId,
      text: finalText, imageBase64, audioBase64, timestamp,
    });
    await whatsapp.sendMessage(jid, careerReply);
    persistOutbound(db, { conversationId: careerConvId, workspaceId, userId, agentId, text: careerReply });
    return;
  }

  // Config de voz do agente (AUTO: áudio→áudio, texto→texto).
  const voice = identityResolver.getAgentVoiceSettings(db, agentId);
  const wantAudio = Boolean(voice.enabled) && (voice.responseMode === "ALWAYS_AUDIO" || (voice.responseMode === "AUTO" && audioBase64));

  logg.info(`[whatsapp] message from ${senderKey} → agent=${agentId} (${finalText.slice(0, 80)})`);

  // Persistência inbound + conversa escopada.
  const { conversationId } = persistInbound(db, {
    jid, agentId, userId, workspaceId, senderKey, externalMessageId,
    text: finalText, imageBase64, audioBase64, timestamp,
  });

  const settings = resolveAISettings(agentId);
  const keys = secretStore.readSecretStore();
  let systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
  if (resolved.profile?.display_name) {
    systemPrompt += `\n\nUsuário: ${resolved.profile.display_name}`;
  }

  // Perfil de veículo (anti-loop do agente Automotive): extrai/grava dados
  // determinísticos e injeta no prompt para o LLM nunca re-perguntar.
  if (agentId === "Automotive") {
    const extracted = vehicleProfile.extractVehicleInfo(finalText);
    if (extracted) vehicleProfile.saveVehicleInfo(db, userId, extracted);
    const vehicleBlock = vehicleProfile.buildVehicleContext(db, userId);
    if (vehicleBlock) systemPrompt += vehicleBlock;
  }

  // Memória escopada (workspace + user + agent + conversation).
  const memoryCtx = await identityResolver.buildScopedMemoryContext({
    memoryEngine, workspaceId, userId, agentId, conversationId, query: finalText,
  }, db);

  const imagePrompts = {
    Health: "Analise essa foto de comida. Identifique o prato, estime calorias e macronutrientes. Responda em português do Brasil.",
    Finance: "Analise essa foto de comprovante financeiro (PIX, cartão, boleto, nota fiscal). Identifique: valor, data, descrição/estabelecimento, tipo (receita/despesa), categoria. Se for um comprovante de pagamento, extraia os dados e registre como despesa. Se for um comprovante de recebimento, registre como receita. Responda em português do Brasil.",
  };

  const userMessage = imageBase64
    ? { role: "user", content: finalText || imagePrompts[agentId] || imagePrompts.Health, image: { base64: imageBase64, mime: "image/jpeg" } }
    : { role: "user", content: finalText };

  // Cross-provider fallback chain.
  const fallbackChain = [
    { provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider] },
    ...["groq", "openrouter", "nvidia", "opencodezen"]
      .filter((p) => p !== settings.provider && keys[p])
      .map((p) => ({ provider: p, model: aiRouter.KNOWN_FREE_MODELS?.[p]?.[0], baseUrl: undefined, apiKey: keys[p] })),
  ];

  let lastErr;
  for (const attempt of fallbackChain) {
    if (!attempt.apiKey) continue;
    try {
      logg.info(`[whatsapp] trying ${attempt.provider}/${attempt.model}`);
      const { context } = await aiRouter.buildContext({ messages: [userMessage], systemPrompt, provider: attempt.provider, model: attempt.model, baseUrl: attempt.baseUrl, apiKey: attempt.apiKey });
      const result = await aiRouter.routeChat({ provider: attempt.provider, model: attempt.model, baseUrl: attempt.baseUrl, apiKey: attempt.apiKey, messages: [...memoryCtx, ...context] });
      agentProcessor.recordUsageSafely(attempt.provider, result.usage);
      const finalTextReply = agentProcessor.processAgentReply(agentId, result.text);
      const { isSilentReply } = require("./silent-mode.cjs");
      if (isSilentReply(finalTextReply)) {
        logg.info(`[whatsapp] silent exec agent=${agentId} — no message sent`);
        return;
      }

      if (imageBase64 && agentId === "Health" && saveNutritionToFile) saveNutritionToFile(finalTextReply);

      // Grava memória escopada.
      if (memoryEngine?.save) {
        try {
          await memoryEngine.save({
            key: `wa:${conversationId || jid}:${finalText.slice(0, 60)}`,
            content: `[WhatsApp] ${senderName ? senderName + ": " : ""}${finalText} → ${agentId}: ${finalTextReply.slice(0, 500)}`,
            scopeAgent: agentId,
            workspaceId,
            userId,
            conversationId,
            tags: ["whatsapp", agentId.toLowerCase()],
            source: "whatsapp",
          });
        } catch { /* memory is best-effort */ }
      }

      // Resposta: áudio (se configurado) ou texto.
      if (wantAudio) {
        const audio = await synthesizeReplyAudio(finalTextReply, agentId, db, secretStore, logg);
        if (audio && whatsapp.sendAudioMessage) {
          await whatsapp.sendAudioMessage(jid, audio.buffer, audio.mime);
          persistOutbound(db, { conversationId, workspaceId, userId, agentId, text: finalTextReply, audioBase64: "wa:audio:tts" });
        } else {
          await whatsapp.sendMessage(jid, finalTextReply);
          persistOutbound(db, { conversationId, workspaceId, userId, agentId, text: finalTextReply });
        }
      } else {
        await whatsapp.sendMessage(jid, finalTextReply);
        persistOutbound(db, { conversationId, workspaceId, userId, agentId, text: finalTextReply });
      }
      return;
    } catch (err) {
      lastErr = err;
      logg.warn(`[whatsapp] ${attempt.provider} failed: ${err.message}`);
    }
  }
  logg.error("[whatsapp] all providers failed:", lastErr?.message);
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

module.exports = { handleWhatsAppMessage, saveNutritionToFile, agentForJid, isMentioned, jidBare };
