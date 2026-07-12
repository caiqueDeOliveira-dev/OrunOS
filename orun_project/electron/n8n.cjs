// electron/n8n.cjs
//
// Thin connector to a self-hosted or cloud n8n instance. Orun OS does NOT
// bundle or run n8n itself — n8n is a full Node/Postgres app better run on
// its own (Docker, or n8n Cloud). This module just talks to an existing
// instance over its public REST API (management) and webhooks (triggering).

const https = require("https");
const http = require("http");

function request(method, urlString, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
        timeout: 20000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 400)}`));
            return;
          }
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve({ raw: data });
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out — is the n8n URL reachable?")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** GET /api/v1/workflows — requires an n8n API key (Settings → n8n API in n8n itself). */
async function listWorkflows({ baseUrl, apiKey }) {
  if (!baseUrl) throw new Error("Missing n8n base URL.");
  if (!apiKey) throw new Error("Missing n8n API key.");
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/workflows?limit=50`;
  const result = await request("GET", url, { "X-N8N-API-KEY": apiKey });
  return (result.data || []).map((w) => ({ id: w.id, name: w.name, active: w.active }));
}

/** Confirms the base URL + API key actually work. */
async function testConnection({ baseUrl, apiKey }) {
  try {
    const workflows = await listWorkflows({ baseUrl, apiKey });
    return { ok: true, workflowCount: workflows.length };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/**
 * Triggers a workflow via its Webhook node URL (the normal way to run a
 * workflow from an external app — see the Webhook node's "Production URL").
 * `headerName`/`headerValue` are optional, for workflows using Header Auth.
 */
async function triggerWebhook({ webhookUrl, payload, headerName, headerValue }) {
  if (!webhookUrl) throw new Error("Missing webhook URL.");
  const headers = headerName && headerValue ? { [headerName]: headerValue } : {};
  return request("POST", webhookUrl, headers, payload || {});
}

module.exports = { listWorkflows, testConnection, triggerWebhook };
