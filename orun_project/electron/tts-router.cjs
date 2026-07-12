// electron/tts-router.cjs
//
// Text-to-speech router for Orun OS. Two families of engines:
//
// Cloud (need an API key, stored encrypted like the AI provider keys):
//   - elevenlabs: official REST API, has a proper "list voices" + preview_url per voice
//   - google:     Google Cloud Text-to-Speech REST API
//   - azure:      Microsoft Cognitive Services Speech (needs key + region)
//
// Local (no key — point at a server you're already running):
//   - xtts:   assumes the community "xtts-api-server" wrapper (the de facto
//             standard way people self-host XTTS v2 over HTTP)
//   - piper:  Piper has no single standard HTTP server, so this is a best-effort
//             generic connector — works with simple wrappers that accept
//             { text } and return raw audio bytes
//   - bark:   same situation as Piper — generic connector. Bark's *voice
//             presets*, however, are a fixed public list, so those are
//             hardcoded here rather than fetched from anywhere
//   - f5tts:  reference-audio voice cloning, not named voices — exposed as a
//             single "Default" pseudo-voice that defers to however the
//             local server is configured

const https = require("https");
const http = require("http");

// ── Low-level HTTP helpers ──────────────────────────────────────────────

function req(method, urlString, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const payload = body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;
    const request = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: { ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}), ...headers },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${buffer.toString("utf8").slice(0, 400)}`));
            return;
          }
          resolve({ buffer, contentType: res.headers["content-type"] || "" });
        });
      }
    );
    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function getJSON(url, headers) {
  const { buffer } = await req("GET", url, headers);
  return JSON.parse(buffer.toString("utf8"));
}
async function postJSON(url, headers, body) {
  const { buffer } = await req("POST", url, { "Content-Type": "application/json", ...headers }, body);
  return JSON.parse(buffer.toString("utf8"));
}

// ── ElevenLabs ───────────────────────────────────────────────────────────

async function elevenlabsVoices(apiKey) {
  if (!apiKey) throw new Error("Missing ElevenLabs API key.");
  const result = await getJSON("https://api.elevenlabs.io/v1/voices", { "xi-api-key": apiKey });
  return (result.voices || []).map((v) => ({ id: v.voice_id, name: v.name, previewUrl: v.preview_url || null }));
}

async function elevenlabsSynthesize(apiKey, voiceId, text) {
  if (!apiKey) throw new Error("Missing ElevenLabs API key.");
  const { buffer } = await req(
    "POST",
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    { "xi-api-key": apiKey, "Content-Type": "application/json" },
    { text, model_id: "eleven_flash_v2_5" }
  );
  return { buffer, mime: "audio/mpeg" };
}

// ── Google Cloud Text-to-Speech ───────────────────────────────────────────

async function googleVoices(apiKey) {
  if (!apiKey) throw new Error("Missing Google Cloud API key.");
  const result = await getJSON(`https://texttospeech.googleapis.com/v1/voices?key=${encodeURIComponent(apiKey)}`, {});
  return (result.voices || [])
    .filter((v) => v.languageCodes?.[0]?.startsWith("en") || v.languageCodes?.[0]?.startsWith("pt"))
    .map((v) => ({ id: v.name, name: `${v.name} (${v.languageCodes[0]})`, previewUrl: null }));
}

async function googleSynthesize(apiKey, voiceId, text) {
  if (!apiKey) throw new Error("Missing Google Cloud API key.");
  const languageCode = voiceId.split("-").slice(0, 2).join("-") || "en-US";
  const result = await postJSON(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {}, {
    input: { text },
    voice: { name: voiceId, languageCode },
    audioConfig: { audioEncoding: "MP3" },
  });
  if (!result.audioContent) throw new Error("Google TTS returned no audio.");
  return { buffer: Buffer.from(result.audioContent, "base64"), mime: "audio/mpeg" };
}

// ── Azure Cognitive Services Speech ────────────────────────────────────────

async function azureToken(apiKey, region) {
  const { buffer } = await req("POST", `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    "Ocp-Apim-Subscription-Key": apiKey,
    "Content-Type": "application/x-www-form-urlencoded",
  }, "");
  return buffer.toString("utf8");
}

async function azureVoices(apiKey, region) {
  if (!apiKey) throw new Error("Missing Azure Speech API key.");
  if (!region) throw new Error("Missing Azure region.");
  const result = await getJSON(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { "Ocp-Apim-Subscription-Key": apiKey });
  return result
    .filter((v) => v.Locale?.startsWith("en") || v.Locale?.startsWith("pt"))
    .map((v) => ({ id: v.ShortName, name: `${v.DisplayName} (${v.Locale})`, previewUrl: null }));
}

function escapeSSML(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function azureSynthesize(apiKey, region, voiceId, text) {
  if (!apiKey) throw new Error("Missing Azure Speech API key.");
  if (!region) throw new Error("Missing Azure region.");
  const token = await azureToken(apiKey, region);
  const locale = voiceId.split("-").slice(0, 2).join("-") || "en-US";
  const ssml = `<speak version='1.0' xml:lang='${locale}'><voice xml:lang='${locale}' name='${voiceId}'>${escapeSSML(text)}</voice></speak>`;
  const { buffer } = await req("POST", `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/ssml+xml",
    "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
  }, ssml);
  return { buffer, mime: "audio/mpeg" };
}

