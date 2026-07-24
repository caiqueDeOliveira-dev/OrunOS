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

    // ── Fallback chain: primary engine → local engines ──────────────
    const FALLBACK_CHAIN = ["piper", "bark"];
    const isCloud = ["elevenlabs", "google", "azure"].includes(engine);

    async function trySynthesize(eng, vid, txt) {
      const cfg = eng === engine
        ? { apiKey: secrets[`tts-${eng}`], ...(db.getSetting("ttsEngineConfig", {})[eng] || {}) }
        : { ...(db.getSetting("ttsEngineConfig", {})[eng] || {}) };
      return ttsRouter.synthesize(eng, cfg, vid, txt);
    }

    // Try primary engine first
    try {
      const { buffer, mime } = await trySynthesize(engine, voiceId, text);
      try { db.recordTTSUsage(engine, text.length); } catch (e) { log.warn("recordTTSUsage failed:", e.message); }
      return { audioBase64: buffer.toString("base64"), mime, engine };
    } catch (primaryErr) {
      log.warn(`[tts:synthesize] ${engine} failed:`, primaryErr.message);

      // Only fallback for cloud engines (quota/key errors)
      if (!isCloud) throw primaryErr;

      // Try each fallback engine
      for (const fallback of FALLBACK_CHAIN) {
        if (fallback === engine) continue; // skip same engine
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
    try {
      const result = await image3d.generateImage(opts, keys.fal);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:generate-image] failed:", err.message);
      return { ok: false, error: err.message };
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
