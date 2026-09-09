// electron/translate-client.cjs — LibreTranslate self-hosted (tradução local/privada pros agentes).
// API: GET /languages, POST /translate {q, source, target, format}. Primeiro uso de um par baixa o modelo Argos (lento, cacheia no container).

const DEFAULT_HOST = "http://localhost:5000";

let _config = { host: DEFAULT_HOST, log: null };

function init(opts = {}) {
  _config = { host: String(opts.host || DEFAULT_HOST).replace(/\/+$/, ""), log: opts.log || null };
}

function _log(...a) {
  if (_config.log?.info) _config.log.info("[translate]", ...a);
}

async function _request(path, opts) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(`${_config.host}${path}`, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`LibreTranslate timeout em ${path} (modelo baixando ou container fora)`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function languages() {
  const list = await _request("/languages");
  return (list || []).map((l) => ({ code: l.code, name: l.name }));
}

async function translate({ text, source = "auto", target, format = "text" }) {
  if (!target) throw new Error("translate: target é obrigatório");
  const t = target === "zh" ? "zh-Hans" : target;
  const body = await _request("/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source, target: t, format }),
  });
  return { translatedText: body.translatedText, detectedLanguage: body.detectedLanguage || null };
}

function isConfigured() {
  return _config.host ? true : false;
}

module.exports = { init, languages, translate, isConfigured, DEFAULT_HOST };