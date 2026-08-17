"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNSAFE_BASE_URL_ERROR = void 0;
exports.isSafeBaseUrl = isSafeBaseUrl;
/**
 * Exige https:// em qualquer baseUrl que vá carregar credencial — a única
 * exceção é localhost/127.0.0.1 (onde roda o Ollama e outras ferramentas
 * de dev locais, que legitimamente só falam http). Isso evita que um typo
 * em `customBaseUrl` (ex: esquecer o "s" de https) vaze a API key em
 * texto puro pela rede.
 */
function isSafeBaseUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return false;
    }
    if (parsed.protocol === "https:")
        return true;
    if (parsed.protocol === "http:") {
        const host = parsed.hostname;
        return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local");
    }
    return false;
}
exports.UNSAFE_BASE_URL_ERROR = "baseUrl insegura — precisa ser https:// (exceção: localhost/127.0.0.1, onde roda o Ollama)";
//# sourceMappingURL=validate-base-url.js.map