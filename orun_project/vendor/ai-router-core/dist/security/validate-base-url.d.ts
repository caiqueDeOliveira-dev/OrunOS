/**
 * Exige https:// em qualquer baseUrl que vá carregar credencial — a única
 * exceção é localhost/127.0.0.1 (onde roda o Ollama e outras ferramentas
 * de dev locais, que legitimamente só falam http). Isso evita que um typo
 * em `customBaseUrl` (ex: esquecer o "s" de https) vaze a API key em
 * texto puro pela rede.
 */
export declare function isSafeBaseUrl(url: string): boolean;
export declare const UNSAFE_BASE_URL_ERROR = "baseUrl insegura \u2014 precisa ser https:// (exce\u00E7\u00E3o: localhost/127.0.0.1, onde roda o Ollama)";
