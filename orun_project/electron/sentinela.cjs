// electron/sentinela.cjs — Orun Sentinela Agent (integração desktop)
// Traduz achados técnicos do Orun Shield em explicações claras para o
// usuário. Expõe IPC para o renderer chamar explainFinding / summarizeBatch.

const { ipcMain } = require("electron");
const { SentinelaAgent } = require("@orun/sentinela-agent");
const logger = require("./logger.cjs");

const SentinelaIpcChannel = {
  EXPLAIN_FINDING: "sentinela:explain-finding",
  SUMMARIZE_BATCH: "sentinela:summarize-batch",
  CLEAR_CACHE: "sentinela:clear-cache",
};

let agent = null;

function initializeSentinela(aiRouterConfig) {
  if (agent) return;

  // O SentinelaAgent aceita qualquer AiProviderConfig (ollama, openai, anthropic).
  // Para o desktop, usamos Ollama local como padrão — fallback determinístico se indisponível.
  const providerConfig = aiRouterConfig || { kind: "ollama", model: "llama3" };

  agent = new SentinelaAgent({ provider: providerConfig, enableCache: true });
  registerIpcHandlers();
  logger.security.info("Sentinela Agent inicializado (provider: %s)", providerConfig.kind);
}

function registerIpcHandlers() {
  ipcMain.handle(SentinelaIpcChannel.EXPLAIN_FINDING, async (_event, finding) => {
    try {
      return await agent.explainFinding(finding);
    } catch (err) {
      logger.security.error("Sentinela explainFinding erro:", err.message);
      return { findingId: finding.id, explanation: "Não foi possível gerar explicação.", generatedAt: new Date().toISOString(), isFallback: true };
    }
  });

  ipcMain.handle(SentinelaIpcChannel.SUMMARIZE_BATCH, async (_event, findings) => {
    try {
      return await agent.summarizeBatch(findings);
    } catch (err) {
      logger.security.error("Sentinela summarizeBatch erro:", err.message);
      return "Resumo indisponível no momento.";
    }
  });

  ipcMain.handle(SentinelaIpcChannel.CLEAR_CACHE, async () => {
    agent.clearCache();
    return { ok: true };
  });
}

module.exports = { initializeSentinela, SentinelaIpcChannel };
