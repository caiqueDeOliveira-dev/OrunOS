// electron/provider-health.cjs
//
// Provider health monitoring for Orun OS.
// Periodically pings providers and tracks status for smart routing.

const https = require("https");
const http = require("http");
const log = require("electron-log");

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_MS = 8000;

const PROVIDERS = {
  groq: { url: "https://api.groq.com/openai/v1/models", needsKey: true },
  openrouter: { url: "https://openrouter.ai/api/v1/models", needsKey: true },
  github: { url: "https://models.github.ai/inference/models", needsKey: true },
  opencodezen: { url: "https://opencode.ai/zen/v1/models", needsKey: true },
  ollama: { url: "http://localhost:11434/api/tags", needsKey: false },
};

// Status store: { provider: { status: "up"|"down"|"unknown", latencyMs: number, lastCheck: Date, error: string|null, uptime5m: number } }
const status = {};
for (const name of Object.keys(PROVIDERS)) {
  status[name] = { status: "unknown", latencyMs: 0, lastCheck: null, error: null, recentResults: [] };
}

let timer = null;

async function pingProvider(name, apiKey) {
  const def = PROVIDERS[name];
  if (!def) return;
  
  const start = Date.now();
  return new Promise((resolve) => {
    const url = new URL(def.url);
    const lib = url.protocol === "https:" ? https : http;
    const headers = { "User-Agent": "OrunOS-HealthCheck/1.0" };
    if (def.needsKey && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "GET",
      headers,
      timeout: TIMEOUT_MS,
    }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        const latencyMs = Date.now() - start;
        const isUp = res.statusCode >= 200 && res.statusCode < 400;
        resolve({ up: isUp, latencyMs, error: isUp ? null : `HTTP ${res.statusCode}` });
      });
    });
    
    req.on("timeout", () => {
      req.destroy();
      resolve({ up: false, latencyMs: Date.now() - start, error: "Timeout" });
    });
    
    req.on("error", (err) => {
      resolve({ up: false, latencyMs: Date.now() - start, error: err.message });
    });
    
    req.end();
  });
}

async function checkAll(getApiKey) {
  const checks = Object.keys(PROVIDERS).map(async (name) => {
    const apiKey = getApiKey?.(name) || "";
    const result = await pingProvider(name, apiKey);
    const s = status[name];
    s.recentResults.push(result.up);
    if (s.recentResults.length > 12) s.recentResults.shift(); // keep last hour
    s.status = result.up ? "up" : "down";
    s.latencyMs = result.latencyMs;
    s.lastCheck = new Date();
    s.error = result.error;
    s.uptime5m = s.recentResults.length > 0
      ? Math.round((s.recentResults.filter(Boolean).length / s.recentResults.length) * 100)
      : 0;
  });
  await Promise.allSettled(checks);
  log.info("[provider-health] checked all providers:", Object.entries(status).map(([k, v]) => `${k}:${v.status}(${v.latencyMs}ms)`).join(", "));
}

function startPeriodic(getApiKey) {
  if (timer) return;
  checkAll(getApiKey); // immediate first check
  timer = setInterval(() => checkAll(getApiKey), CHECK_INTERVAL_MS);
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
}

function getStatus() {
  const result = {};
  for (const [name, s] of Object.entries(status)) {
    result[name] = {
      status: s.status,
      latencyMs: s.latencyMs,
      lastCheck: s.lastCheck?.toISOString() || null,
      error: s.error,
      uptime5m: s.uptime5m,
    };
  }
  return result;
}

function getBestProvider(preferredOrder, getApiKey) {
  // Returns the first healthy provider from the preferred order
  for (const name of preferredOrder) {
    const s = status[name];
    if (s && (s.status === "up" || s.status === "unknown")) {
      return name;
    }
  }
  return preferredOrder[0]; // fallback to first regardless
}

module.exports = { startPeriodic, stop, checkAll, getStatus, getBestProvider, pingProvider };
