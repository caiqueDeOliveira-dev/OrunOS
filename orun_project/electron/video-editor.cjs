// electron/video-editor.cjs
//
// Video Editor agent — Remotion-based video rendering + project management.
// Provides: createComposition, renderVideo, listTemplates, getProjectStatus.

const path = require("path");
const fs = require("fs");
const os = require("os");

let bundle, renderMedia, selectComposition;
try {
  ({ bundle } = require("@remotion/bundler"));
  ({ renderMedia, selectComposition } = require("@remotion/renderer"));
} catch {
  // Remotion not available — module will throw on render calls
}

const REMOTION_TEMPLATES = [
  { id: "title-card", name: "Title Card", description: "Animated text title with fade-in", durationSec: 5, fps: 30 },
  { id: "slideshow", name: "Slideshow", description: "Image slideshow with transitions", durationSec: 10, fps: 30 },
  { id: "lower-third", name: "Lower Third", name2: "Lower Third Overlay", description: "Animated lower-third name graphic", durationSec: 4, fps: 30 },
  { id: "countdown", name: "Countdown", description: "5-4-3-2-1 countdown with effects", durationSec: 6, fps: 30 },
  { id: "outro", name: "Outro / End Screen", description: "Subscribe + next video end screen", durationSec: 8, fps: 30 },
  { id: "kinetic-text", name: "Kinetic Typography", description: "Animated text with motion", durationSec: 7, fps: 30 },
];

const OUTPUT_DIR = () => path.join(os.tmpdir(), "orun-video-editor");

function ensureOutputDir() {
  const dir = OUTPUT_DIR();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Bundle a Remotion entry point and render to file.
 * @param {object} opts
 * @param {string} opts.entryPoint - Path to Remotion entry file (src/index.ts)
 * @param {string} opts.compositionId - Composition ID to render
 * @param {string} opts.outputPath - Output file path (.mp4)
 * @param {string} [opts.codec="h264"] - Video codec
 * @param {number} [opts.crf=18] - Quality (lower = better)
 * @returns {Promise<{outputPath: string, durationMs: number}>}
 */
async function renderVideo({ entryPoint, compositionId, outputPath, codec = "h264", crf = 18 }) {
  if (!bundle || !renderMedia || !selectComposition) {
    throw new Error("Remotion is not installed. Run: npm install remotion @remotion/bundler @remotion/renderer");
  }
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Entry point not found: ${entryPoint}`);
  }

  const outDir = ensureOutputDir();
  const finalOutput = outputPath || path.join(outDir, `${compositionId}-${Date.now()}.mp4`);

  const start = Date.now();
  const bundleLocation = await bundle({ entryPoint, onProgress: (p) => { /* progress */ } });
  const composition = await selectComposition({ serveUrl: bundleLocation, id: compositionId });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec,
    crf,
    outputLocation: finalOutput,
  });

  return { outputPath: finalOutput, durationMs: Date.now() - start };
}

/**
 * Create a basic Remotion composition file from a template.
 * Returns the path to the generated entry point.
 */
function createComposition({ templateId, title, outputPath }) {
  const dir = ensureOutputDir();
  const id = templateId || "title-card";
  const template = REMOTION_TEMPLATES.find((t) => t.id === id) || REMOTION_TEMPLATES[0];
  const text = title || "Orun OS";

  const entryContent = `
const React = require("react");
const { Composition, AbsoluteFill, useCurrentFrame, interpolate } = require("remotion");

const MyComposition = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  return React.createElement(AbsoluteFill, {
    style: { backgroundColor: "#080808", justifyContent: "center", alignItems: "center" }
  },
    React.createElement("h1", {
      style: { color: "#F5F5F5", fontSize: 64, fontFamily: "sans-serif", opacity }
    }, "${text.replace(/"/g, '\\"')}")
  );
};

module.exports.RemotionRoot = () =>
  React.createElement(Composition, {
    id: "${id}",
    component: MyComposition,
    durationInFrames: ${(template.durationSec || 5) * (template.fps || 30)},
    fps: ${template.fps || 30},
  });
`;

  const entryPath = path.join(dir, `composition-${Date.now()}.jsx`);
  fs.writeFileSync(entryPath, entryContent, "utf-8");

  return {
    entryPoint: entryPath,
    compositionId: id,
    template: template.name,
    durationSec: template.durationSec,
    fps: template.fps,
  };
}

function listTemplates() {
  return REMOTION_TEMPLATES;
}

module.exports = {
  renderVideo,
  createComposition,
  listTemplates,
  REMOTION_TEMPLATES,
};
