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

const ENGINES = ["browser", "whisper"];

function req(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === "https:" ? https : http;
    const payload = body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;
    const request = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: { ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}), ...headers },
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

  const result = await req("POST", `${baseUrl}/v1/audio/transcriptions`, {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": body.length,
  }, body);

  const parsed = JSON.parse(result.toString("utf8"));
  return { text: parsed.text || "" };
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

module.exports = { ENGINES, transcribeWhisper, testWhisperConnection };
