// electron/error-messages.cjs
//
// User-friendly error messages.
// Translates technical errors into human-readable Portuguese.

const ERROR_MESSAGES = {
  // API/Provider errors
  "HTTP 401": "API key inválida. Verifique sua chave no Settings.",
  "HTTP 403": "Acesso negado. Sua API key não tem permissão.",
  "HTTP 429": "Muitos requistos. Aguarde alguns segundos e tente novamente.",
  "HTTP 500": "Erro interno do servidor. Tente outro provider.",
  "HTTP 502": "Serviço temporariamente indisponível. Tente novamente.",
  "HTTP 503": "Serviço em manutenção. Tente outro provider.",
  "ECONNRESET": "Conexão perdida. Verifique sua internet.",
  "ETIMEDOUT": "Tempo esgotado. Servidor não respondeu.",
  "ENOTFOUND": "Servidor não encontrado. Verifique sua internet.",

  // Tool errors
  "TOOL_TIMEOUT": "Ferramenta demorou demais. Tente uma pergunta mais simples.",
  "SANDBOX_VIOLATION": "Acesso negado por segurança.",
  "SQL_INJECTION": "Entrada inválida detectada.",
  "SHELL_INJECTION": "Comando bloqueado por segurança.",

  // Database errors
  "SQLITE_CORRUPT": "Banco de dados corrompido. Reinicie o app.",
  "SQLITE_LOCKED": "Banco de dados bloqueado. Feche outras instâncias.",
  "SQLITE_FULL": "Espaço em disco insuficiente.",

  // File errors
  "ENOENT": "Arquivo não encontrado.",
  "EACCES": "Sem permissão para acessar o arquivo.",
  "EMFILE": "Muitos arquivos abertos. Feche outros programas.",
  "ENOSPC": "Espaço em disco insuficiente.",

  // Network errors
  "NETWORK_ERROR": "Erro de rede. Verifique sua conexão.",
  "DNS_ERROR": "Erro de DNS. Verifique sua internet.",
  "SSL_ERROR": "Erro de SSL. Tente novamente.",

  // Generic
  "UNKNOWN": "Erro desconhecido. Tente novamente.",
  "TIMEOUT": "Operação demorou demais. Tente novamente.",
  "ABORTED": "Operação cancelada.",
};

function getErrorMessage(error) {
  if (!error) return ERROR_MESSAGES.UNKNOWN;

  const message = typeof error === "string" ? error : error.message || String(error);

  // Check exact matches
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(key)) {
      return value;
    }
  }

  // Check for HTTP status codes
  const httpMatch = message.match(/HTTP\s*(\d{3})/);
  if (httpMatch) {
    const code = parseInt(httpMatch[1]);
    if (code >= 400 && code < 500) {
      return `Erro do cliente (${code}). Verifique sua configuração.`;
    }
    if (code >= 500) {
      return `Erro do servidor (${code}). Tente outro provider.`;
    }
  }

  // Check for common patterns
  if (message.includes("timeout") || message.includes("timed out")) {
    return ERROR_MESSAGES.TIMEOUT;
  }
  if (message.includes("network") || message.includes("fetch")) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (message.includes("dns") || message.includes("resolve")) {
    return ERROR_MESSAGES.DNS_ERROR;
  }
  if (message.includes("ssl") || message.includes("certificate")) {
    return ERROR_MESSAGES.SSL_ERROR;
  }

  // Return original message if no match found
  return message;
}

function getErrorTitle(error) {
  const message = typeof error === "string" ? error : error.message || String(error);

  if (message.includes("HTTP 401") || message.includes("HTTP 403")) {
    return "Autenticação falhou";
  }
  if (message.includes("HTTP 429")) {
    return "Limite atingido";
  }
  if (message.includes("ECONNRESET") || message.includes("ETIMEDOUT")) {
    return "Conexão perdida";
  }
  if (message.includes("SQLITE")) {
    return "Erro no banco de dados";
  }
  if (message.includes("ENOENT") || message.includes("EACCES")) {
    return "Arquivo não encontrado";
  }
  if (message.includes("SANDBOX") || message.includes("INJECTION")) {
    return "Acesso bloqueado";
  }

  return "Erro";
}

module.exports = { getErrorMessage, getErrorTitle, ERROR_MESSAGES };
