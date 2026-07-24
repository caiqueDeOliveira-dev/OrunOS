// electron/preload.cjs

const { contextBridge, ipcRenderer } = require("electron");

/**
 * Streams a chat reply. Returns a `stop()` function — call it to cancel
 * mid-stream (aborts the actual HTTP request in the main process, not just
 * the UI). Calling stop() after the stream already finished is a no-op.
 */
function chatStream(messages, { onChunk, onDone, onError, agentId } = {}) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const chunkChannel = `ai:chat-stream:chunk:${requestId}`;
  const doneChannel = `ai:chat-stream:done:${requestId}`;
  const errorChannel = `ai:chat-stream:error:${requestId}`;
  let finished = false;

  const handleChunk = (_e, delta) => onChunk?.(delta);
  const handleDone = (_e, fullText) => { finished = true; removeListeners(); onDone?.(fullText); };
  const handleError = (_e, message) => { finished = true; removeListeners(); onError?.(message); };

  function removeListeners() {
    ipcRenderer.removeListener(chunkChannel, handleChunk);
    ipcRenderer.removeListener(doneChannel, handleDone);
    ipcRenderer.removeListener(errorChannel, handleError);
  }

  ipcRenderer.on(chunkChannel, handleChunk);
  ipcRenderer.on(doneChannel, handleDone);
  ipcRenderer.on(errorChannel, handleError);
  ipcRenderer.send("ai:chat-stream", { requestId, messages, agentId });

  return function stop() {
    if (finished) return;
    finished = true;
    removeListeners();
    ipcRenderer.send("ai:chat-stream-cancel", requestId);
  };
}

