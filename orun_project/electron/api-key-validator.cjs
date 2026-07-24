// electron/api-key-validator.cjs
// Validates API keys by making a lightweight test request to each provider.

const https = require("https");
const http = require("http");

const PROVIDER_ENDPOINTS = {
  groq: { url: "https://api.groq.com/openai/v1/models", method: "GET" },
  openrouter: { url: "https://openrouter.ai/api/v1/models", method: "GET" },
  github: { url: "https://models.inference.ai.azure.com", method: "GET" },
  opencodezen: { url: "https://api.opencodezen.com/v1/models", method: "GET" },
};

function validateApiKey(provider, key) {
  return new Promise((resolve) => {
    if (!provider || !key) {
      return resolve({ valid: false, error: "Provider e chave são obrigatórios" });
    }

    const config = PROVIDER_ENDPOINTS[provider.toLowerCase()];
    if (!config) {
      return resolve({ valid: false, error: `Provider desconhecido: ${provider}` });
    }

    try {
      const url = new URL(config.url);
      const mod = url.protocol === "https:" ? https : http;

      const headers = {};
      if (provider.toLowerCase() === "groq") {
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider.toLowerCase() === "openrouter") {
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider.toLowerCase() === "github") {
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider.toLowerCase() === "opencodezen") {
        headers["Authorization"] = `Bearer ${key}`;
      }

      const req = mod.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
          method: config.method,
          headers,
          timeout: 10000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              resolve({ valid: true });
            } else if (res.statusCode === 401 || res.statusCode === 403) {
              resolve({ valid: false, error: "Chave de API inválida ou sem permissão" });
            } else if (res.statusCode === 429) {
              resolve({ valid: true, warning: "Chave válida, mas atingiu o limite de taxa" });
            } else {
              resolve({ valid: false, error: `Erro ${res.statusCode}: ${data.slice(0, 200)}` });
            }
          });
        }
      );

      req.on("error", (err) => {
        resolve({ valid: false, error: `Erro de conexão: ${err.message}` });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ valid: false, error: "Timeout na validação (10s)" });
      });

      req.end();
    } catch (err) {
      resolve({ valid: false, error: `Erro interno: ${err.message}` });
    }
  });
}

module.exports = { validateApiKey };
