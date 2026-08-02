// electron/stt-router.cjs
//
// Speech-to-text router for Orun OS. Currently uses Chromium's built-in
// SpeechRecognition (which sends audio to Google). This module adds a
// local Whisper-based engine that keeps everything on-device.
//
// Local engine:
//   - whisper: connects to a local Whisper HTTP server (e.g. whisper.cpp
//     with --port, or the faster-whisper-server project). The server
//     accepts POST /transcribe with multipart audio and returns JSON.

const http = require("http");
const https = require("https");

const ENGINES = ["browser", "whisper", "groq"];

function req(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === "https:" ? https : http;
    let payload;
    let isBinary = false;
    if (body !== undefined) {
      if (Buffer.isBuffer(body)) {
        payload = body;
        isBinary = true;
      } else if (typeof body === "string") {
        payload = body;
      } else {
        payload = JSON.stringify(body);
      }
    }
    const defaultHeaders = {};
    if (payload) {
      if (!isBinary) {
        defaultHeaders["Content-Type"] = "application/json";
      }
      defaultHeaders["Content-Length"] = Buffer.byteLength(payload);
    }
    const request = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: { ...defaultHeaders, ...headers },
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
          resolve(buffer);
        });
      }
    );
    request.on("error", reject);
    request.on("timeout", () => { request.destroy(); reject(new Error("Request timed out")); });
    if (payload) request.write(payload);
    request.end();
  });
}

/**
 * Transcribe audio using a local Whisper server.
 * @param {string} baseUrl - e.g. "http://localhost:8080"
 * @param {Buffer} audioBuffer - raw audio data
 * @param {string} mimeType - e.g. "audio/webm"
 * @param {string} language - e.g. "pt", "en"
 * @returns {Promise<{ text: string }>}
 */
async function transcribeWhisper(baseUrl, audioBuffer, mimeType = "audio/webm", language = "pt") {
  // Build a multipart/form-data request manually
  const boundary = `----OrunSTT${Date.now()}`;
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("wav") ? "wav" : "ogg";
  const filename = `audio.${ext}`;

  const parts = [];
  // File part
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const fileHeader = Buffer.from(parts.join(""));
  const fileFooter = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nsmall\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n--${boundary}--\r\n`);

  const body = Buffer.concat([fileHeader, audioBuffer, fileFooter]);
  const url = `${baseUrl}/v1/audio/transcriptions`;

  try {
    const result = await req("POST", url, {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length,
    }, body);

    const text = result.toString("utf8");
    const parsed = JSON.parse(text);
    return { text: parsed.text || "" };
  } catch (err) {
    // If /v1/audio/transcriptions fails, try /transcribe (faster-whisper native)
    try {
      const altResult = await req("POST", `${baseUrl}/transcribe`, {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      }, body);
      const parsed = JSON.parse(altResult.toString("utf8"));
      return { text: parsed.text || parsed.transcription || "" };
    } catch (err2) {
      throw new Error(`STT failed: ${err.message} / ${err2.message}`);
    }
  }
}

/**
 * Check if a Whisper server is reachable.
 */
async function testWhisperConnection(baseUrl) {
  try {
    await req("GET", `${baseUrl}/health`, {});
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Transcribe audio using Groq's Whisper endpoint (distil-whisper-large-v3).
 * Fast (~1s for pt-BR) and accurate; used as a cloud fallback when the local
 * faster-whisper server is unavailable.
 * @param {string} apiKey - Groq API key (gsk-...)
 * @param {Buffer} audioBuffer - raw audio data
 * @param {string} mimeType - e.g. "audio/webm"
 * @param {string} language - e.g. "pt", "en"
 * @param {string} model - Groq model id
 * @returns {Promise<{ text: string, language?: string, duration?: number, model: string }>}
 */
async function transcribeGroq(apiKey, audioBuffer, mimeType = "audio/webm", language = "pt", model = "distil-whisper-large-v3") {
  if (!apiKey) throw new Error("Missing Groq API key.");
  const boundary = `----OrunGroqSTT${Date.now()}`;
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "mp4" : "ogg";
  const filename = `audio.${ext}`;

  const parts = [];
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const fileHeader = Buffer.from(parts.join(""));
  const fileFooter = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n` +
    `--${boundary}--\r\n`
  );

  const body = Buffer.concat([fileHeader, audioBuffer, fileFooter]);
  const buffer = await req("POST", "https://api.groq.com/openai/v1/audio/transcriptions", {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": body.length,
  }, body);

  const parsed = JSON.parse(buffer.toString("utf8"));
  if (parsed.error) throw new Error(`Groq STT error: ${parsed.error.message || JSON.stringify(parsed.error)}`);
  return {
    text: parsed.text || "",
    language: parsed.language || language,
    duration: parsed.duration,
    model: parsed.model || model,
  };
}

module.exports = { ENGINES, transcribeWhisper, transcribeGroq, testWhisperConnection };
