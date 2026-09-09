/**
 * Sanitização defensiva: telemetria NUNCA deve carregar secrets.
 * Roda antes de qualquer AgentErrorPayload sair do processo local,
 * seguindo o princípio "Secrets via abstração" do orun-secrets skill.
 */

const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/g, // OpenAI-style keys
  /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWT-like
  /(password|senha|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi,
];

export function sanitizeMessage(message: string, maxLength = 500): string {
  let clean = message;
  for (const pattern of SECRET_PATTERNS) {
    clean = clean.replace(pattern, "[REDACTED]");
  }
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
}

export function sanitizeError(error: unknown): {
  errorCode: string;
  sanitizedMessage: string;
} {
  if (error instanceof Error) {
    return {
      errorCode: error.name || "UnknownError",
      sanitizedMessage: sanitizeMessage(error.message),
    };
  }
  return {
    errorCode: "UnknownError",
    sanitizedMessage: sanitizeMessage(String(error)),
  };
}
