// autonomous-loop.cjs
// Hampton's autonomous tool-calling loop: chat → tool_calls → execute → feed back → repeat.

const AUTONOMOUS_MAX_ITERATIONS = 15;

/**
 * @param {object} opts
 * @param {Array} opts.messages - conversation history [{role,content,image?}]
 * @param {string|null} opts.agentId
 * @param {Electron.WebContents} opts.sender
 * @param {string} opts.requestId
 * @param {{ cancelled: boolean }} opts.cancelledRef
 * @param {object} opts.ctx - context with all dependencies (aiRouter, toolsModule, etc.)
 * @returns {Promise<string|null>} final text or null if cancelled
 */
async function autonomousLoop({ messages, agentId, sender, requestId, cancelledRef, voiceMode }, ctx) {
  const { aiRouter, toolsModule, mcpClient, pluginSystem, responseCache, agentProcessor, logger, secretStore, resolveAISettings, buildSystemPrompt, getToolsForAgent } = ctx;
  const log = ctx.log || console;

  const settings = resolveAISettings(agentId);
  let apiKeys = [], apiKey = null;
  if (settings.kind !== "combo") {
    apiKeys = secretStore.getProviderApiKeys(settings.provider);
    apiKey = apiKeys[0];
  }
  let systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
  if (voiceMode) {
    // Speech-shaped replies: the answer will be read aloud by TTS. Short,
    // spoken-friendly sentences without heavy markdown or homophone traps.
    systemPrompt +=
      "\n\nREGRAS DE RESPOSTA POR VOZ:\n" +
      "- A sua resposta sera LIDA EM VOZ ALTA pelo assistente. Use frases curtas (ate ~15 palavras cada).\n" +
      "- Nao use markdown pesado (titulos, asteriscos, listas longas, tabelas) — formate de forma falada e natural.\n" +
      "- Evite abreviacoes, homofonos e palavras de leitura ambigua (ex.: escreva \"hora\" para nao confundir com \"ora\").\n" +
      "- Prefira numeros por extenso quando a leitura ficar mais clara (ex.: \"as quinze horas\").\n" +
      "- Seja direto: a resposta ideal para voz tem 2 a 4 frases curtas.\n" +
      "- Responda em portugues do Brasil.";
  }
  const send = (ch, p) => { if (!sender.isDestroyed()) sender.send(ch, p); };

  const agentTools = getToolsForAgent(agentId);
  const startedAt = Date.now();
  const logDone = (iterations, toolCalls) => {
    log.info(`[autonomous] done agent=${agentId || "hampton"} iterations=${iterations} toolCalls=${toolCalls} ms=${Date.now() - startedAt}`);
  };

  // Check response cache for repeated queries
  const lastUserMsg = messages[messages.length - 1]?.content;
  if (lastUserMsg) {
    const cached = responseCache.get(lastUserMsg, agentId, voiceMode ? "voice" : "text");
    if (cached && !cancelledRef.cancelled) {
      log.info(`[autonomous] cache hit for agent=${agentId}`);
      return cached;
    }
  }

  // Combo por agente: quando o agente tem override de combo (Orun Router),
  // responde via ModelRouter do desktop (texto puro) em vez de provider/model.
  // Roda antes do buildContext/loop, evitando setup baseado em provider/model.
  if (settings.kind === "combo" && ctx.router) {
    log.info(`[autonomous] combo agent=${agentId || "hampton"} comboId=${settings.comboId} (mode combo)`);
    const comboContext = [{ role: "system", content: systemPrompt }];
    for (const m of messages) comboContext.push({ role: m.role === "hampton" ? "assistant" : "user", content: m.content });
    try {
      const result = await ctx.router.complete({ comboId: settings.comboId, messages: comboContext, stream: false });
      const text = (result && (result.content || result.text)) || "";
      if (text) responseCache.set(lastUserMsg, agentId, voiceMode ? "voice" : "text", text);
      logDone(1, 0);
      return text;
    } catch (err) {
      log.error("[autonomous] combo failed:", err && err.message);
      log.warn("[autonomous] combo falhou, caindo no fluxo normal de providers");
    }
  }

  // Build context with smart summarization for long conversations
  const userMessages = messages.map((m) => ({
    role: m.role === "hampton" ? "assistant" : "user",
    content: m.content,
    ...(m.image ? { image: m.image } : {}),
  }));

  let context;
  try {
    const ctxResult = await aiRouter.buildContext({
      messages: userMessages,
      systemPrompt,
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
    });
    context = ctxResult.context;
    if (ctxResult.summarized) log.info(`[autonomous] context summarized for agent=${agentId}`);
  } catch {
    context = [{ role: "system", content: systemPrompt }];
    for (const m of userMessages) context.push(m);
  }

  let lastToolText = "";
  let retryWithoutTool = false;

  // Keep the free cloud providers in the same automatic fallback chain,
  // including NVIDIA NIM when it has a valid key configured.
  const fallbackProviders = ["opencodezen", "groq", "openrouter", "nvidia"];
  const triedProviders = new Set([settings.provider]);
  const retriedProvider = new Set();
  let currentProvider = settings.provider;
  let currentModel = settings.model;
  let currentBaseUrl = settings.baseUrl;
  let currentApiKey = apiKey;
  let currentApiKeys = apiKeys;

  // Auto-select: if the chosen provider has no API key, pick the first available
  if (!currentApiKey && currentProvider !== "ollama") {
    for (const fp of fallbackProviders) {
      const fKeys = secretStore.getProviderApiKeys(fp);
      if (fKeys.length) {
        const fModels = aiRouter.KNOWN_FREE_MODELS?.[fp];
        log.info(`[autonomous] no key for ${currentProvider}, auto-selecting ${fp}/${fModels?.[0]}`);
        currentProvider = fp;
        currentModel = fModels?.[0] || currentModel;
        currentBaseUrl = undefined;
        currentApiKeys = fKeys;
        currentApiKey = fKeys[0];
        break;
      }
    }
  }

  for (let i = 0; i < AUTONOMOUS_MAX_ITERATIONS; i++) {
    if (cancelledRef.cancelled) return null;

    log.info(`[autonomous] iteration ${i + 1} provider=${currentProvider} model=${currentModel} agent=${agentId || "hampton"}`);

    let result;
    try {
      result = await Promise.race([
        aiRouter.chatWithTools({
          provider: currentProvider,
          model: currentModel,
          baseUrl: currentBaseUrl,
          apiKeys: currentApiKeys,
          messages: context,
          tools: [...agentTools, ...mcpClient.getAllTools(), ...pluginSystem.getPluginTools()],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Autonomous iteration timed out")), 120000)),
      ]);
    } catch (err) {
      log.error(`[autonomous] chat failed on ${currentProvider}:`, err.message);
      // Retry transient errors (timeout/429/5xx/network) once on the same provider before switching
      const isTransient = /timed out|timeout|429|5\d\d|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(err.message || "");
      if (isTransient && !retriedProvider.has(currentProvider)) {
        retriedProvider.add(currentProvider);
        log.info(`[autonomous] retrying ${currentProvider} after transient error`);
        continue;
      }
      let switched = false;
      for (const fp of fallbackProviders) {
        if (triedProviders.has(fp)) continue;
        const fKeys = secretStore.getProviderApiKeys(fp);
        if (!fKeys.length) continue;
        const fModels = aiRouter.KNOWN_FREE_MODELS?.[fp];
        const fModel = fModels?.[0];
        if (!fModel) continue;
        log.info(`[autonomous] switching to ${fp}/${fModel} after error on ${currentProvider}`);
        currentProvider = fp;
        currentModel = fModel;
        currentBaseUrl = undefined;
        currentApiKeys = fKeys;
        currentApiKey = fKeys[0];
        triedProviders.add(fp);
        switched = true;
        break;
      }
      if (switched) continue;
      throw err;
    }

    agentProcessor.recordUsageSafely(currentProvider, result.usage);

    // No tool calls → check if model claimed to have done something without calling tools
    if (!result.toolCalls || result.toolCalls.length === 0) {
      const finalText = result.text || lastToolText || "";

      // Heuristic: if the model claims it created/wrote/edited a file but didn't call a tool, retry once
      const claimedAction = /\b(cri[oa]d|creat|wrot|writ|edit|salv|save|gerad?|generat|execut|rodei?|ran)\b/i.test(finalText)
        && /\b(arquivo|file|script|c[oó]digo|code|fun[cç][aã]o|function|classe|class|m[oó]dulo|module)\b/i.test(finalText);

      if (claimedAction && !retryWithoutTool) {
        log.info(`[autonomous] model claimed action without tool call, retrying with forced tool_choice`);
        context.push({ role: "assistant", content: result.text || null, ...(result.reasoningContent ? { reasoning_content: result.reasoningContent } : {}) });
        context.push({
          role: "user",
          content: "You MUST use the write_file (or edit_file) tool to actually create/edit the file. Do NOT describe what you would do — actually call the tool now.",
        });
        retryWithoutTool = true;
        continue; // retry the loop iteration
      }

      if (lastUserMsg && finalText) {
        // Não cacheia execução silenciosa — senão repetir o comando retornaria
        // apenas o marcador do cache em vez de re-executar a ação.
        if (!ctx.isSilentReply || !ctx.isSilentReply(finalText)) {
          responseCache.set(lastUserMsg, agentId, finalText, voiceMode ? "voice" : "text");
        }
      }
      logDone(i + 1, 0);
      return finalText;
    }

    // Store text from tool-calling iterations as fallback
    if (result.text && result.text.trim()) {
      lastToolText = result.text;
      send(`ai:autonomous:text:${requestId}`, result.text);
    }

    // Execute each tool call
    for (const tc of result.toolCalls) {
      if (cancelledRef.cancelled) return null;

      send(`ai:autonomous:tool-call:${requestId}`, { id: tc.id, name: tc.name, arguments: tc.arguments });
      log.info(`[autonomous] tool_call: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 200)})`);

      let toolResult;
      try {
        const isMcpTool = tc.name.includes("__") && !tc.name.startsWith("plugin_");
        const isPluginTool = tc.name.startsWith("plugin_");
        toolResult = isMcpTool
          ? await mcpClient.callTool(tc.name, tc.arguments)
          : isPluginTool
          ? await pluginSystem.executePluginTool(tc.name, tc.arguments)
          : await toolsModule.executeTool(tc.name, tc.arguments, agentId);
      } catch (err) {
        toolResult = { error: err.message };
      }

      send(`ai:autonomous:tool-result:${requestId}`, { id: tc.id, name: tc.name, result: toolResult });
      log.info(`[autonomous] tool_result: ${tc.name} → ${JSON.stringify(toolResult).slice(0, 300)}`);

      // Feed assistant + tool result back into context
      context.push({
        role: "assistant",
        content: result.text || null,
        ...(result.reasoningContent ? { reasoning_content: result.reasoningContent } : {}),
        tool_calls: [{ id: tc.id, type: "function", function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } }],
      });
      context.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  logDone(AUTONOMOUS_MAX_ITERATIONS, -1);
  return lastToolText || "I've reached the maximum number of autonomous steps. Here's what I accomplished so far.";
}

module.exports = { autonomousLoop };
