// electron/ipc/ai-handlers.cjs
// AI-related IPC handlers: chat, streaming, autonomous agent, models, usage.

const log = require("electron-log");
const { responseCache } = require("../response-cache.cjs");
const providerHealth = require("../provider-health.cjs");
const { getErrorMessage, getErrorTitle } = require("../error-messages.cjs");

function register(ipcMain, ctx) {
  const {
    aiRouter, db, secretStore, agentProcessor, mcpClient, pluginSystem, toolsModule,
    resolveAISettings, buildSystemPrompt, getGlobalAISettings, autonomousLoop,
    activeStreamRequests, activeAutonomousRequests, telemetry,
  } = ctx;

  ipcMain.handle("ai:chat", async (_event, { messages, agentId }) => {
    const settings = resolveAISettings(agentId);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
    const { context } = await aiRouter.buildContext({ messages, systemPrompt, provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey });

    log.info(`[ai:chat] agent=${agentId || "hampton"} provider=${settings.provider} model=${settings.model}`);
    try {
      const cached = responseCache.get(messages[messages.length - 1]?.content || "", agentId);
      if (cached) { return agentProcessor.processAgentReply(agentId, cached); }
      const tStart = Date.now();
      const result = await aiRouter.routeChat({ provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey, messages: context });
      telemetry.trace("ai:chat", Date.now() - tStart, { provider: settings.provider, model: settings.model });
      telemetry.counter("ai:chat:success");
      agentProcessor.recordUsageSafely(settings.provider, result.usage);
      responseCache.set(messages[messages.length - 1]?.content || "", agentId, result.text);
      return agentProcessor.processAgentReply(agentId, await agentProcessor.processActions(result.text));
    } catch (err) {
      telemetry.counter("ai:chat:error");
      const fallback = db.getSetting("aiFallback", null);
      if (fallback?.provider) {
        log.warn(`[ai:chat] ${settings.provider} failed (${err.message}), trying fallback ${fallback.provider}`);
        try {
          const result = await aiRouter.routeChat({ provider: fallback.provider, model: fallback.model, apiKey: keys[fallback.provider], messages: context });
          agentProcessor.recordUsageSafely(fallback.provider, result.usage);
          return agentProcessor.processAgentReply(agentId, await agentProcessor.processActions(result.text));
        } catch (fallbackErr) {
          const userMessage = getErrorMessage(fallbackErr);
          const title = getErrorTitle(fallbackErr);
          log.error("[ai:chat] fallback also failed:", fallbackErr.message);
          throw new Error(`${title}: ${userMessage}`);
        }
      }
      const userMessage = getErrorMessage(err);
      const title = getErrorTitle(err);
      log.error(`[ai:chat] ${title}:`, err.message);
      throw new Error(`${title}: ${userMessage}`);
    }
  });

  ipcMain.on("ai:chat-stream", async (event, { requestId, messages, agentId }) => {
    const sender = event.sender;
    const settings = resolveAISettings(agentId);
    const keys = secretStore.readSecretStore();
    const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
    const send = (channel, payload) => { if (!sender.isDestroyed()) sender.send(channel, payload); };

    const attempt = async (provider, model, baseUrl, apiKey) => {
      let receivedAny = false;
      const { context } = await aiRouter.buildContext({ messages, systemPrompt, provider, model, baseUrl, apiKey });
      return aiRouter.streamChat({
        provider, model, baseUrl, apiKey, messages: context,
        onChunk: (delta) => { receivedAny = true; send(`ai:chat-stream:chunk:${requestId}`, delta); },
        onRequestReady: (req) => activeStreamRequests.set(requestId, req),
      }).then((result) => ({ result, receivedAny: true })).catch((err) => { throw Object.assign(err, { receivedAny }); });
    };

    log.info(`[ai:chat-stream] agent=${agentId || "hampton"} provider=${settings.provider} model=${settings.model}`);
    const tStreamStart = Date.now();
    try {
      const { result } = await attempt(settings.provider, settings.model, settings.baseUrl, keys[settings.provider]);
      activeStreamRequests.delete(requestId);
      agentProcessor.recordUsageSafely(settings.provider, result.usage);
      const finalText = agentProcessor.processAgentReply(agentId, await agentProcessor.processActions(result.text));
      telemetry.trace("ai:chat-stream", Date.now() - tStreamStart, { provider: settings.provider, model: settings.model });
      telemetry.counter("ai:chat-stream:success");
      send(`ai:chat-stream:done:${requestId}`, finalText);
    } catch (err) {
      activeStreamRequests.delete(requestId);
      telemetry.counter("ai:chat-stream:error");
      if (err.cancelled) { log.info(`[ai:chat-stream] ${requestId} cancelled by user`); return; }

      const fallback = db.getSetting("aiFallback", null);
      if (fallback?.provider && !err.receivedAny) {
        log.warn(`[ai:chat-stream] ${settings.provider} failed (${err.message}), trying fallback ${fallback.provider}`);
        try {
          const { result } = await attempt(fallback.provider, fallback.model, undefined, keys[fallback.provider]);
          activeStreamRequests.delete(requestId);
          agentProcessor.recordUsageSafely(fallback.provider, result.usage);
          const finalText = agentProcessor.processAgentReply(agentId, await agentProcessor.processActions(result.text));
          send(`ai:chat-stream:done:${requestId}`, finalText);
          return;
        } catch (fallbackErr) {
          activeStreamRequests.delete(requestId);
          const userMessage = getErrorMessage(fallbackErr);
          const title = getErrorTitle(fallbackErr);
          log.error(`[ai:chat-stream] fallback also failed: ${fallbackErr.message}`);
          send(`ai:chat-stream:error:${requestId}`, `**${title}**\n\n${userMessage}`);
          return;
        }
      }
      const userMessage = getErrorMessage(err);
      const title = getErrorTitle(err);
      log.error(`[ai:chat-stream] ${title}:`, err.message);
      send(`ai:chat-stream:error:${requestId}`, `**${title}**\n\n${userMessage}`);
    }
  });

  // Stop button — aborts the underlying HTTP request for an in-flight stream.
  ipcMain.on("ai:chat-stream-cancel", (_event, requestId) => {
    const req = activeStreamRequests.get(requestId);
    if (req) { req.destroy(new Error("Cancelled")); activeStreamRequests.delete(requestId); }
  });

  // ── Autonomous agent (Hampton with tools) ────────────────────────────────
  // Runs the tool-call loop in the main process. Sends progress events back
  // to the renderer. Returns the final text when done.

  ipcMain.on("ai:autonomous", async (event, { requestId, messages, agentId }) => {
    const sender = event.sender;
    const cancelledRef = { cancelled: false };
    activeAutonomousRequests.set(requestId, cancelledRef);
    const send = (ch, p) => { if (!sender.isDestroyed()) sender.send(ch, p); };

    log.info(`[ai:autonomous] agent=${agentId || "hampton"} messages=${messages.length}`);
    try {
      const cached = responseCache.get(messages[messages.length - 1]?.content || "", agentId);
      if (cached) {
        activeAutonomousRequests.delete(requestId);
        const processed = agentProcessor.processAgentReply(agentId, cached);
        send(`ai:autonomous:done:${requestId}`, processed);
        return;
      }
      const finalText = await autonomousLoop({ messages, agentId, sender, requestId, cancelledRef });
      activeAutonomousRequests.delete(requestId);
      if (finalText === null) return; // cancelled
      responseCache.set(messages[messages.length - 1]?.content || "", agentId, finalText);
      const processed = agentProcessor.processAgentReply(agentId, await agentProcessor.processActions(finalText));
      send(`ai:autonomous:done:${requestId}`, processed);
    } catch (err) {
      activeAutonomousRequests.delete(requestId);
      const userMessage = getErrorMessage(err);
      const title = getErrorTitle(err);
      log.error(`[ai:autonomous] ${title}:`, err.message);
      send(`ai:autonomous:error:${requestId}`, `**${title}**\n\n${userMessage}`);
    }
  });

  ipcMain.on("ai:autonomous-cancel", (_event, requestId) => {
    const ref = activeAutonomousRequests.get(requestId);
    if (ref) { ref.cancelled = true; activeAutonomousRequests.delete(requestId); }
  });

  ipcMain.handle("ai:test-connection", async (_event, overrideSettings) => {
    const settings = { ...getGlobalAISettings(), ...(overrideSettings || {}) };
    const keys = secretStore.readSecretStore();
    return aiRouter.testConnection({ provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider] });
  });

  ipcMain.handle("ai:list-ollama-models", async (_event, baseUrl) => {
    try { return await aiRouter.listOllamaModels(baseUrl); } catch (err) { log.warn("[ai:list-ollama-models] failed:", err.message); return []; }
  });
  ipcMain.handle("ai:list-cloud-models", async (_event, provider) => aiRouter.listCloudModels(provider, secretStore.readSecretStore()[provider]));
  ipcMain.handle("ai:known-free-models", () => aiRouter.KNOWN_FREE_MODELS);
  ipcMain.handle("ai:model-catalog", () => aiRouter.getModelCatalog());
  ipcMain.handle("ai:providers", () => aiRouter.PROVIDERS);
  ipcMain.handle("ai:usage-today", () => db.getUsageToday());
  ipcMain.handle("ai:cache-stats", () => responseCache.stats());
  ipcMain.handle("ai:cache-clear", () => { responseCache.clear(); return { ok: true }; });
  ipcMain.handle("ai:health-check", () => providerHealth.getStatus());
  ipcMain.handle("ai:telemetry", () => telemetry.summary());
  ipcMain.handle("ai:rate-limit-status", () => {
    const status = {};
    for (const provider of Object.keys(aiRouter.PROVIDER_RATE_LIMITS)) {
      status[provider] = aiRouter.getProviderRateLimitStatus(provider);
    }
    return status;
  });
}

module.exports = { register };
