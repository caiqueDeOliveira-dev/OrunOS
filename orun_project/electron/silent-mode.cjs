// silent-mode.cjs
// Modo de execução silenciosa: quando o usuário pede uma AÇÃO DIRETA e o agente a
// executa com sucesso via tool, ele responde apenas com o marcador ORUN_SILENT —
// o app então não fala (TTS) nem mostra texto de resposta no chat.

const SILENT_MARKER = "[ORUN_SILENT]";

/**
 * True quando o texto final do agente é apenas o marcador de execução silenciosa
 * (tolerando code fences/whitespace em volta).
 * @param {string|undefined|null} text
 * @returns {boolean}
 */
function isSilentReply(text) {
  if (!text) return false;
  const normalized = String(text).replace(/```/g, "").trim();
  return normalized === SILENT_MARKER;
}

/**
 * Bloco de instrução do system prompt para todos os agentes/prompts.
 * @returns {string}
 */
function silentPromptBlock() {
  return (
    "\n\nEXECUCAO SILENCIOSA (IMPORTANTE):\n" +
    "- Quando o usuario pedir uma ACAO DIRETA e voce executar com sucesso via ferramenta (ex.: pular/pausar/tocar musica no Spotify, ajustar volume, abrir um app, criar lembrete/agendamento, enviar mensagem/email, publicar conteudo, acionar dispositivo), NAO escreva texto de confirmacao e NAO narre o que esta fazendo.\n" +
    "- Apos executar a acao com sucesso, responda APENAS com o marcador exato: " + SILENT_MARKER + " (sem aspas e sem texto ao redor).\n" +
    "- Se a acao FALHOU, explique o erro normalmente (nao use o marcador).\n" +
    "- Se o pedido for uma PERGUNTA, ANALISE, CONVERSA ou pedir informacao/explicacao, responda normalmente — nao use o marcador.\n" +
    "- Use o marcador SOMENTE quando for um comando de acao direta que foi realmente executado."
  );
}

module.exports = { SILENT_MARKER, isSilentReply, silentPromptBlock };