contextBridge.exposeInMainWorld("orun", {
  ai: {
    chat: (messages, agentId) => ipcRenderer.invoke("ai:chat", { messages, agentId }),
    chatStream,
    /**
     * Autonomous agent loop — Hampton uses tools (file ops, shell, web, memory)
     * in a loop until it produces a final text response.
     * Returns a stop() function.
     * Callbacks: onToolCall({id,name,arguments}), onToolResult({id,name,result}),
     *            onDone(fullText), onError(message)
     */
    autonomous(messages, { onToolCall, onToolResult, onChunk, onDone, onError, agentId } = {}) {
  const requestId = crypto.randomUUID();
      const tcChannel = `ai:autonomous:tool-call:${requestId}`;
      const trChannel = `ai:autonomous:tool-result:${requestId}`;
      const textChannel = `ai:autonomous:text:${requestId}`;
      const doneChannel = `ai:autonomous:done:${requestId}`;
      const errorChannel = `ai:autonomous:error:${requestId}`;
      let finished = false;

      const handleTC = (_e, data) => onToolCall?.(data);
      const handleTR = (_e, data) => onToolResult?.(data);
      const handleText = (_e, text) => onChunk?.(text);
      const handleDone = (_e, text) => { finished = true; remove(); onDone?.(text); };
      const handleError = (_e, msg) => { finished = true; remove(); onError?.(msg); };

      function remove() {
        ipcRenderer.removeListener(tcChannel, handleTC);
        ipcRenderer.removeListener(trChannel, handleTR);
        ipcRenderer.removeListener(textChannel, handleText);
        ipcRenderer.removeListener(doneChannel, handleDone);
        ipcRenderer.removeListener(errorChannel, handleError);
      }

      ipcRenderer.on(tcChannel, handleTC);
      ipcRenderer.on(trChannel, handleTR);
      ipcRenderer.on(textChannel, handleText);
      ipcRenderer.on(doneChannel, handleDone);
      ipcRenderer.on(errorChannel, handleError);
      ipcRenderer.send("ai:autonomous", { requestId, messages, agentId });

      return function stop() {
        if (finished) return;
        finished = true;
        remove();
        ipcRenderer.send("ai:autonomous-cancel", requestId);
      };
    },
    testConnection: (settings) => ipcRenderer.invoke("ai:test-connection", settings),
    listOllamaModels: (baseUrl) => ipcRenderer.invoke("ai:list-ollama-models", baseUrl),
    listCloudModels: (provider) => ipcRenderer.invoke("ai:list-cloud-models", provider),
    knownFreeModels: () => ipcRenderer.invoke("ai:known-free-models"),
    modelCatalog: () => ipcRenderer.invoke("ai:model-catalog"),
    providers: () => ipcRenderer.invoke("ai:providers"),
    usageToday: () => ipcRenderer.invoke("ai:usage-today"),
    usageRange: (startDate, endDate) => ipcRenderer.invoke("usage:get-range", startDate, endDate),
    healthCheck: () => ipcRenderer.invoke("ai:health-check"),
    cacheStats: () => ipcRenderer.invoke("ai:cache-stats"),
    cacheClear: () => ipcRenderer.invoke("ai:cache-clear"),
    telemetry: () => ipcRenderer.invoke("ai:telemetry"),
    rateLimitStatus: () => ipcRenderer.invoke("ai:rate-limit-status"),
  },
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
    setApiKey: (slot, value) => ipcRenderer.invoke("settings:set-api-key", slot, value),
    hasApiKey: (slot) => ipcRenderer.invoke("settings:has-api-key", slot),
    validateApiKey: (provider, key) => ipcRenderer.invoke("settings:validate-api-key", { provider, key }),
    agentRecommendedModels: () => ipcRenderer.invoke("settings:agent-recommended-models"),
    isFirstRun: () => ipcRenderer.invoke("settings:is-first-run"),
    encryptDB: () => ipcRenderer.invoke("settings:encrypt-db"),
    decryptDB: () => ipcRenderer.invoke("settings:decrypt-db"),
    isDBEncrypted: () => ipcRenderer.invoke("settings:db-encrypted"),
    isEncryptionWeakMode: () => ipcRenderer.invoke("settings:encryption-weak-mode"),
  },
  conversations: {
    list: (agent) => ipcRenderer.invoke("conversations:list", agent),
    search: (query) => ipcRenderer.invoke("conversations:search", query),
    create: (title, agent) => ipcRenderer.invoke("conversations:create", title, agent),
    messages: (conversationId) => ipcRenderer.invoke("conversations:messages", conversationId),
    addMessage: (conversationId, message) => ipcRenderer.invoke("conversations:add-message", conversationId, message),
    remove: (conversationId) => ipcRenderer.invoke("conversations:delete", conversationId),
    truncateFrom: (conversationId, messageId) => ipcRenderer.invoke("conversations:truncate-from", conversationId, messageId),
    importConversation: (id, messages) => ipcRenderer.invoke("data:import-conversation", { id, messages }),
  },
  n8n: {
    listWorkflows: () => ipcRenderer.invoke("n8n:list-workflows"),
    testConnection: (cfg) => ipcRenderer.invoke("n8n:test-connection", cfg),
    triggerWebhook: (args) => ipcRenderer.invoke("n8n:trigger-webhook", args),
  },
  automation: {
    listRules: () => ipcRenderer.invoke("automation:list-rules"),
    addRule: (rule) => ipcRenderer.invoke("automation:add-rule", rule),
    removeRule: (ruleId) => ipcRenderer.invoke("automation:remove-rule", ruleId),
    toggleRule: (ruleId) => ipcRenderer.invoke("automation:toggle-rule", ruleId),
  },
  socialMedia: {
    getConfig: () => ipcRenderer.invoke("social-media:get-config"),
    setConfig: (cfg) => ipcRenderer.invoke("social-media:set-config", cfg),
    publish: (opts) => ipcRenderer.invoke("social-media:publish", opts),
    publishMulti: (opts) => ipcRenderer.invoke("social-media:publish-multi", opts),
    test: () => ipcRenderer.invoke("social-media:test"),
  },
  app: {
    setRunInBackground: (value) => ipcRenderer.invoke("app:set-run-in-background", value),
    setAutoStart: (value) => ipcRenderer.invoke("app:set-auto-start", value),
    setLastConversation: (id) => ipcRenderer.invoke("app:set-last-conversation", id),
    getLastConversation: () => ipcRenderer.invoke("app:get-last-conversation"),
    checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
    installUpdate: () => ipcRenderer.invoke("app:install-update"),
    onUpdateStatus: (callback) => {
      const handler = (_e, status) => callback(status);
      ipcRenderer.on("app:update-status", handler);
      return () => ipcRenderer.removeListener("app:update-status", handler);
    },
    onNotify: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("app:notify", handler);
      return () => ipcRenderer.removeListener("app:notify", handler);
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  },
  tts: {
    listVoices: (engine) => ipcRenderer.invoke("tts:list-voices", engine),
    synthesize: (engine, voiceId, text) => ipcRenderer.invoke("tts:synthesize", { engine, voiceId, text }),
    engines: () => ipcRenderer.invoke("tts:engines"),
    setEngineConfig: (engine, cfg) => ipcRenderer.invoke("tts:set-engine-config", engine, cfg),
    getEngineConfig: (engine) => ipcRenderer.invoke("tts:get-engine-config", engine),
    usageToday: () => ipcRenderer.invoke("tts:usage-today"),
  },
  stt: {
    engines: () => ipcRenderer.invoke("stt:engines"),
    testConnection: (baseUrl) => ipcRenderer.invoke("stt:test-connection", baseUrl),
    transcribe: (args) => ipcRenderer.invoke("stt:transcribe", args),
  },
  nutrition: {
    getDaily: (date) => ipcRenderer.invoke("nutrition:get-daily", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("nutrition:get-range", startDate, endDate),
  },
  finance: {
    getDaily: (date) => ipcRenderer.invoke("finance:get-daily", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("finance:get-range", startDate, endDate),
  },
  health: {
    getDaily: (date) => ipcRenderer.invoke("health:get-daily", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("health:get-range", startDate, endDate),
  },
  developer: {
    getReviews: (date) => ipcRenderer.invoke("developer:get-reviews", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("developer:get-range", startDate, endDate),
    setWorkspace: (path) => ipcRenderer.invoke("developer:set-workspace", path),
    getWorkspace: () => ipcRenderer.invoke("developer:get-workspace"),
    listFiles: (dirPath) => ipcRenderer.invoke("developer:list-files", dirPath),
    "read-file": (body) => ipcRenderer.invoke("developer:read-file", body),
    "write-file": (body) => ipcRenderer.invoke("developer:write-file", body),
    "execute-command": (body) => ipcRenderer.invoke("developer:execute-command", body),
  },
  teacher: {
    getProgress: (date) => ipcRenderer.invoke("teacher:get-progress", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("teacher:get-range", startDate, endDate),
  },
  videoEditor: {
    getProjects: (date) => ipcRenderer.invoke("videoeditor:get-projects", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("videoeditor:get-range", startDate, endDate),
    listTemplates: () => ipcRenderer.invoke("videoeditor:list-templates"),
    createComposition: (opts) => ipcRenderer.invoke("videoeditor:create-composition", opts),
    renderVideo: (opts) => ipcRenderer.invoke("videoeditor:render-video", opts),
  },
  image3d: {
    getGenerations: (date) => ipcRenderer.invoke("image3d:get-generations", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("image3d:get-range", startDate, endDate),
    falModels: () => ipcRenderer.invoke("image3d:fal-models"),
    tripoModels: () => ipcRenderer.invoke("image3d:tripo-models"),
    generateImage: (opts) => ipcRenderer.invoke("image3d:generate-image", opts),
    generate3D: (opts) => ipcRenderer.invoke("image3d:generate-3d", opts),
    comfyuiTest: (baseUrl) => ipcRenderer.invoke("image3d:comfyui-test", baseUrl),
    comfyuiSubmit: (opts) => ipcRenderer.invoke("image3d:comfyui-submit", opts),
    comfyuiResults: (promptId, baseUrl) => ipcRenderer.invoke("image3d:comfyui-results", promptId, baseUrl),
  },
  musicProducer: {
    getProjects: (date) => ipcRenderer.invoke("musicproducer:get-projects", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("musicproducer:get-range", startDate, endDate),
    wonderaModels: () => ipcRenderer.invoke("musicproducer:wondera-models"),
    autotonePresets: () => ipcRenderer.invoke("musicproducer:autotone-presets"),
    generateMusic: (opts) => ipcRenderer.invoke("musicproducer:generate-music", opts),
    master: (opts) => ipcRenderer.invoke("musicproducer:master", opts),
    separateStems: (opts) => ipcRenderer.invoke("musicproducer:separate-stems", opts),
    autotone: (opts) => ipcRenderer.invoke("musicproducer:autotone", opts),
    mix: (opts) => ipcRenderer.invoke("musicproducer:mix", opts),
  },
  whatsapp: {
    connect: () => ipcRenderer.invoke("whatsapp:connect"),
    disconnect: () => ipcRenderer.invoke("whatsapp:disconnect"),
    status: () => ipcRenderer.invoke("whatsapp:status"),
    sendTest: (jid, text) => ipcRenderer.invoke("whatsapp:send-test", { jid, text }),
    getAgentJids: () => ipcRenderer.invoke("whatsapp:get-agent-jids"),
    setAgentJids: (agentJids) => ipcRenderer.invoke("whatsapp:set-agent-jids", agentJids),
    listGroups: () => ipcRenderer.invoke("whatsapp:list-groups"),
    testGroup: (jid, agentName) => ipcRenderer.invoke("whatsapp:test-group", jid, agentName),
    onStatusUpdate: (callback) => {
      const handler = (_e, status) => callback(status);
      ipcRenderer.on("whatsapp:status-update", handler);
      return () => ipcRenderer.removeListener("whatsapp:status-update", handler);
    },
    onQR: (callback) => {
      const handler = (_e, dataUrl) => callback(dataUrl);
      ipcRenderer.on("whatsapp:qr", handler);
      return () => ipcRenderer.removeListener("whatsapp:qr", handler);
    },
  },
  waAutomation: {
    getStats: () => ipcRenderer.invoke("wa:auto:get-stats"),
    addKeywordRule: (rule) => ipcRenderer.invoke("wa:auto:keyword-add", rule),
    removeKeywordRule: (ruleId) => ipcRenderer.invoke("wa:auto:keyword-remove", ruleId),
    toggleKeywordRule: (ruleId) => ipcRenderer.invoke("wa:auto:keyword-toggle", ruleId),
    getKeywordRules: () => ipcRenderer.invoke("wa:auto:keyword-rules"),
    getSummary: (jid, agentName, hours) => ipcRenderer.invoke("wa:auto:summary", { jid, agentName, hours }),
    broadcast: (text, groupJids) => ipcRenderer.invoke("wa:auto:broadcast", { text, groupJids }),
    setN8nWebhook: (url) => ipcRenderer.invoke("wa:auto:n8n-webhook", url),
    getN8nWebhook: () => ipcRenderer.invoke("wa:auto:n8n-webhook-get"),
    extractDate: (text) => ipcRenderer.invoke("wa:auto:extract-date", text),
  },
  schedules: {
    get: () => ipcRenderer.invoke("schedules:get"),
    set: (agentName, cfg) => ipcRenderer.invoke("schedules:set", agentName, cfg),
  },
  healthGoals: {
    get: () => ipcRenderer.invoke("health:get-goals"),
    set: (goals) => ipcRenderer.invoke("health:set-goals", goals),
    weeklyWeight: () => ipcRenderer.invoke("health:weekly-weight"),
    logWeight: (weightKg) => ipcRenderer.invoke("health:log-weight", weightKg),
  },
  agenda: {
    get: (date) => ipcRenderer.invoke("agenda:get", date),
    add: (entry) => ipcRenderer.invoke("agenda:add", entry),
    clear: (date) => ipcRenderer.invoke("agenda:clear", date),
  },
  nutritionFile: {
    getToday: () => ipcRenderer.invoke("nutrition:get-today-file"),
  },
  mcp: {
    listServers: () => ipcRenderer.invoke("mcp:list-servers"),
    addServer: (config) => ipcRenderer.invoke("mcp:add-server", config),
    removeServer: (name) => ipcRenderer.invoke("mcp:remove-server", name),
    listTools: () => ipcRenderer.invoke("mcp:list-tools"),
  },
  plugins: {
    list: () => ipcRenderer.invoke("plugins:list"),
    load: (id) => ipcRenderer.invoke("plugins:load", id),
    unload: (id) => ipcRenderer.invoke("plugins:unload", id),
    loadAll: () => ipcRenderer.invoke("plugins:load-all"),
  },
  sync: {
    status: () => ipcRenderer.invoke("sync:status"),
    trigger: () => ipcRenderer.invoke("sync:trigger"),
    test: () => ipcRenderer.invoke("sync:test"),
    configure: (databaseUrl) => ipcRenderer.invoke("sync:configure", { databaseUrl }),
  },
  system: {
    executeCommand: (command, options) => ipcRenderer.invoke("system:execute-command", command, options),
  },
  db: {
    listBackups: () => ipcRenderer.invoke("db:list-backups"),
    restore: (backupPath) => ipcRenderer.invoke("db:restore", backupPath),
    fullExport: () => ipcRenderer.invoke("db:full-export"),
  },
  deepLink: {
    onOpen: (handler) => {
      const listener = (_event, url) => handler(url);
      ipcRenderer.on("deep-link:open", listener);
      return () => ipcRenderer.removeListener("deep-link:open", listener);
    },
  },
  workspaceActions: {
    onAction: (handler) => {
      const listener = (_event, request) => handler(request);
      ipcRenderer.on("workspace:action", listener);
      return () => ipcRenderer.removeListener("workspace:action", listener);
    },
    sendResult: (requestId, result) => {
      ipcRenderer.send("workspace:action:result", requestId, result);
    },
  },
  voiceOverlay: {
    onShow: (handler) => {
      const listener = () => handler();
      ipcRenderer.on("voice-overlay:show", listener);
      return () => ipcRenderer.removeListener("voice-overlay:show", listener);
    },
  },
  wakeListener: {
    start: () => ipcRenderer.invoke("app:start-wake-listener"),
    stop: () => ipcRenderer.invoke("app:stop-wake-listener"),
    status: () => ipcRenderer.invoke("app:wake-listener-status"),
    restart: () => ipcRenderer.invoke("app:restart-wake-listener"),
    test: () => ipcRenderer.invoke("app:test-wake-word"),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke("shell:open-external", url),
    openDirectory: () => ipcRenderer.invoke("dialog:open-directory"),
  },
  spotify: {
    getCredentials: () => ipcRenderer.invoke("spotify:get-credentials"),
    setCredentials: (clientId, clientSecret) => ipcRenderer.invoke("spotify:set-credentials", clientId, clientSecret),
    getAuthUrl: () => ipcRenderer.invoke("spotify:get-auth-url"),
    startCallbackServer: () => ipcRenderer.invoke("spotify:start-callback-server"),
    stopCallbackServer: () => ipcRenderer.invoke("spotify:stop-callback-server"),
    saveTokens: (accessToken, refreshToken, expiresIn) => ipcRenderer.invoke("spotify:save-tokens", accessToken, refreshToken, expiresIn),
    loadTokens: () => ipcRenderer.invoke("spotify:load-tokens"),
    isConnected: () => ipcRenderer.invoke("spotify:is-connected"),
    disconnect: () => ipcRenderer.invoke("spotify:disconnect"),
    getN8nWebhook: () => ipcRenderer.invoke("spotify:get-n8n-webhook"),
    setN8nWebhook: (url) => ipcRenderer.invoke("spotify:set-n8n-webhook", url),
    getPlayback: () => ipcRenderer.invoke("spotify:get-playback"),
    getCurrentlyPlaying: () => ipcRenderer.invoke("spotify:get-currently-playing"),
    play: (options) => ipcRenderer.invoke("spotify:play", options),
    pause: (deviceId) => ipcRenderer.invoke("spotify:pause", deviceId),
    skipNext: (deviceId) => ipcRenderer.invoke("spotify:skip-next", deviceId),
    skipPrevious: (deviceId) => ipcRenderer.invoke("spotify:skip-previous", deviceId),
    seek: (positionMs, deviceId) => ipcRenderer.invoke("spotify:seek", positionMs, deviceId),
    setVolume: (volume, deviceId) => ipcRenderer.invoke("spotify:set-volume", volume, deviceId),
    setShuffle: (state, deviceId) => ipcRenderer.invoke("spotify:set-shuffle", state, deviceId),
    setRepeat: (state, deviceId) => ipcRenderer.invoke("spotify:set-repeat", state, deviceId),
    getDevices: () => ipcRenderer.invoke("spotify:get-devices"),
    transferPlayback: (deviceId) => ipcRenderer.invoke("spotify:transfer-playback", deviceId),
    search: (query, types, limit) => ipcRenderer.invoke("spotify:search", query, types, limit),
    getPlaylists: (limit) => ipcRenderer.invoke("spotify:get-playlists", limit),
    getPlaylist: (id) => ipcRenderer.invoke("spotify:get-playlist", id),
    getPlaylistTracks: (id, limit, offset) => ipcRenderer.invoke("spotify:get-playlist-tracks", id, limit, offset),
    createPlaylist: (name, desc, isPublic) => ipcRenderer.invoke("spotify:create-playlist", name, desc, isPublic),
    addToQueue: (uri) => ipcRenderer.invoke("spotify:add-to-queue", uri),
    getQueue: () => ipcRenderer.invoke("spotify:get-queue"),
    getMe: () => ipcRenderer.invoke("spotify:get-me"),
    getTopTracks: (limit, timeRange) => ipcRenderer.invoke("spotify:get-top-tracks", limit, timeRange),
    getRecentlyPlayed: (limit) => ipcRenderer.invoke("spotify:get-recently-played", limit),
  },
  discord: {
    getToken: () => ipcRenderer.invoke("discord:get-token"),
    setToken: (token) => ipcRenderer.invoke("discord:set-token", token),
    connect: (token) => ipcRenderer.invoke("discord:connect", token),
    disconnect: () => ipcRenderer.invoke("discord:disconnect"),
    getStatus: () => ipcRenderer.invoke("discord:get-status"),
    getGuilds: () => ipcRenderer.invoke("discord:get-guilds"),
    getChannels: (guildId) => ipcRenderer.invoke("discord:get-channels", guildId),
    sendMessage: (channelId, content) => ipcRenderer.invoke("discord:send-message", channelId, content),
    sendDM: (userId, content) => ipcRenderer.invoke("discord:send-dm", userId, content),
    setAgentResponse: (enabled) => ipcRenderer.invoke("discord:set-agent-response", enabled),
    getAgentResponse: () => ipcRenderer.invoke("discord:get-agent-response"),
    onStatusUpdate: (callback) => {
      const handler = (_e, status) => callback(status);
      ipcRenderer.on("discord:status-update", handler);
      return () => ipcRenderer.removeListener("discord:status-update", handler);
    },
  },
  telegram: {
    getToken: () => ipcRenderer.invoke("telegram:get-token"),
    setToken: (token) => ipcRenderer.invoke("telegram:set-token", token),
    connect: (token) => ipcRenderer.invoke("telegram:connect", token),
    disconnect: () => ipcRenderer.invoke("telegram:disconnect"),
    status: () => ipcRenderer.invoke("telegram:status"),
    sendTest: (chatId, text) => ipcRenderer.invoke("telegram:send-test", { chatId, text }),
    getAgentChats: () => ipcRenderer.invoke("telegram:get-agent-chats"),
    setAgentChats: (agentChats) => ipcRenderer.invoke("telegram:set-agent-chats", agentChats),
    getStats: () => ipcRenderer.invoke("telegram:get-stats"),
    onStatusUpdate: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("telegram:status-update", handler);
      return () => ipcRenderer.removeListener("telegram:status-update", handler);
    },
  },
});

// Forward developer:file-written IPC to CustomEvent for DeveloperIDE
ipcRenderer.on("developer:file-written", () => {
  try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
});
