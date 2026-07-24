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
async function autonomousLoop({ messages, agentId, sender, requestId, cancelledRef }, ctx) {
  const { aiRouter, toolsModule, mcpClient, pluginSystem, responseCache, agentProcessor, logger, secretStore, resolveAISettings, buildSystemPrompt, getToolsForAgent } = ctx;
  const log = ctx.log || console;

  const settings = resolveAISettings(agentId);
  const keys = secretStore.readSecretStore();
  const apiKey = keys[settings.provider];
  const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
  const send = (ch, p) => { if (!sender.isDestroyed()) sender.send(ch, p); };

  const agentTools = getToolsForAgent(agentId);

  // Check response cache for repeated queries
  const lastUserMsg = messages[messages.length - 1]?.content;
  if (lastUserMsg) {
    const cached = responseCache.get(lastUserMsg, agentId);
    if (cached && !cancelledRef.cancelled) {
      log.info(`[autonomous] cache hit for agent=${agentId}`);
      return cached;
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

  const fallbackProviders = ["groq", "openrouter", "github", "opencodezen"];
  const triedProviders = new Set([settings.provider]);
  let currentProvider = settings.provider;
  let currentModel = settings.model;
  let currentBaseUrl = settings.baseUrl;
  let currentApiKey = apiKey;

  // Auto-select: if the chosen provider has no API key, pick the first available
  if (!currentApiKey && currentProvider !== "ollama") {
    for (const fp of fallbackProviders) {
      if (keys[fp]) {
        const fModels = aiRouter.KNOWN_FREE_MODELS?.[fp];
        log.info(`[autonomous] no key for ${currentProvider}, auto-selecting ${fp}/${fModels?.[0]}`);
        currentProvider = fp;
        currentModel = fModels?.[0] || currentModel;
        currentBaseUrl = undefined;
        currentApiKey = keys[fp];
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
          apiKey: currentApiKey,
          messages: context,
          tools: [...agentTools, ...mcpClient.getAllTools(), ...pluginSystem.getPluginTools()],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Autonomous iteration timed out")), 60000)),
      ]);
    } catch (err) {
      log.error(`[autonomous] chat failed on ${currentProvider}:`, err.message);
      let switched = false;
      for (const fp of fallbackProviders) {
        if (triedProviders.has(fp)) continue;
        const fk = keys[fp];
        if (!fk) continue;
        const fModels = aiRouter.KNOWN_FREE_MODELS?.[fp];
        const fModel = fModels?.[0];
        if (!fModel) continue;
        log.info(`[autonomous] switching to ${fp}/${fModel} after error on ${currentProvider}`);
        currentProvider = fp;
        currentModel = fModel;
        currentBaseUrl = undefined;
        currentApiKey = fk;
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
        context.push({ role: "assistant", content: result.text || null });
        context.push({
          role: "user",
          content: "You MUST use the write_file (or edit_file) tool to actually create/edit the file. Do NOT describe what you would do — actually call the tool now.",
        });
        retryWithoutTool = true;
        continue; // retry the loop iteration
      }

      if (lastUserMsg && finalText) {
        responseCache.set(lastUserMsg, agentId, finalText);
      }
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
          : await toolsModule.executeTool(tc.name, tc.arguments);
      } catch (err) {
        toolResult = { error: err.message };
      }

      send(`ai:autonomous:tool-result:${requestId}`, { id: tc.id, name: tc.name, result: toolResult });
      log.info(`[autonomous] tool_result: ${tc.name} → ${JSON.stringify(toolResult).slice(0, 300)}`);

      // Feed assistant + tool result back into context
      context.push({
        role: "assistant",
        content: result.text || null,
        tool_calls: [{ id: tc.id, type: "function", function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } }],
      });
      context.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return lastToolText || "I've reached the maximum number of autonomous steps. Here's what I accomplished so far.";
}

module.exports = { autonomousLoop };
