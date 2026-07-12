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
    testConnection: (settings) => ipcRenderer.invoke("ai:test-connection", settings),
    listOllamaModels: (baseUrl) => ipcRenderer.invoke("ai:list-ollama-models", baseUrl),
    listCloudModels: (provider) => ipcRenderer.invoke("ai:list-cloud-models", provider),
    knownFreeModels: () => ipcRenderer.invoke("ai:known-free-models"),
    modelCatalog: () => ipcRenderer.invoke("ai:model-catalog"),
    providers: () => ipcRenderer.invoke("ai:providers"),
    usageToday: () => ipcRenderer.invoke("ai:usage-today"),
  },
  settings: {
    get: (key) => ipcRenderer.invoke("settings:get", key),
    set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
    setApiKey: (slot, value) => ipcRenderer.invoke("settings:set-api-key", slot, value),
    hasApiKey: (slot) => ipcRenderer.invoke("settings:has-api-key", slot),
  },
  conversations: {
    list: (agent) => ipcRenderer.invoke("conversations:list", agent),
    create: (title, agent) => ipcRenderer.invoke("conversations:create", title, agent),
    messages: (conversationId) => ipcRenderer.invoke("conversations:messages", conversationId),
    addMessage: (conversationId, message) => ipcRenderer.invoke("conversations:add-message", conversationId, message),
    remove: (conversationId) => ipcRenderer.invoke("conversations:delete", conversationId),
    truncateFrom: (conversationId, messageId) => ipcRenderer.invoke("conversations:truncate-from", conversationId, messageId),
  },
  n8n: {
    listWorkflows: () => ipcRenderer.invoke("n8n:list-workflows"),
    testConnection: (cfg) => ipcRenderer.invoke("n8n:test-connection", cfg),
    triggerWebhook: (args) => ipcRenderer.invoke("n8n:trigger-webhook", args),
  },
  app: {
    setRunInBackground: (value) => ipcRenderer.invoke("app:set-run-in-background", value),
    checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
    installUpdate: () => ipcRenderer.invoke("app:install-update"),
    onUpdateStatus: (callback) => {
      const handler = (_e, status) => callback(status);
      ipcRenderer.on("app:update-status", handler);
      return () => ipcRenderer.removeListener("app:update-status", handler);
    },
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
  },
  finance: {
    getDaily: (date) => ipcRenderer.invoke("finance:get-daily", date),
  },
  health: {
    getDaily: (date) => ipcRenderer.invoke("health:get-daily", date),
  },
  developer: {
    getReviews: (date) => ipcRenderer.invoke("developer:get-reviews", date),
  },
  teacher: {
    getProgress: (date) => ipcRenderer.invoke("teacher:get-progress", date),
  },
  whatsapp: {
    connect: () => ipcRenderer.invoke("whatsapp:connect"),
    disconnect: () => ipcRenderer.invoke("whatsapp:disconnect"),
    status: () => ipcRenderer.invoke("whatsapp:status"),
    sendTest: (jid, text) => ipcRenderer.invoke("whatsapp:send-test", { jid, text }),
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
  schedules: {
    get: () => ipcRenderer.invoke("schedules:get"),
    set: (agentName, cfg) => ipcRenderer.invoke("schedules:set", agentName, cfg),
  },
});
