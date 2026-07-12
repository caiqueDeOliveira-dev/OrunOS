// electron/image-3d.cjs
//
// Image / 3D Designer agent — Fal.ai (FLUX/SD), Tripo (3D), ComfyUI (local SD).
// Provides: generateImage, generate3DModel, listComfyUIWorkflows, testConnection.

const path = require("path");
const fs = require("fs");
const os = require("os");

// ── Fal.ai ─────────────────────────────────────────────────────────────

let fal;
try {
  fal = require("@fal-ai/client").fal;
} catch {
  // @fal-ai/client not available
}

const FAL_MODELS = [
  { id: "fal-ai/flux/schnell", name: "FLUX Schnell", type: "image", speed: "fast", free: false },
  { id: "fal-ai/flux/dev", name: "FLUX Dev", type: "image", speed: "medium", free: false },
  { id: "fal-ai/flux/pro", name: "FLUX Pro", type: "image", speed: "slow", free: false },
  { id: "fal-ai/flux-pro/v1.1-ultra", name: "FLUX Pro Ultra (2K)", type: "image", speed: "slow", free: false },
  { id: "fal-ai/flux-pro/kontext", name: "FLUX Kontext (Edit)", type: "image", speed: "medium", free: false },
  { id: "fal-ai/stable-diffusion-v3-medium", name: "SD v3 Medium", type: "image", speed: "medium", free: false },
  { id: "fal-ai/stable-diffusion-xl", name: "SDXL", type: "image", speed: "medium", free: false },
];

const TRIPO_MODELS = [
  { id: "text-to-3d", name: "Text to 3D", type: "3d" },
  { id: "image-to-3d", name: "Image to 3D", type: "3d" },
];

/**
 * Generate an image via Fal.ai.
 * @param {object} opts
 * @param {string} opts.prompt - Text prompt
 * @param {string} [opts.model="fal-ai/flux/schnell"] - Model ID
 * @param {string} [opts.imageSize="landscape_16_9"] - Image size
 * @param {number} [opts.numImages=1] - Number of images
 * @param {string} apiKey - Fal.ai API key
 * @returns {Promise<{images: Array<{url: string, width: number, height: number}>, model: string}>}
 */
async function generateImage({ prompt, model = "fal-ai/flux/schnell", imageSize = "landscape_16_9", numImages = 1 }, apiKey) {
  if (!fal) throw new Error("Fal.ai client not installed. Run: npm install @fal-ai/client");
  if (!apiKey) throw new Error("Fal.ai API key not configured. Set it in Settings → API Keys.");

  fal.config({ credentials: apiKey });

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: imageSize,
      num_images: numImages,
    },
  });

  return {
    images: (result.data?.images || []).map((img) => ({
      url: img.url,
      width: img.width || 0,
      height: img.height || 0,
    })),
    model,
  };
}

/**
 * Generate a 3D model via Tripo (REST API).
 * @param {object} opts
 * @param {string} opts.prompt - Text prompt for 3D generation
 * @param {string} [opts.type="text-to-3d"] - Generation type
 * @param {boolean} [opts.texture=true] - Generate texture
 * @param {string} apiKey - Tripo API key
 * @returns {Promise<{modelUrl: string, taskId: string}>}
 */
async function generate3DModel({ prompt, type = "text-to-3d", texture = true }, apiKey) {
  if (!apiKey) throw new Error("Tripo API key not configured. Set it in Settings → API Keys.");

  const endpoint = type === "image-to-3d"
    ? "https://openapi.tripo3d.ai/v2/openapi/task"
    : "https://openapi.tripo3d.ai/v2/openapi/task";

  const body = type === "image-to-3d"
    ? { type: "image_to_model", file: { type: "jpg", url: prompt } }
    : { type: "text_to_model", prompt };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Tripo API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const taskId = data.data?.task_id || "";

  // Poll for completion (max 5 minutes)
  const statusUrl = `https://openapi.tripo3d.ai/v2/openapi/task/${taskId}`;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusResp = await fetch(statusUrl, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const statusData = await statusResp.json();
    const status = statusData.data?.status;
    if (status === "success") {
      return {
        modelUrl: statusData.data?.output?.model || "",
        taskId,
        thumbnail: statusData.data?.output?.thumbnail || "",
      };
    }
    if (status === "failed") {
      throw new Error(`Tripo generation failed: ${statusData.data?.message || "unknown error"}`);
    }
  }
  throw new Error("Tripo generation timed out (5 minutes)");
}

/**
 * Submit a workflow to a local ComfyUI instance.
 * @param {object} opts
 * @param {string} opts.workflowJson - ComfyUI workflow JSON (API format)
 * @param {string} [opts.baseUrl="http://localhost:8188"] - ComfyUI server URL
 * @returns {Promise<{promptId: string}>}
 */
async function submitComfyUIWorkflow({ workflowJson, baseUrl = "http://localhost:8188" }) {
  const resp = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflowJson }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ComfyUI error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  return { promptId: data.prompt_id };
}

/**
 * Poll ComfyUI for workflow results.
 * @param {string} promptId
 * @param {string} [baseUrl="http://localhost:8188"]
 * @returns {Promise<{images: Array<{filename: string, url: string}>}>}
 */
async function getComfyUIResults(promptId, baseUrl = "http://localhost:8188") {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const resp = await fetch(`${baseUrl}/history/${promptId}`);
    if (!resp.ok) continue;
    const data = await resp.json();
    const entry = data[promptId];
    if (!entry) continue;
    if (entry.status?.completed === false) continue;

    const images = [];
    const outputs = entry.outputs || {};
    for (const nodeId of Object.keys(outputs)) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput.images) {
        for (const img of nodeOutput.images) {
          images.push({
            filename: img.filename,
            url: `${baseUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`,
          });
        }
      }
    }
    if (images.length > 0) return { images };
  }
  throw new Error("ComfyUI workflow timed out");
}

/**
 * Test ComfyUI connection.
 * @param {string} [baseUrl="http://localhost:8188"]
 * @returns {Promise<{ok: boolean, version?: string, error?: string}>}
 */
async function testComfyUIConnection(baseUrl = "http://localhost:8188") {
  try {
    const resp = await fetch(`${baseUrl}/system_stats`);
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const data = await resp.json();
    return { ok: true, version: data.system?.comfyui_version || "unknown" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * List ComfyUI system info (available nodes, VRAM, etc.)
 */
async function getComfyUISystemStats(baseUrl = "http://localhost:8188") {
  try {
    const resp = await fetch(`${baseUrl}/system_stats`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

module.exports = {
  generateImage,
  generate3DModel,
  submitComfyUIWorkflow,
  getComfyUIResults,
  testComfyUIConnection,
  getComfyUISystemStats,
  FAL_MODELS,
  TRIPO_MODELS,
};
