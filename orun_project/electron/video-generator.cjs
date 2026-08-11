// electron/video-generator.cjs
//
// MiniMax-H3 video generation (Creator agent) — API v2.
// Async task-based: POST /v2/video_generation → task_id → poll
// GET /v2/query/video_generation/{task_id} until succeeded.
//
// Scenarios (via the multimodal `content` array):
//   - text-to-video       : [{ type: "text", text }]
//   - image-to-video      : text + image_url (role first_frame / last_frame)
//   - reference-to-video  : text + reference_image / reference_video / reference_audio
//
// Docs: https://platform.minimax.io/docs/api-reference/video-generation-v2-create
// Auth : Authorization: Bearer <API key>

const DEFAULT_MINIMAX_URL = "https://api.minimax.io";

const MINIMAX_VIDEO_MODELS = [
  { id: "MiniMax-H3", name: "MiniMax-H3", speed: "slow", free: false },
];

const H3_RESOLUTIONS = ["768P", "2K"];
const H3_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const H3_RATIOS = ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

// t2va (text-only) does NOT accept `adaptive` — ratio is required.
const H3_T2VA_RATIOS = ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

const DEFAULT_POLL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // video gen is slow (2K can take minutes)

function buildError(resp, body) {
  let detail = "";
  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    detail = parsed?.error?.message || parsed?.message || "";
  } catch { /* non-JSON error body */ }
  return new Error(`MiniMax-H3 error (${resp.status}): ${detail || body || "unknown error"}`);
}

// Timeout helper — race-based, no AbortSignal, so it works under both the
// Electron main process and the jsdom test environment (where the global
// AbortSignal is a different realm than the one undici's fetch validates).
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error(`MiniMax-H3 request timed out after ${ms}ms`)), ms);
      timer.unref?.();
    }),
  ]);
}

/**
 * Create a video generation task (async — returns a task_id to poll).
 * @param {object} opts
 * @param {string} opts.prompt - Text prompt (required, ≤ 7000 chars)
 * @param {string} [opts.model="MiniMax-H3"]
 * @param {string} [opts.resolution="768P"] - "768P" | "2K"
 * @param {number} [opts.duration=5] - 4-15 seconds
 * @param {string} [opts.ratio="16:9"] - "adaptive" | "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16"
 * @param {string} [opts.firstFrameUrl] - Image URL for first-frame (image-to-video)
 * @param {string} [opts.lastFrameUrl] - Image URL for last-frame (image-to-video)
 * @param {string[]} [opts.referenceImageUrls] - Reference images (≤ 9)
 * @param {string[]} [opts.referenceVideoUrls] - Reference videos (≤ 3, 2-15s each)
 * @param {string[]} [opts.referenceAudioUrls] - Reference audio clips (≤ 3, 2-15s each)
 * @param {string} [opts.callbackUrl] - Optional task status webhook (must answer `challenge`)
 * @param {string} apiKey - MiniMax API key
 * @param {string} [baseUrl=DEFAULT_MINIMAX_URL]
 * @returns {Promise<{taskId: string, model: string}>}
 */
async function generateVideo(opts, apiKey, baseUrl = DEFAULT_MINIMAX_URL) {
  if (!apiKey) throw new Error("MiniMax API key not configured. Set it in Settings → API Keys.");
  const prompt = (opts.prompt || "").trim();
  if (!prompt) throw new Error("MiniMax-H3 requires a non-empty text prompt.");

  const content = [{ type: "text", text: prompt }];

  const hasReference =
    (opts.referenceImageUrls && opts.referenceImageUrls.length) ||
    (opts.referenceVideoUrls && opts.referenceVideoUrls.length) ||
    (opts.referenceAudioUrls && opts.referenceAudioUrls.length);

  const hasFrames = !!(opts.firstFrameUrl || opts.lastFrameUrl);
  if (hasFrames && hasReference) {
    throw new Error("MiniMax-H3: image-to-video (first/last frame) and reference-to-video are mutually exclusive.");
  }

  if (opts.firstFrameUrl) content.push({ type: "image_url", image_url: { url: opts.firstFrameUrl }, role: "first_frame" });
  if (opts.lastFrameUrl) content.push({ type: "image_url", image_url: { url: opts.lastFrameUrl }, role: "last_frame" });
  for (const url of opts.referenceImageUrls || []) content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
  for (const url of opts.referenceVideoUrls || []) content.push({ type: "video_url", video_url: { url }, role: "reference_video" });
  for (const url of opts.referenceAudioUrls || []) content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" });

  const resolution = H3_RESOLUTIONS.includes(opts.resolution) ? opts.resolution : "768P";
  const duration = H3_DURATIONS.includes(opts.duration) ? opts.duration : 5;

  // t2va requires a concrete ratio; i2va/r2va default to `adaptive`.
  let ratio = opts.ratio;
  if (!hasFrames && !hasReference) {
    ratio = ratio || "16:9";
    if (!H3_T2VA_RATIOS.includes(ratio)) ratio = "16:9";
  } else if (hasFrames) {
    ratio = "adaptive";
  } else if (ratio === undefined) {
    ratio = "adaptive";
  } else if (!H3_RATIOS.includes(ratio)) {
    ratio = "adaptive";
  }

  const body = { model: opts.model || "MiniMax-H3", content, resolution, duration, ratio };
  if (opts.callbackUrl) body.callback_url = opts.callbackUrl;

  const resp = await withTimeout(fetch(`${baseUrl}/v2/video_generation`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }), 30000);

  if (!resp.ok) {
    const raw = await resp.text();
    throw buildError(resp, raw);
  }

  const data = await resp.json();
  const taskId = data.task_id || "";
  if (!taskId) throw new Error("MiniMax-H3: create task returned no task_id.");
  return { taskId, model: opts.model || "MiniMax-H3" };
}

