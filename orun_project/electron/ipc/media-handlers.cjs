// electron/ipc/media-handlers.cjs
// Media handlers: TTS, STT, video editor, image/3D, music producer,
// social media, WhatsApp, and notifications.

const path = require("path");
const { Notification } = require("electron");
const log = require("electron-log");

function register(ipcMain, ctx) {
  const {
    ttsRouter, sttRouter, videoEditor, image3d, musicProducer, socialMedia, whatsapp,
    db, secretStore, app,
  } = ctx;

  // Social media publishing
  ipcMain.handle("social-media:get-config", () => socialMedia.getConfig(db));
  ipcMain.handle("social-media:set-config", (_event, cfg) => { socialMedia.setConfig(db, cfg); return true; });
  ipcMain.handle("social-media:publish", async (_event, opts) => {
    try {
      log.info(`[social-media] publishing to ${opts.platform}`);
      const result = await socialMedia.publish(opts, db);
      if (result.ok) log.info(`[social-media] ${opts.platform} published OK`);
      else log.warn(`[social-media] ${opts.platform} failed:`, result.error);
      return result;
    } catch (err) {
      log.error("[social-media:publish] failed:", err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain.handle("social-media:publish-multi", async (_event, opts) => {
    try {
      log.info(`[social-media] publishing to ${opts.platforms.join(", ")}`);
      const results = await socialMedia.publishMulti(opts, db);
      return results;
    } catch (err) {
      log.error("[social-media:publish-multi] failed:", err.message);
      return [{ ok: false, error: err.message || String(err) }];
    }
  });
  ipcMain.handle("social-media:test", async () => {
    try { return await socialMedia.testPlatforms(db); }
    catch (err) { log.error("[social-media:test] failed:", err.message); return {}; }
  });
  ipcMain.handle("social-media:get-buffer-config", () => socialMedia.getBufferConfig(db));
  ipcMain.handle("social-media:set-buffer-config", (_event, cfg) => { socialMedia.setBufferConfig(db, cfg); return true; });
  ipcMain.handle("social-media:publish-instagram-direct", async (_event, opts) => {
    try {
      log.info("[social-media] publishing to instagram (direct)");
      const result = await socialMedia.publishInstagramDirect(opts, db);
      if (result.ok) log.info("[social-media] instagram direct published OK");
      else log.warn("[social-media] instagram direct failed:", result.error);
      return result;
    } catch (err) {
      log.error("[social-media:publish-instagram-direct] failed:", err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain.handle("social-media:publish-linkedin-direct", async (_event, opts) => {
    try {
      log.info("[social-media] publishing to linkedin (direct)");
      const result = await socialMedia.publishLinkedInDirect(opts, db);
      if (result.ok) log.info("[social-media] linkedin direct published OK");
      else log.warn("[social-media] linkedin direct failed:", result.error);
      return result;
    } catch (err) {
      log.error("[social-media:publish-linkedin-direct] failed:", err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain.handle("social-media:publish-twitter-direct", async (_event, opts) => {
    try {
      log.info("[social-media] publishing to twitter (direct)");
      const result = await socialMedia.publishTwitterDirect(opts, db);
      if (result.ok) log.info("[social-media] twitter direct published OK");
      else log.warn("[social-media] twitter direct failed:", result.error);
      return result;
    } catch (err) {
      log.error("[social-media:publish-twitter-direct] failed:", err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain.handle("social-media:publish-tiktok-direct", async (_event, opts) => {
    try {
      log.info("[social-media] publishing to tiktok (direct)");
      const result = await socialMedia.publishTikTokDirect(opts, db);
      if (result.ok) log.info("[social-media] tiktok direct published OK");
      else log.warn("[social-media] tiktok direct failed:", result.error);
      return result;
    } catch (err) {
      log.error("[social-media:publish-tiktok-direct] failed:", err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });

  // Text-to-speech
  ipcMain.handle("tts:list-voices", async (_event, engine) => {
    const secrets = secretStore.readSecretStore();
    const engineCfg = db.getSetting("ttsEngineConfig", {})[engine] || {};
    try {
      return await ttsRouter.listVoices(engine, { apiKey: secrets[`tts-${engine}`], ...engineCfg });
    } catch (err) {
      log.warn(`[tts:list-voices] ${engine} failed:`, err.message);
      throw err;
    }
  });

  ipcMain.handle("tts:synthesize", async (_event, { engine, voiceId, text }) => {
    const secrets = secretStore.readSecretStore();
    const engineCfg = db.getSetting("ttsEngineConfig", {})["piper"] || {};

    // ── Fallback chain configurable por prioridade ────────────────────────
    // local-first (padrão): edge → kokoro → piper → bark → xtts → f5tts →
    //   elevenlabs → google → azure (gratuito em primeiro; cloud só com chave)
    // cloud-first: cloud em primeiro (qualidade premium), local depois.
    // O kokoro (neural local pt-BR) entrou na chain como 2º local.
    const CLOUD_ENGINES = ["elevenlabs", "google", "azure"];
    const LOCAL_ENGINES = ["edge", "kokoro", "piper", "bark", "xtts", "f5tts"];
    const priorityMode = db.getSetting("ttsFallbackPriority", "local-first") || "local-first";

    function buildFallbackChain(primary) {
      const rest = (list) => list.filter((e) => e !== primary);
      return priorityMode === "cloud-first"
        ? [...rest(CLOUD_ENGINES), ...rest(LOCAL_ENGINES)]
        : [...rest(LOCAL_ENGINES), ...rest(CLOUD_ENGINES)];
    }

    async function trySynthesize(eng, vid, txt) {
      const cfg = {
        ...(db.getSetting("ttsEngineConfig", {})[eng] || {}),
      };
      if (secrets[`tts-${eng}`]) cfg.apiKey = secrets[`tts-${eng}`];
      return ttsRouter.synthesize(eng, cfg, vid, txt);
    }

    // Try primary engine first
    try {
      const { buffer, mime } = await trySynthesize(engine, voiceId, text);
      try { db.recordTTSUsage(engine, text.length); } catch (e) { log.warn("recordTTSUsage failed:", e.message); }
      return { audioBase64: buffer.toString("base64"), mime, engine };
    } catch (primaryErr) {
      log.warn(`[tts:synthesize] ${engine} failed:`, primaryErr.message);

      // Try each fallback engine (ordered by priority mode). Cloud engines only
      // when the respective key exists — otherwise skip fast.
      const FALLBACK_CHAIN = buildFallbackChain(engine);
      for (const fallback of FALLBACK_CHAIN) {
        if (fallback === engine) continue;
        if (CLOUD_ENGINES.includes(fallback) && !secrets[`tts-${fallback}`]) {
          log.info(`[tts:synthesize] skipping ${fallback}: no API key configured`);
          continue;
        }
        try {
          log.info(`[tts:synthesize] trying fallback: ${fallback}`);
          const { buffer, mime } = await trySynthesize(fallback, voiceId, text);
          try { db.recordTTSUsage(fallback, text.length); } catch (e) { log.warn("recordTTSUsage failed:", e.message); }
          return { audioBase64: buffer.toString("base64"), mime, engine: fallback, fallbackFrom: engine };
        } catch (fbErr) {
          log.warn(`[tts:synthesize] fallback ${fallback} also failed:`, fbErr.message);
        }
      }

      // All engines failed
      throw primaryErr;
    }
  });
  ipcMain.handle("tts:usage-today", () => db.getTTSUsageToday());

  ipcMain.handle("tts:engines", () => ttsRouter.ENGINES);
  ipcMain.handle("tts:set-engine-config", (_event, engine, cfg) => {
    const all = db.getSetting("ttsEngineConfig", {});
    all[engine] = { ...all[engine], ...cfg };
    db.setSetting("ttsEngineConfig", all);
    return true;
  });
  ipcMain.handle("tts:get-engine-config", (_event, engine) => db.getSetting("ttsEngineConfig", {})[engine] || {});

  // Speech-to-text
  ipcMain.handle("stt:engines", () => sttRouter.ENGINES);
  ipcMain.handle("stt:test-connection", async (_event, baseUrl) => sttRouter.testWhisperConnection(baseUrl));
  ipcMain.handle("stt:transcribe", async (_event, { baseUrl, audioBase64, mimeType, language }) => {
    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      log.info(`[stt:transcribe] baseUrl=${baseUrl} mimeType=${mimeType} language=${language} audioSize=${audioBuffer.length}`);
      const result = await sttRouter.transcribeWhisper(baseUrl, audioBuffer, mimeType, language);
      log.info(`[stt:transcribe] result: "${result.text?.slice(0, 100)}"`);
      return { ...result, _debug: { audioSize: audioBuffer.length, mimeType, language } };
    } catch (err) {
      log.error(`[stt:transcribe] FAILED:`, err.message);
      return { text: "", error: err.message };
    }
  });
  // Groq cloud STT fallback (distil-whisper-large-v3) — usa a chave Groq já
  // configurada nas chaves de IA, sem expor a chave ao renderer.
  ipcMain.handle("stt:transcribe-groq", async (_event, { audioBase64, mimeType, language, model }) => {
    try {
      const keys = secretStore.readSecretStore();
      const apiKey = keys.groq;
      if (!apiKey) return { text: "", error: "No Groq API key configured" };
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const result = await sttRouter.transcribeGroq(apiKey, audioBuffer, mimeType || "audio/webm", language || "pt", model || undefined);
      log.info(`[stt:transcribe-groq] ok: "${result.text?.slice(0, 80)}" model=${result.model}`);
      return result;
    } catch (err) {
      log.error(`[stt:transcribe-groq] FAILED:`, err.message);
      return { text: "", error: err.message };
    }
  });

  // Video Editor
  ipcMain.handle("videoeditor:get-projects", (_event, date) => db.getDailyVideoProjects(date));
  ipcMain.handle("videoeditor:list-templates", () => videoEditor.listTemplates());
  ipcMain.handle("videoeditor:create-composition", (_event, opts) => videoEditor.createComposition(opts));
  ipcMain.handle("videoeditor:render-video", async (_event, opts) => {
    try {
      const result = await videoEditor.renderVideo(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[videoeditor:render-video] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // 3D Designer (Image / 3D)
  ipcMain.handle("image3d:get-generations", (_event, date) => db.getDailyImage3DGenerations(date));
  ipcMain.handle("image3d:fal-models", () => image3d.FAL_MODELS);
  ipcMain.handle("image3d:tripo-models", () => image3d.TRIPO_MODELS);
  ipcMain.handle("image3d:generate-image", async (_event, opts) => {
    const keys = secretStore.readSecretStore();
    const falKey = keys.fal;
    const fooocusUrl =
      (typeof db.getSetting === "function" && db.getSetting("fooocusBaseUrl", "")) ||
      image3d.DEFAULT_FOOOCUS_URL;

    // 1) Fooocus local (gratuito, sem chave) primeiro.
    try {
      const result = await image3d.generateFooocusImage(
        {
          prompt: opts.prompt,
          negative_prompt: opts.negativePrompt || "",
          imageSize: opts.imageSize || "landscape_16_9",
          numImages: opts.numImages || 1,
        },
        fooocusUrl
      );
      return { ok: true, ...result };
    } catch (fooocusErr) {
      // 2) Fallback: Fal.ai (precisa de chave).
      if (!falKey) {
        return {
          ok: false,
          error:
            `Fooocus local indisponível (${fooocusErr.message || fooocusErr}). ` +
            `Inicie o Fooocus (${fooocusUrl}) ou adicione a chave Fal.ai em Settings → API Keys.`,
        };
      }
      try {
        const result = await image3d.generateImage(opts, falKey);
        return { ok: true, ...result, fallback: "fal" };
      } catch (err) {
        log.error("[image3d:generate-image] failed:", err.message);
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("403") || msg.includes("forbidden")) {
          return { ok: false, error: "Fal.ai access forbidden. Sua chave pode estar inválida, expirada ou sem créditos. Verifique em https://fal.ai/dashboard" };
        }
        if (msg.includes("401") || msg.includes("unauthorized")) {
          return { ok: false, error: "Fal.ai API key inválida. Verifique sua chave em Settings → API Keys." };
        }
        return { ok: false, error: `Fooocus: ${fooocusErr.message || fooocusErr} | Fal.ai: ${err.message}` };
      }
    }
  });
  ipcMain.handle("image3d:generate-3d", async (_event, opts) => {
    const keys = secretStore.readSecretStore();
    try {
      const result = await image3d.generate3DModel(opts, keys.tripo);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:generate-3d] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("image3d:comfyui-test", async (_event, baseUrl) => image3d.testComfyUIConnection(baseUrl));
  ipcMain.handle("image3d:fooocus-test", async (_event, baseUrl) => image3d.testFooocusConnection(baseUrl));
  ipcMain.handle("image3d:comfyui-submit", async (_event, opts) => {
    try {
      const result = await image3d.submitComfyUIWorkflow(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:comfyui-submit] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("image3d:comfyui-results", async (_event, promptId, baseUrl) => {
    try {
      const result = await image3d.getComfyUIResults(promptId, baseUrl);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:comfyui-results] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // Music Producer
  ipcMain.handle("musicproducer:get-projects", (_event, date) => db.getDailyMusicProjects(date));
  ipcMain.handle("musicproducer:wondera-models", () => musicProducer.listWonderaModels());
  ipcMain.handle("musicproducer:autotone-presets", () => musicProducer.listAutotonePresets());
  ipcMain.handle("musicproducer:generate-music", async (_event, opts) => {
    const keys = secretStore.readSecretStore();
    try {
      const result = await musicProducer.generateMusic(opts, keys.wondera);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:generate-music] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:master", async (_event, opts) => {
    const keys = secretStore.readSecretStore();
    try {
      const result = await musicProducer.masterTrack(opts, keys.wondera);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:master] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:separate-stems", async (_event, opts) => {
    const keys = secretStore.readSecretStore();
    try {
      const result = await musicProducer.separateStems(opts, keys.wondera);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:separate-stems] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:autotone", async (_event, opts) => {
    try {
      const result = await musicProducer.applyAutotone(opts);
      return { ok: true, audioBase64: result.toString("base64") };
    } catch (err) {
      log.error("[musicproducer:autotone] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:mix", async (_event, opts) => {
    try {
      const result = await musicProducer.mixTracks(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:mix] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:apply-gain", async (_event, opts) => {
    try {
      const result = await musicProducer.applyGain(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:apply-gain] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // WhatsApp connector
  ipcMain.handle("whatsapp:connect", async () => {
    try {
      await whatsapp.connect(app.getPath("userData"));
      return { ok: true };
    } catch (err) {
      log.error("[whatsapp:connect] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("whatsapp:disconnect", async () => { await whatsapp.disconnect(); return true; });
  ipcMain.handle("whatsapp:status", () => whatsapp.getStatus());
  ipcMain.handle("whatsapp:send-test", async (_event, { jid, text }) => {
    try { await whatsapp.sendMessage(jid, text); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle("whatsapp:get-agent-jids", () => {
    const cfg = db.getSetting("whatsapp", {});
    return cfg.agentJids || {};
  });
  ipcMain.handle("whatsapp:set-agent-jids", (_event, agentJids) => {
    const cfg = db.getSetting("whatsapp", {});
    db.setSetting("whatsapp", { ...cfg, agentJids });
    return true;
  });
  ipcMain.handle("whatsapp:list-groups", () => {
    try { return whatsapp.listGroups(); } catch { return []; }
  });

  ipcMain.handle("whatsapp:test-group", async (_event, jid, agentName) => {
    try {
      await whatsapp.sendTestMessage(jid, agentName);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("whatsapp:group-messages", (_event, { jid }) => {
    try { return whatsapp.getGroupMessages(jid); } catch { return []; }
  });

  // ── WhatsApp Automation handlers ──────────────────────────────────────
  const waAutomation = require("../whatsapp-automation.cjs");

  ipcMain.handle("wa:auto:get-stats", () => waAutomation.getStats());

  ipcMain.handle("wa:auto:keyword-list", () => {
    try {
      const fs = require("fs");
      const path = require("path");
      const rulesPath = path.join(app.getPath("userData"), "whatsapp-keyword-rules.json");
      if (!fs.existsSync(rulesPath)) return [];
      const data = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  });

  ipcMain.handle("wa:auto:keyword-add", (_event, rule) => {
    try {
      waAutomation.addKeywordRule(app.getPath("userData"), rule);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("wa:auto:keyword-remove", (_event, ruleId) => {
    try {
      waAutomation.removeKeywordRule(app.getPath("userData"), ruleId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("wa:auto:keyword-toggle", (_event, ruleId) => {
    try {
      waAutomation.toggleKeywordRule(app.getPath("userData"), ruleId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("wa:auto:keyword-rules", () => {
    try {
      const fs = require("fs");
      const pathMod = require("path");
      const file = pathMod.join(app.getPath("userData"), "whatsapp-keyword-rules.json");
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
      return [];
    } catch { return []; }
  });

  ipcMain.handle("wa:auto:summary", (_event, { jid, agentName, hours }) => {
    try {
      const summary = waAutomation.generateSummary(agentName, jid, hours || 24);
      return { ok: true, summary };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("wa:auto:broadcast", async (_event, { text, groupJids }) => {
    try {
      const result = await waAutomation.broadcastMessage(text, groupJids, (j, t) => whatsapp.sendMessage(j, t));
      return result;
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("wa:auto:n8n-webhook", (_event, url) => {
    try {
      waAutomation.setN8nWebhook(url);
      const cfg = db.getSetting("whatsapp", {});
      db.setSetting("whatsapp", { ...cfg, n8nWebhookUrl: url });
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("wa:auto:n8n-webhook-get", () => {
    return waAutomation.getN8nWebhook();
  });

  ipcMain.handle("wa:auto:extract-date", (_event, text) => {
    return waAutomation.extractDate(text);
  });

  // ── Telegram Bot ──────────────────────────────────────────────────
  const { telegram, telegramAutomation } = ctx;

  ipcMain.handle("telegram:connect", async (_event, token) => {
    try {
      await telegram.connect(token);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("telegram:disconnect", async () => {
    try {
      await telegram.disconnect();
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("telegram:status", () => {
    return { status: telegram.getStatus() };
  });

  ipcMain.handle("telegram:send-test", async (_event, { chatId, text }) => {
    try {
      await telegram.sendMessage(chatId, text);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("telegram:get-agent-chats", () => {
    return db.getSetting("telegram", {}).agentChats || {};
  });

  ipcMain.handle("telegram:set-agent-chats", (_event, agentChats) => {
    const cfg = db.getSetting("telegram", {});
    db.setSetting("telegram", { ...cfg, agentChats });
    return { ok: true };
  });

  ipcMain.handle("telegram:get-stats", () => {
    return telegramAutomation.getStats();
  });

  ipcMain.handle("telegram:get-token", () => {
    try {
      const secrets = secretStore.readSecretStore();
      return secrets["telegram_bot_token"] || "";
    } catch { return ""; }
  });

  ipcMain.handle("telegram:set-token", (_event, token) => {
    try {
      secretStore.writeSecret("telegram_bot_token", token);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });
}

module.exports = { register };