// ── Local: XTTS v2 (via the community xtts-api-server wrapper) ───────────

async function xttsVoices(baseUrl) {
  const result = await getJSON(`${baseUrl || "http://localhost:8020"}/speakers_list`, {});
  const names = Array.isArray(result) ? result : result.speakers || [];
  return names.map((name) => ({ id: name, name, previewUrl: null }));
}

async function xttsSynthesize(baseUrl, voiceId, text) {
  const { buffer, contentType } = await req("POST", `${baseUrl || "http://localhost:8020"}/tts_to_audio/`, { "Content-Type": "application/json" }, {
    text, speaker_wav: voiceId, language: "en",
  });
  return { buffer, mime: contentType || "audio/wav" };
}

// ── Local: Piper (generic — no standard server exists) ────────────────────

async function piperSynthesize(baseUrl, _voiceId, text) {
  const { buffer, contentType } = await req("POST", `${baseUrl || "http://localhost:5002"}/api/tts`, { "Content-Type": "application/json" }, { text });
  return { buffer, mime: contentType || "audio/wav" };
}

// ── Local: Bark (generic connector + Bark's fixed public presets) ────────

const BARK_PRESETS = [
  "v2/en_speaker_0", "v2/en_speaker_1", "v2/en_speaker_2", "v2/en_speaker_3", "v2/en_speaker_4",
  "v2/en_speaker_5", "v2/en_speaker_6", "v2/en_speaker_7", "v2/en_speaker_8", "v2/en_speaker_9",
  "v2/pt_speaker_0", "v2/pt_speaker_1", "v2/pt_speaker_2", "v2/pt_speaker_3",
];

function barkVoices() {
  return BARK_PRESETS.map((id) => ({ id, name: id.replace("v2/", ""), previewUrl: null }));
}

async function barkSynthesize(baseUrl, voiceId, text) {
  const { buffer, contentType } = await req("POST", `${baseUrl || "http://localhost:8001"}/generate`, { "Content-Type": "application/json" }, {
    text, voice_preset: voiceId,
  });
  return { buffer, mime: contentType || "audio/wav" };
}

// ── Local: F5-TTS (reference-audio cloning — no named voices) ────────────

function f5ttsVoices() {
  return [{ id: "default", name: "Default (server's configured reference audio)", previewUrl: null }];
}

async function f5ttsSynthesize(baseUrl, _voiceId, text) {
  const { buffer, contentType } = await req("POST", `${baseUrl || "http://localhost:7860"}/synthesize`, { "Content-Type": "application/json" }, { text });
  return { buffer, mime: contentType || "audio/wav" };
}

// ── Public API ────────────────────────────────────────────────────────────

const ENGINES = ["elevenlabs", "google", "azure", "xtts", "piper", "bark", "f5tts"];

async function listVoices(engine, cfg) {
  switch (engine) {
    case "elevenlabs": return elevenlabsVoices(cfg.apiKey);
    case "google": return googleVoices(cfg.apiKey);
    case "azure": return azureVoices(cfg.apiKey, cfg.region);
    case "xtts": return xttsVoices(cfg.baseUrl);
    case "piper": return []; // no listing endpoint — model is picked by server config
    case "bark": return barkVoices();
    case "f5tts": return f5ttsVoices();
    default: throw new Error(`Unknown TTS engine: ${engine}`);
  }
}

/** Returns { buffer, mime }. */
async function synthesize(engine, cfg, voiceId, text) {
  switch (engine) {
    case "elevenlabs": return elevenlabsSynthesize(cfg.apiKey, voiceId, text);
    case "google": return googleSynthesize(cfg.apiKey, voiceId, text);
    case "azure": return azureSynthesize(cfg.apiKey, cfg.region, voiceId, text);
    case "xtts": return xttsSynthesize(cfg.baseUrl, voiceId, text);
    case "piper": return piperSynthesize(cfg.baseUrl, voiceId, text);
    case "bark": return barkSynthesize(cfg.baseUrl, voiceId, text);
    case "f5tts": return f5ttsSynthesize(cfg.baseUrl, voiceId, text);
    default: throw new Error(`Unknown TTS engine: ${engine}`);
  }
}

module.exports = { ENGINES, listVoices, synthesize };
