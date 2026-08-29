// electron/firecrawl.cjs
//
// Optional Firecrawl integration for the web tools (web_fetch / web_search).
// Firecrawl (https://firecrawl.dev) is a web-context API: scraping with clean
// markdown, crawling, and search. Cloud API (Bearer key) or self-hosted
// (baseUrl override). Pure Node (no electron import) so it's testable via
// vitest. When no key is configured the tools fall back to the existing
// DuckDuckGo / plain-HTTP implementations — this module is strictly additive.

const https = require("https");
const http = require("http");

const DEFAULT_BASE_URL = "https://api.firecrawl.dev";
const REQUEST_TIMEOUT_MS = 20000;

let baseUrl = DEFAULT_BASE_URL;

function setBaseUrl(url) {
  baseUrl = url || DEFAULT_BASE_URL;
}

function getBaseUrl() {
  return baseUrl;
}

function hasKey(keys) {
  return Boolean(keys && keys.firecrawl);
}

function postJson(url, body, apiKey) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return reject(new Error(`Invalid Firecrawl URL: ${err.message}`));
    }
    const lib = parsed.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "orun-os/0.6.8",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (_) {
            /* non-JSON error body */
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, json });
            return;
          }
          const detail =
            (json && (json.message || json.error)) ||
            (json && json.success === false && (json.error || "request failed")) ||
            data.slice(0, 300);
          const err = new Error(`Firecrawl HTTP ${res.statusCode}: ${detail}`);
          err.statusCode = res.statusCode;
          reject(err);
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Firecrawl request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// Scrape a single URL and return clean content. `opts` maps to Firecrawl's
// /v1/scrape body (formats, onlyMainContent, timeout, etc.).
async function scrape(urlToScrape, opts = {}, apiKey) {
  if (!urlToScrape || !apiKey) {
    return { error: "Firecrawl: url e chave são obrigatórios" };
  }
  const formats = opts.formats || ["markdown"];
  const body = {
    url: urlToScrape,
    formats,
    onlyMainContent: opts.onlyMainContent !== false,
  };
  if (opts.timeout) body.timeout = opts.timeout;
  if (opts.limit) body.limit = opts.limit;
  if (opts.actions) body.actions = opts.actions;
  if (opts.location) body.location = opts.location;

  let json;
  try {
    const res = await postJson(`${baseUrl}/v1/scrape`, body, apiKey);
    json = res.json;
  } catch (err) {
    return { error: err.message };
  }
  if (!json || json.success === false) {
    return { error: `Firecrawl scrape falhou: ${(json && json.error) || "resposta inesperada"}` };
  }
  const d = json.data || {};
  return {
    ok: true,
    markdown: d.markdown || "",
    html: d.html || "",
    rawHtml: d.rawHtml || "",
    text: d.text || "",
    title: d.metadata && d.metadata.title,
    description: d.metadata && d.metadata.description,
    url: d.metadata && d.metadata.url,
    engine: "firecrawl",
  };
}

// Search the web and return ranked results with snippets.
async function search(query, opts = {}, apiKey) {
  if (!query || !apiKey) {
    return { error: "Firecrawl: query e chave são obrigatórios" };
  }
  const body = { query, limit: opts.limit || 5 };
  if (opts.country) body.country = opts.country;
  if (opts.lang) {
    body.lang = opts.lang;
  } else if (Array.isArray(opts.langs) && opts.langs.length) {
    // v1 aceita apenas `lang` (string). Mantém compatibilidade com `langs:[]`.
    body.lang = opts.langs[0];
  } else if (typeof opts.langs === "string") {
    body.lang = opts.langs;
  }

  let json;
  try {
    const res = await postJson(`${baseUrl}/v1/search`, body, apiKey);
    json = res.json;
  } catch (err) {
    return { error: err.message };
  }
  if (!json || json.success === false) {
    return { error: `Firecrawl search falhou: ${(json && json.error) || "resposta inesperada"}` };
  }
  const data = json.data;
  // v1 retorna `data` como array direto de resultados (não { results: [...] }).
  const rows = Array.isArray(data) ? data : ((data && data.results) || []);
  const results = rows.map((r) => ({
    title: r.title || "",
    url: r.url || "",
    description: r.description || (r.metadata && r.metadata.description) || "",
  }));
  const total = Array.isArray(data) ? results.length : ((data && data.total) || results.length);
  return { results, query, engine: "firecrawl", total };
}

module.exports = { scrape, search, hasKey, setBaseUrl, getBaseUrl, DEFAULT_BASE_URL };
