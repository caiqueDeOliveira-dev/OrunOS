// electron/ffmpeg-utils.cjs
//
// FFmpeg helper for the audio pipeline (Orun OS).
// Falls back gracefully when ffmpeg is not on PATH.

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

let _available;
function isFfmpegAvailable() {
  if (_available !== undefined) return _available;
  try {
    const r = spawnSync("ffmpeg", ["-version"], { stdio: "ignore", timeout: 5000 });
    _available = r.status === 0;
  } catch {
    _available = false;
  }
  return _available;
}

async function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orun-ffmpeg-"));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runFfmpegToFile(args, inputBuffers = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
        return;
      }
      resolve();
    });
    for (const b of inputBuffers) child.stdin.write(b);
    child.stdin.end();
  });
}

function probeDuration(buffer) {
  return withTempDir(async (dir) => {
    const file = path.join(dir, "probe.wav");
    fs.writeFileSync(file, buffer);
    return new Promise((resolve, reject) => {
      const child = spawn(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
        { windowsHide: true }
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (c) => (stdout += c.toString()));
      child.stderr.on("data", (c) => (stderr += c.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(`ffprobe failed: ${stderr.slice(-300)}`));
        const d = parseFloat(stdout.trim());
        resolve(Number.isFinite(d) ? d : 0);
      });
    });
  });
}

/**
 * Convert any audio buffer to a WAV buffer.
 * @param {Buffer} buffer - input audio data
 * @param {object} [opts]
 * @param {number} [opts.sampleRate=16000]
 * @param {number} [opts.channels=1]
 * @returns {Promise<Buffer>} WAV buffer
 */
async function convertToWav(buffer, { sampleRate = 16000, channels = 1 } = {}) {
  return withTempDir(async (dir) => {
    const outFile = path.join(dir, "out.wav");
    await runFfmpegToFile([
      "-i", "pipe:0",
      "-ar", String(sampleRate),
      "-ac", String(channels),
      "-c:a", "pcm_s16le",
      "-f", "wav",
      outFile,
    ], [buffer]);
    return fs.readFileSync(outFile);
  });
}

/**
 * Mix multiple tracks with per-track volume into a WAV buffer.
 * @param {object} opts
 * @param {Array<{audioBase64: string, volume?: number}>} opts.tracks
 * @param {number} [opts.sampleRate=44100]
 * @param {number} [opts.channels=2]
 * @returns {Promise<{audioBase64: string, mime: string, duration: number}>}
 */
async function mixTracks({ tracks, sampleRate = 44100, channels = 2 }) {
  if (!tracks || tracks.length === 0) throw new Error("No tracks to mix");
  return withTempDir(async (dir) => {
    const inputs = [];
    const pre = [];
    for (let i = 0; i < tracks.length; i++) {
      const file = path.join(dir, `in${i}.wav`);
      fs.writeFileSync(file, Buffer.from(tracks[i].audioBase64, "base64"));
      inputs.push(file);
      const vol = tracks[i].volume ?? 1.0;
      pre.push(`[${i}:a]volume=${vol}[a${i}]`);
    }
    const amixInputs = tracks.map((_, i) => `[a${i}]`).join("");
    const filter = pre.join(";") + `;${amixInputs}amix=inputs=${tracks.length}:normalize=0:duration=longest`;
    const outFile = path.join(dir, "mix.wav");

    const args = [];
    for (const f of inputs) args.push("-i", f);
    args.push(
      "-filter_complex", filter,
      "-ar", String(sampleRate),
      "-ac", String(channels),
      "-c:a", "pcm_s16le",
      "-f", "wav",
      outFile
    );

    await runFfmpegToFile(args);
    const duration = await probeDuration(fs.readFileSync(outFile));
    return { audioBase64: fs.readFileSync(outFile).toString("base64"), mime: "audio/wav", duration };
  });
}

/**
 * Apply gain to an audio buffer.
 * @param {object} opts
 * @param {string} opts.audioBase64
 * @param {number} [opts.gain=1.0]
 * @returns {Promise<{audioBase64: string, mime: string}>}
 */
async function applyGain({ audioBase64, gain = 1.0 }) {
  const buf = Buffer.from(audioBase64, "base64");
  return withTempDir(async (dir) => {
    const outFile = path.join(dir, "gain.wav");
    await runFfmpegToFile([
      "-i", "pipe:0",
      "-af", `volume=${gain}`,
      "-c:a", "pcm_s16le",
      "-f", "wav",
      outFile,
    ], [buf]);
    return { audioBase64: fs.readFileSync(outFile).toString("base64"), mime: "audio/wav" };
  });
}

module.exports = {
  isFfmpegAvailable,
  convertToWav,
  mixTracks,
  applyGain,
  probeDuration,
};
