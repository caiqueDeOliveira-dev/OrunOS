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
    autonomous(messages, { onToolCall, onToolResult, onChunk, onDone, onError, agentId, voiceMode } = {}) {
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
      ipcRenderer.send("ai:autonomous", { requestId, messages, agentId, voiceMode });

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
  aiRouter: {
    health: () => ipcRenderer.invoke("ai-router:health"),
    listCombos: () => ipcRenderer.invoke("ai-router:list-combos"),
    listProviders: () => ipcRenderer.invoke("ai-router:list-providers"),
    getCombo: (comboId) => ipcRenderer.invoke("ai-router:get-combo", comboId),
    saveCombo: (combo) => ipcRenderer.invoke("ai-router:save-combo", combo),
    deleteCombo: (comboId) => ipcRenderer.invoke("ai-router:delete-combo", comboId),
    usageRecent: (opts) => ipcRenderer.invoke("ai-router:usage-recent", opts),
    complete: (request) => ipcRenderer.invoke("ai-router:complete", request),
    stream(request, { onChunk, onDone, onError } = {}) {
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const chunkChannel = `ai-router:stream:chunk:${requestId}`;
      const doneChannel = `ai-router:stream:done:${requestId}`;
      const errorChannel = `ai-router:stream:error:${requestId}`;
      let finished = false;

      const handleChunk = (_e, chunk) => onChunk?.(chunk);
      const handleDone = (_e, result) => { finished = true; cleanup(); onDone?.(result); };
      const handleError = (_e, message) => { finished = true; cleanup(); onError?.(message); };
      function cleanup() {
        ipcRenderer.removeListener(chunkChannel, handleChunk);
        ipcRenderer.removeListener(doneChannel, handleDone);
        ipcRenderer.removeListener(errorChannel, handleError);
      }
      ipcRenderer.on(chunkChannel, handleChunk);
      ipcRenderer.on(doneChannel, handleDone);
      ipcRenderer.on(errorChannel, handleError);
      ipcRenderer.send("ai-router:stream", { requestId, request });
    },
    httpStatus: () => ipcRenderer.invoke("ai-router:http-status"),
    httpStart: () => ipcRenderer.invoke("ai-router:http-start"),
    httpStop: () => ipcRenderer.invoke("ai-router:http-stop"),
  },
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
    setApiKey: (slot, value) => ipcRenderer.invoke("settings:set-api-key", slot, value),
    hasApiKey: (slot) => ipcRenderer.invoke("settings:has-api-key", slot),
    setProviderKey: (provider, index, value) => ipcRenderer.invoke("settings:set-provider-key", provider, index, value),
    deleteProviderKey: (provider, index) => ipcRenderer.invoke("settings:delete-provider-key", provider, index),
    providerKeyCount: (provider) => ipcRenderer.invoke("settings:provider-key-count", provider),
    validateApiKey: (provider, key) => ipcRenderer.invoke("settings:validate-api-key", { provider, key }),
    agentRecommendedModels: () => ipcRenderer.invoke("settings:agent-recommended-models"),
    isFirstRun: () => ipcRenderer.invoke("settings:is-first-run"),
    encryptDB: () => ipcRenderer.invoke("settings:encrypt-db"),
    decryptDB: () => ipcRenderer.invoke("settings:decrypt-db"),
    isDBEncrypted: () => ipcRenderer.invoke("settings:db-encrypted"),
    isEncryptionWeakMode: () => ipcRenderer.invoke("settings:encryption-weak-mode"),
    // @orun/settings bridge (schema validado, escopo account/device)
    schemaGet: (path) => ipcRenderer.invoke("settings:schema-get", path),
    schemaSet: (path, value) => ipcRenderer.invoke("settings:schema-set", path, value),
    schemaGetAll: () => ipcRenderer.invoke("settings:schema-get-all"),
    schemaReset: (path) => ipcRenderer.invoke("settings:schema-reset", path),
    schemaScope: (path) => ipcRenderer.invoke("settings:schema-scope", path),
    schemaAccountPaths: () => ipcRenderer.invoke("settings:schema-account-paths"),
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
  identity: {
    listUsers: () => ipcRenderer.invoke("identity:list-users"),
    listIdentities: (opts) => ipcRenderer.invoke("identity:list-identities", opts),
    listWorkspaces: () => ipcRenderer.invoke("identity:list-workspaces"),
    listChannels: (opts) => ipcRenderer.invoke("identity:list-channels", opts),
    setChannel: (args) => ipcRenderer.invoke("identity:set-channel", args),
    setChannelEnabled: (args) => ipcRenderer.invoke("identity:set-channel-enabled", args),
    completeOnboarding: (args) => ipcRenderer.invoke("identity:complete-onboarding", args),
    linkIdentity: (args) => ipcRenderer.invoke("identity:link-identity", args),
    getVoiceSettings: (agentId) => ipcRenderer.invoke("identity:voice-settings", { agentId }),
    setVoiceSettings: (agentId, patch) => ipcRenderer.invoke("identity:set-voice-settings", { agentId, patch }),
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
    getBufferConfig: () => ipcRenderer.invoke("social-media:get-buffer-config"),
    setBufferConfig: (cfg) => ipcRenderer.invoke("social-media:set-buffer-config", cfg),
    publish: (opts) => ipcRenderer.invoke("social-media:publish", opts),
    publishMulti: (opts) => ipcRenderer.invoke("social-media:publish-multi", opts),
    test: () => ipcRenderer.invoke("social-media:test"),
  },
  postiz: {
    listChannels: () => ipcRenderer.invoke("postiz:list-channels"),
    listPosts: (opts) => ipcRenderer.invoke("postiz:list-posts", opts),
    createPost: (input) => ipcRenderer.invoke("postiz:create-post", input),
    deletePost: (group) => ipcRenderer.invoke("postiz:delete-post", group),
    getPost: (postId) => ipcRenderer.invoke("postiz:get-post", postId),
    getStats: (postId) => ipcRenderer.invoke("postiz:get-stats", postId),
    health: () => ipcRenderer.invoke("postiz:health"),
    availableChannels: () => ipcRenderer.invoke("postiz:available-channels"),
    findSlot: (integrationId) => ipcRenderer.invoke("postiz:find-slot", integrationId),
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
    onUpdateChecking: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("update:checking", handler);
      return () => ipcRenderer.removeListener("update:checking", handler);
    },
    onUpdateAvailable: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("update:available", handler);
      return () => ipcRenderer.removeListener("update:available", handler);
    },
    onUpdateNotAvailable: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("update:not-available", handler);
      return () => ipcRenderer.removeListener("update:not-available", handler);
    },
    onUpdateProgress: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("update:progress", handler);
      return () => ipcRenderer.removeListener("update:progress", handler);
    },
    onUpdateDownloaded: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("update:downloaded", handler);
      return () => ipcRenderer.removeListener("update:downloaded", handler);
    },
    onUpdateError: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("update:error", handler);
      return () => ipcRenderer.removeListener("update:error", handler);
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
    transcribeGroq: (args) => ipcRenderer.invoke("stt:transcribe-groq", args),
  },
  nutrition: {
    getDaily: (date) => ipcRenderer.invoke("nutrition:get-daily", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("nutrition:get-range", startDate, endDate),
  },
  finance: {
    getDaily: (date) => ipcRenderer.invoke("finance:get-daily", date),
    getRange: (startDate, endDate) => ipcRenderer.invoke("finance:get-range", startDate, endDate),
    listAccounts: () => ipcRenderer.invoke("finance:list-accounts"),
    listCategories: () => ipcRenderer.invoke("finance:list-categories"),
    listTransactions: (accountId, options) => ipcRenderer.invoke("finance:list-transactions", accountId, options),
    getBudgetMonth: (month) => ipcRenderer.invoke("finance:get-budget-month", month),
    createTransaction: (input) => ipcRenderer.invoke("finance:create-transaction", input),
    categorizeTransaction: (transactionId, categoryId) => ipcRenderer.invoke("finance:categorize-transaction", transactionId, categoryId),
    setBudgetAmount: (categoryId, month, amountCents) => ipcRenderer.invoke("finance:set-budget-amount", categoryId, month, amountCents),
    sync: () => ipcRenderer.invoke("finance:sync"),
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
    gitStatus: (dirPath) => ipcRenderer.invoke("developer:git-status", dirPath),
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
    fooocusTest: (baseUrl) => ipcRenderer.invoke("image3d:fooocus-test", baseUrl),
    fooocusDefaultUrl: "http://127.0.0.1:7865",
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
    applyGain: (opts) => ipcRenderer.invoke("musicproducer:apply-gain", opts),
  },
  homeAssistant: {
    getConfig: () => ipcRenderer.invoke("homeassistant:get-config"),
    setConfig: (cfg) => ipcRenderer.invoke("homeassistant:set-config", cfg),
    getDevices: () => ipcRenderer.invoke("homeassistant:get-devices"),
    getRooms: () => ipcRenderer.invoke("homeassistant:get-rooms"),
    getStates: () => ipcRenderer.invoke("homeassistant:get-states"),
    getDeviceState: (deviceId) => ipcRenderer.invoke("homeassistant:get-device-state", deviceId),
    callService: (deviceId, service, params) => ipcRenderer.invoke("homeassistant:call-service", deviceId, service, params),
    getAutomations: () => ipcRenderer.invoke("homeassistant:get-automations"),
    runAutomation: (automationId) => ipcRenderer.invoke("homeassistant:run-automation", automationId),
    createAutomation: (params) => ipcRenderer.invoke("homeassistant:create-automation", params),
    deleteAutomation: (automationId) => ipcRenderer.invoke("homeassistant:delete-automation", automationId),
    toggleAutomation: (automationId) => ipcRenderer.invoke("homeassistant:toggle-automation", automationId),
    getScenes: () => ipcRenderer.invoke("homeassistant:get-scenes"),
    activateScene: (sceneId) => ipcRenderer.invoke("homeassistant:activate-scene", sceneId),
    getStatus: () => ipcRenderer.invoke("homeassistant:get-status"),
  },
  security: {
    runAudit: () => ipcRenderer.invoke("security:run-audit"),
    getReport: () => ipcRenderer.invoke("security:get-report"),
    fixFinding: (findingId) => ipcRenderer.invoke("security:fix-finding", findingId),
    exportReport: () => ipcRenderer.invoke("security:export-report"),
  },
  backup: {
    list: () => ipcRenderer.invoke("backup:list"),
    restore: (backupPath) => ipcRenderer.invoke("backup:restore", backupPath),
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
    groupMessages: (jid) => ipcRenderer.invoke("whatsapp:group-messages", { jid }),
    onGroupMessage: (callback) => {
      const handler = (_e, payload) => callback(payload);
      ipcRenderer.on("whatsapp:group-msg", handler);
      return () => ipcRenderer.removeListener("whatsapp:group-msg", handler);
    },
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
  groupFeed: {
    getState: () => ipcRenderer.invoke("group-feed:get-state"),
    getSettings: () => ipcRenderer.invoke("group-feed:get-settings"),
    setSettings: (patch) => ipcRenderer.invoke("group-feed:set-settings", patch),
    addWatchlistTerm: (term) => ipcRenderer.invoke("group-feed:watchlist-add", term),
    removeWatchlistTerm: (id) => ipcRenderer.invoke("group-feed:watchlist-remove", id),
    toggleWatchlistTerm: (id, enabled) => ipcRenderer.invoke("group-feed:watchlist-toggle", id, enabled),
    clearHistory: () => ipcRenderer.invoke("group-feed:clear-history"),
    runDealsScan: () => ipcRenderer.invoke("group-feed:deals-run"),
    onMessage: (callback) => {
      const handler = (_e, msg) => callback(msg);
      ipcRenderer.on("group-feed:message", handler);
      return () => ipcRenderer.removeListener("group-feed:message", handler);
    },
    onAlert: (callback) => {
      const handler = (_e, alert) => callback(alert);
      ipcRenderer.on("group-feed:alert", handler);
      return () => ipcRenderer.removeListener("group-feed:alert", handler);
    },
    onDeals: (callback) => {
      const handler = (_e, result) => callback(result);
      ipcRenderer.on("group-feed:deals", handler);
      return () => ipcRenderer.removeListener("group-feed:deals", handler);
    },
  },
  career: {
    getState: () => ipcRenderer.invoke("career:get-state"),
    getStats: () => ipcRenderer.invoke("career:get-stats"),
    listJobs: (opts) => ipcRenderer.invoke("career:list-jobs", opts),
    addJob: (job) => ipcRenderer.invoke("career:add-job", job),
    updateStatus: (id, status) => ipcRenderer.invoke("career:update-status", id, status),
    removeJob: (id) => ipcRenderer.invoke("career:remove-job", id),
    getProfile: (profileKey) => ipcRenderer.invoke("career:get-profile", profileKey),
    saveProfile: (profileKey, data) => ipcRenderer.invoke("career:save-profile", profileKey, data),
    generateProfile: (profileKey) => ipcRenderer.invoke("career:generate-profile", profileKey),
    prepareApplication: (jobId, profileKey, querySummary) => ipcRenderer.invoke("career:prepare-application", jobId, profileKey, querySummary),
    searchJobs: (query, profileKey, limit) => ipcRenderer.invoke("career:search-jobs", query, profileKey, limit),
  },
  github: {
    status: () => ipcRenderer.invoke("github:status"),
    connect: (token) => ipcRenderer.invoke("github:connect", { token }),
    disconnect: () => ipcRenderer.invoke("github:disconnect"),
    listRepos: (opts) => ipcRenderer.invoke("github:list-repos", opts),
    getRepo: (owner, repo) => ipcRenderer.invoke("github:repo-info", { owner, repo }),
    doctor: (staleDays) => ipcRenderer.invoke("github:doctor", { staleDays }),
    updateRepo: (owner, repo, patch) => ipcRenderer.invoke("github:update-repo", { owner, repo, ...patch }),
    listBranches: (owner, repo) => ipcRenderer.invoke("github:list-branches", { owner, repo }),
    deleteRepo: (owner, repo, confirmName) => ipcRenderer.invoke("github:delete-repo", { owner, repo, confirmName }),
    clone: (url, dest) => ipcRenderer.invoke("github:clone", { url, dest }),
    fetch: (workspace, branch) => ipcRenderer.invoke("github:fetch", { workspace }),
    pull: (workspace, branch) => ipcRenderer.invoke("github:pull", { workspace, branch }),
    push: (workspace, branch) => ipcRenderer.invoke("github:push", { workspace, branch }),
    configureGit: (workspace) => ipcRenderer.invoke("github:configure-git", { workspace }),
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
  skills: {
    list: () => ipcRenderer.invoke("skills:list"),
    details: (id) => ipcRenderer.invoke("skills:details", { id }),
    install: (srcDir, force) => ipcRenderer.invoke("skills:install", { srcDir, force }),
    installDialog: () => ipcRenderer.invoke("skills:install-dialog"),
    uninstall: (id, force) => ipcRenderer.invoke("skills:uninstall", { id, force }),
    setEnabled: (id, enabled) => ipcRenderer.invoke("skills:set-enabled", { id, enabled }),
    reload: () => ipcRenderer.invoke("skills:reload"),
    tools: () => ipcRenderer.invoke("skills:tools"),
    dir: () => ipcRenderer.invoke("skills:dir"),
    openDir: () => ipcRenderer.invoke("skills:open-dir"),
  },
  memory: {
    save: (entry) => ipcRenderer.invoke("memory:save", entry),
    search: (opts) => ipcRenderer.invoke("memory:search", opts),
    inject: (opts) => ipcRenderer.invoke("memory:inject", opts),
    consolidate: (opts) => ipcRenderer.invoke("memory:consolidate", opts),
    remove: (id) => ipcRenderer.invoke("memory:remove", { id }),
    stats: () => ipcRenderer.invoke("memory:stats"),
    list: () => ipcRenderer.invoke("memory:list"),
  },
  knowledge: {
    save: (doc) => ipcRenderer.invoke("knowledge:save", doc),
    changelog: (opts) => ipcRenderer.invoke("knowledge:changelog", opts),
    diary: (opts) => ipcRenderer.invoke("knowledge:diary", opts),
    adr: (opts) => ipcRenderer.invoke("knowledge:adr", opts),
    list: (opts) => ipcRenderer.invoke("knowledge:list", opts),
    get: (id) => ipcRenderer.invoke("knowledge:get", { id }),
    remove: (id) => ipcRenderer.invoke("knowledge:remove", { id }),
    stats: () => ipcRenderer.invoke("knowledge:stats"),
  },
  neural: {
    snapshot: () => ipcRenderer.invoke("neural:snapshot"),
    search: (q) => ipcRenderer.invoke("neural:search", { q }),
    backlinks: (id) => ipcRenderer.invoke("neural:backlinks", { id }),
    autoCapture: (payload) => ipcRenderer.invoke("neural:autoCapture", payload),
  },
  planner: {
    create: (opts) => ipcRenderer.invoke("planner:create", opts),
    list: (opts) => ipcRenderer.invoke("planner:list", opts),
    get: (id) => ipcRenderer.invoke("planner:get", { id }),
    update: (id, patch) => ipcRenderer.invoke("planner:update", { id, patch }),
    next: (goalId) => ipcRenderer.invoke("planner:next", { goalId }),
    run: (goalId) => ipcRenderer.invoke("planner:run", { goalId }),
    plan: (goal, context) => ipcRenderer.invoke("planner:plan", { goal, context }),
    review: (goalId) => ipcRenderer.invoke("planner:review", { goalId }),
    stats: () => ipcRenderer.invoke("planner:stats"),
  },
  agentHub: {
    list: () => ipcRenderer.invoke("agent-hub:list"),
    get: (id) => ipcRenderer.invoke("agent-hub:get", { id }),
    route: (request, context) => ipcRenderer.invoke("agent-hub:route", { request, context }),
    delegate: (request, context, agent) => ipcRenderer.invoke("agent-hub:delegate", { request, context, agent }),
  },
  analytics: {
    summary: () => ipcRenderer.invoke("analytics:summary"),
    system: () => ipcRenderer.invoke("analytics:system"),
    event: (ev) => ipcRenderer.invoke("analytics:event", ev),
  },
  world: {
    news: (opts) => ipcRenderer.invoke("world:news", opts),
  },
  sync: {
    status: () => ipcRenderer.invoke("sync:status"),
    trigger: () => ipcRenderer.invoke("sync:trigger"),
    test: () => ipcRenderer.invoke("sync:test"),
    configure: (databaseUrl) => ipcRenderer.invoke("sync:configure", { databaseUrl }),
  },
  settingsSync: {
    init: () => ipcRenderer.invoke("settings-sync:init"),
    status: () => ipcRenderer.invoke("settings-sync:status"),
    resolveConflict: (path, resolution) => ipcRenderer.invoke("settings-sync:resolve-conflict", path, resolution),
    retry: () => ipcRenderer.invoke("settings-sync:retry"),
    conflicts: () => ipcRenderer.invoke("settings-sync:conflicts"),
    pending: () => ipcRenderer.invoke("settings-sync:pending"),
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
    onOpen: (handler) => {
      const listener = (_event, workspaceId) => handler(workspaceId);
      ipcRenderer.on("workspace:open", listener);
      return () => ipcRenderer.removeListener("workspace:open", listener);
    },
    notifyRegistered: (workspaceId) => {
      ipcRenderer.send("workspace:actions-registered", workspaceId);
    },
  },
  voiceOverlay: {
    onShow: (handler) => {
      const listener = () => handler();
      ipcRenderer.on("voice-overlay:show", listener);
      return () => ipcRenderer.removeListener("voice-overlay:show", listener);
    },
    onProactive: (handler) => {
      const listener = (_e, payload) => handler(payload);
      ipcRenderer.on("voice-overlay:proactive", listener);
      return () => ipcRenderer.removeListener("voice-overlay:proactive", listener);
    },
    setTtsState: (playing) => {
      ipcRenderer.send("voice:tts-state", { playing: !!playing });
    },
  },
  quickChat: {
    hide: () => ipcRenderer.invoke("quick-chat:hide"),
    isVisible: () => ipcRenderer.invoke("quick-chat:is-visible"),
    sendMessage: (text) => ipcRenderer.invoke("quick-chat:send-message", text),
    onShow: (handler) => {
      const listener = () => handler();
      ipcRenderer.on("quick-chat:show", listener);
      return () => ipcRenderer.removeListener("quick-chat:show", listener);
    },
    onResponse: (handler) => {
      const listener = (_e, text) => handler(text);
      ipcRenderer.on("quick-chat:response", listener);
      return () => ipcRenderer.removeListener("quick-chat:response", listener);
    },
    onError: (handler) => {
      const listener = (_e, msg) => handler(msg);
      ipcRenderer.on("quick-chat:error", listener);
      return () => ipcRenderer.removeListener("quick-chat:error", listener);
    },
    onHide: (handler) => {
      const listener = () => handler();
      ipcRenderer.on("quick-chat:hide", listener);
      return () => ipcRenderer.removeListener("quick-chat:hide", listener);
    },
  },
  wakeListener: {
    start: () => ipcRenderer.invoke("app:start-wake-listener"),
    stop: () => ipcRenderer.invoke("app:stop-wake-listener"),
    status: () => ipcRenderer.invoke("app:wake-listener-status"),
    restart: () => ipcRenderer.invoke("app:restart-wake-listener"),
    test: () => ipcRenderer.invoke("app:test-wake-word"),
  },
  webhook: {
    status: () => ipcRenderer.invoke("webhook:status"),
    onEvent: (handler) => {
      const listener = (_e, event) => handler(event);
      ipcRenderer.on("webhook:event", listener);
      return () => ipcRenderer.removeListener("webhook:event", listener);
    },
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
    getInviteUrl: () => ipcRenderer.invoke("discord:get-invite-url"),
    redeployCommands: () => ipcRenderer.invoke("discord:redeploy-commands"),
    getDeployLog: () => ipcRenderer.invoke("discord:get-deploy-log"),
    onStatusUpdate: (callback) => {
      const handler = (_e, status) => callback(status);
      ipcRenderer.on("discord:status-update", handler);
      return () => ipcRenderer.removeListener("discord:status-update", handler);
    },
  },
  activity: {
    list: (opts) => ipcRenderer.invoke("activity:list", opts),
    telemetry: () => ipcRenderer.invoke("activity:telemetry"),
    usageRange: (start, end) => ipcRenderer.invoke("activity:usage-range", start, end),
    clear: () => ipcRenderer.invoke("activity:clear"),
    onNewEntry: (handler) => {
      const listener = (_e, entry) => handler(entry);
      ipcRenderer.on("activity:new-entry", listener);
      return () => ipcRenderer.removeListener("activity:new-entry", listener);
    },
  },
  fileSystem: {
    saveFile: (payload) => ipcRenderer.invoke("evidence:save-file", payload),
    getFolderPath: (subfolder) => ipcRenderer.invoke("evidence:get-folder", subfolder),
    createFolder: (folderPath) => ipcRenderer.invoke("evidence:create-folder", folderPath),
    listFiles: (folderPath) => ipcRenderer.invoke("evidence:list-files", folderPath),
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
  google: {
    getCredentials: () => ipcRenderer.invoke("google:get-credentials"),
    setCredentials: (clientId, clientSecret) => ipcRenderer.invoke("google:set-credentials", clientId, clientSecret),
    getAuthUrl: () => ipcRenderer.invoke("google:get-auth-url"),
    startCallbackServer: () => ipcRenderer.invoke("google:start-callback-server"),
    stopCallbackServer: () => ipcRenderer.invoke("google:stop-callback-server"),
    saveTokens: (tokens) => ipcRenderer.invoke("google:save-tokens", tokens),
    loadTokens: () => ipcRenderer.invoke("google:load-tokens"),
    isConnected: () => ipcRenderer.invoke("google:is-connected"),
    disconnect: () => ipcRenderer.invoke("google:disconnect"),
  },
  gmail: {
    listMessages: (opts) => ipcRenderer.invoke("gmail:list-messages", opts),
    getMessage: (id) => ipcRenderer.invoke("gmail:get-message", id),
    send: (to, subject, body, threadId) => ipcRenderer.invoke("gmail:send", to, subject, body, threadId),
    reply: (messageId, body) => ipcRenderer.invoke("gmail:reply", messageId, body),
    markRead: (messageId) => ipcRenderer.invoke("gmail:mark-read", messageId),
  },
  emailService: {
    start: () => ipcRenderer.invoke("email-service:start"),
    stop: () => ipcRenderer.invoke("email-service:stop"),
    status: () => ipcRenderer.invoke("email-service:status"),
    analyze: (emailId) => ipcRenderer.invoke("email-service:analyze", emailId),
  },
  calendar: {
    listEvents: (opts) => ipcRenderer.invoke("calendar:list-events", opts),
    createEvent: (data) => ipcRenderer.invoke("calendar:create-event", data),
    updateEvent: (id, updates) => ipcRenderer.invoke("calendar:update-event", id, updates),
    deleteEvent: (id) => ipcRenderer.invoke("calendar:delete-event", id),
    listCalendars: () => ipcRenderer.invoke("calendar:list-calendars"),
  },
  auth: {
    getState: () => ipcRenderer.invoke("auth:get-state"),
    signIn: (email, password) => ipcRenderer.invoke("auth:sign-in", { email, password }),
    signUp: (email, password, displayName) => ipcRenderer.invoke("auth:sign-up", { email, password, displayName }),
    signOut: () => ipcRenderer.invoke("auth:sign-out"),
    resetPassword: (email) => ipcRenderer.invoke("auth:reset-password", { email }),
    updatePassword: (password) => ipcRenderer.invoke("auth:update-password", { password }),
    completeRecovery: (url) => ipcRenderer.invoke("auth:complete-recovery", { url }),
    getOwner: () => ipcRenderer.invoke("auth:get-owner"),
    listDevices: (tenantId) => ipcRenderer.invoke("auth:list-devices", tenantId),
    revokeDevice: (deviceId) => ipcRenderer.invoke("auth:revoke-device", deviceId),
    getLicense: () => ipcRenderer.invoke("auth:get-license"),
    refreshLicense: () => ipcRenderer.invoke("auth:refresh-license"),
    getEntitlements: (tenantId) => ipcRenderer.invoke("auth:get-entitlements", tenantId),
    startCheckout: (tenantId) => ipcRenderer.invoke("auth:start-checkout", tenantId),
    exportData: () => ipcRenderer.invoke("auth:export-data"),
    deleteAccount: () => ipcRenderer.invoke("auth:delete-account"),
    onStateChanged: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("auth:state-changed", handler);
      return () => ipcRenderer.removeListener("auth:state-changed", handler);
    },
  },
  shield: {
    startMonitoring: () => ipcRenderer.invoke("shield:start-monitoring"),
    stopMonitoring: () => ipcRenderer.invoke("shield:stop-monitoring"),
    fullScan: (req) => ipcRenderer.invoke("shield:full-scan", req),
    getFindingsLog: () => ipcRenderer.invoke("shield:get-findings-log"),
    checkClamAvAvailability: () => ipcRenderer.invoke("shield:check-clamav-availability"),
    updateDefinitions: () => ipcRenderer.invoke("shield:update-definitions"),
    blockIp: (ip) => ipcRenderer.invoke("shield:block-ip", ip),
    quarantineFinding: (finding) => ipcRenderer.invoke("shield:quarantine-finding", finding),
    listQuarantine: () => ipcRenderer.invoke("shield:list-quarantine"),
    restoreQuarantine: (id) => ipcRenderer.invoke("shield:restore-quarantine", id),
    deleteQuarantine: (id) => ipcRenderer.invoke("shield:delete-quarantine", id),
    analyzeFile: (filePath) => ipcRenderer.invoke("shield:analyze-file", filePath),
    getProcessTree: () => ipcRenderer.invoke("shield:get-process-tree"),
    getDefenderStatus: () => ipcRenderer.invoke("shield:get-defender-status"),
    syncDefenderThreats: () => ipcRenderer.invoke("shield:sync-defender-threats"),
    runDefenderQuickScan: () => ipcRenderer.invoke("shield:defender-quick-scan"),
    updateDefenderSignatures: () => ipcRenderer.invoke("shield:defender-update-signatures"),
    onThreatDetected: (callback) => {
      const handler = (_e, finding) => callback(finding);
      ipcRenderer.on("shield:event:threat-detected", handler);
      return () => ipcRenderer.removeListener("shield:event:threat-detected", handler);
    },
    onScanStarted: (callback) => {
      const handler = (_e, payload) => callback(payload);
      ipcRenderer.on("shield:event:scan-started", handler);
      return () => ipcRenderer.removeListener("shield:event:scan-started", handler);
    },
    onScanFinished: (callback) => {
      const handler = (_e, result) => callback(result);
      ipcRenderer.on("shield:event:scan-finished", handler);
      return () => ipcRenderer.removeListener("shield:event:scan-finished", handler);
    },
    onError: (callback) => {
      const handler = (_e, payload) => callback(payload);
      ipcRenderer.on("shield:event:error", handler);
      return () => ipcRenderer.removeListener("shield:event:error", handler);
    },
  },
  optimizer: {
    scanDiskUsage: (path) => ipcRenderer.invoke("optimizer:scan-disk-usage", path),
    scanJunk: (req) => ipcRenderer.invoke("optimizer:scan-junk", req),
    moveToHolding: (req) => ipcRenderer.invoke("optimizer:move-to-holding", req),
    moveManyToHolding: (reqs) => ipcRenderer.invoke("optimizer:move-many-to-holding", reqs),
    listHolding: () => ipcRenderer.invoke("optimizer:list-holding"),
    restoreFromHolding: (id) => ipcRenderer.invoke("optimizer:restore-from-holding", id),
    deletePermanently: (id) => ipcRenderer.invoke("optimizer:delete-permanently", id),
    detectPackageManager: () => ipcRenderer.invoke("optimizer:detect-package-manager"),
    checkUpdates: () => ipcRenderer.invoke("optimizer:check-updates"),
    runUpdate: (packageId) => ipcRenderer.invoke("optimizer:run-update", packageId),
    runUpdatesBatch: (packageIds) => ipcRenderer.invoke("optimizer:run-updates-batch", packageIds),
  },
  sentinela: {
    explainFinding: (finding) => ipcRenderer.invoke("sentinela:explain-finding", finding),
    summarizeBatch: (findings) => ipcRenderer.invoke("sentinela:summarize-batch", findings),
    clearCache: () => ipcRenderer.invoke("sentinela:clear-cache"),
  },
  eventBus: {
    emit: (topic, data, meta) => ipcRenderer.invoke("event-bus:emit", { topic, data, meta }),
    subscribe: (topics, callback) => {
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const channel = `event-bus:event:${subId}`;
      const handler = (_e, evt) => callback(evt);
      ipcRenderer.on(channel, handler);
      ipcRenderer.sendSync("event-bus:subscribe", { subId, topics: Array.isArray(topics) ? topics : [topics] });
      return {
        id: subId,
        unsubscribe: () => {
          ipcRenderer.removeListener(channel, handler);
          ipcRenderer.sendSync("event-bus:unsubscribe", { subId });
        },
      };
    },
    once: (topics, callback) => {
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const channel = `event-bus:event:${subId}`;
      const handler = (_e, evt) => {
        ipcRenderer.removeListener(channel, handler);
        ipcRenderer.sendSync("event-bus:unsubscribe", { subId });
        callback(evt);
      };
      ipcRenderer.on(channel, handler);
      const res = ipcRenderer.sendSync("event-bus:subscribe", { subId, topics: Array.isArray(topics) ? topics : [topics] });
      if (!res || !res.ok) {
        ipcRenderer.removeListener(channel, handler);
        console.warn("[orun] eventBus.once indisponível:", res && res.error);
      }
      return {
        id: subId,
        unsubscribe: () => {
          ipcRenderer.removeListener(channel, handler);
          ipcRenderer.sendSync("event-bus:unsubscribe", { subId });
        },
      };
    },
    unsubscribe: (subId) => {
      ipcRenderer.sendSync("event-bus:unsubscribe", { subId });
    },
    history: (filter) => ipcRenderer.invoke("event-bus:history", filter),
    stats: () => ipcRenderer.invoke("event-bus:stats"),
  },
});

// Forward developer:file-written IPC to CustomEvent for DeveloperIDE
ipcRenderer.on("developer:file-written", () => {
  try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
});

// Forward renderer errors/unhandled rejections to the main process logger
window.addEventListener("error", (e) => {
  try {
    ipcRenderer.send("renderer:error", `Uncaught error: ${e.message} (${e.filename}:${e.lineno}:${e.colno})`);
  } catch { /* ignore */ }
});
window.addEventListener("unhandledrejection", (e) => {
  try {
    const reason = e.reason && (e.reason.stack || e.reason.message || String(e.reason));
    ipcRenderer.send("renderer:error", `Unhandled rejection: ${reason}`);
  } catch { /* ignore */ }
});