/**
 * Query a single video generation task.
 * @param {string} taskId
 * @param {string} apiKey
 * @param {string} [baseUrl=DEFAULT_MINIMAX_URL]
 * @returns {Promise<{id, model, status, content, resolution, duration, usage, ratio, task_type, error}>}
 */
async function queryVideoTask(taskId, apiKey, baseUrl = DEFAULT_MINIMAX_URL) {
  if (!apiKey) throw new Error("MiniMax API key not configured. Set it in Settings → API Keys.");
  const resp = await withTimeout(fetch(`${baseUrl}/v2/query/video_generation/${encodeURIComponent(taskId)}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  }), 30000);
  if (!resp.ok) {
    const raw = await resp.text();
    throw buildError(resp, raw);
  }
  const data = await resp.json();
  return data.task || data;
}

/**
 * Poll a video task until it succeeds, fails, or times out.
 * @param {string} taskId
 * @param {string} apiKey
 * @param {object} [opts]
 * @param {number} [opts.pollMs=DEFAULT_POLL_MS]
 * @param {number} [opts.timeoutMs=DEFAULT_TIMEOUT_MS]
 * @param {string} [opts.baseUrl]
 * @returns {Promise<{ok: boolean, videoUrl?: string, task?: object, error?: string}>}
 */
async function waitForVideo(taskId, apiKey, { pollMs = DEFAULT_POLL_MS, timeoutMs = DEFAULT_TIMEOUT_MS, baseUrl } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let task;
    try {
      task = await queryVideoTask(taskId, apiKey, baseUrl);
    } catch (err) {
      // Transient network/5xx — keep polling instead of failing the whole wait.
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }
    const status = task?.status;
    if (status === "succeeded") {
      const videoUrl = task?.content?.url || "";
      if (!videoUrl) {
        return { ok: false, task, error: "MiniMax-H3 task succeeded but returned no video URL." };
      }
      return { ok: true, videoUrl, task };
    }
    if (status === "failed" || status === "cancelled") {
      const msg = task?.error?.message || `task ${status}`;
      return { ok: false, task, error: `MiniMax-H3 generation ${status}: ${msg}` };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return { ok: false, error: `MiniMax-H3 task timed out after ${Math.round(timeoutMs / 1000)}s. Task may still be running — query it again with the task_id.` };
}

/**
 * End-to-end helper: create + poll. Returns the video URL when done.
 * @returns {Promise<{ok: boolean, videoUrl?: string, taskId?: string, error?: string}>}
 */
async function generateVideoAndWait(opts, apiKey, waitOpts = {}) {
  const { taskId, model } = await generateVideo(opts, apiKey, waitOpts.baseUrl);
  const res = await waitForVideo(taskId, apiKey, waitOpts);
  return { ...res, taskId, model };
}

/**
 * Test connectivity / auth with the MiniMax API.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function testConnection(apiKey, baseUrl = DEFAULT_MINIMAX_URL) {
  if (!apiKey) return { ok: false, error: "Missing MiniMax API key" };
  try {
  const resp = await withTimeout(fetch(`${baseUrl}/v2/query/video_generation/0`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  }), 15000);
    // 401 = bad key; 400 (invalid task) proves auth passed.
    if (resp.status === 401) return { ok: false, error: "Invalid MiniMax API key" };
    if (resp.ok || resp.status === 400 || resp.status === 404) return { ok: true };
    return { ok: false, error: `HTTP ${resp.status}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  generateVideo,
  queryVideoTask,
  waitForVideo,
  generateVideoAndWait,
  testConnection,
  DEFAULT_MINIMAX_URL,
  MINIMAX_VIDEO_MODELS,
  H3_RESOLUTIONS,
  H3_DURATIONS,
  H3_RATIOS,
};
