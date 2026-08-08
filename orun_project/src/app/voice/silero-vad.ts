/**
 * Silero VAD wrapper (browser) using @ricky0123/vad-web + onnxruntime-web.
 *
 * Silero VAD is far more accurate than the energy-based RMS VAD (trained model,
 * handles noise/echo/music). The model + worklet + ONNX WASM are served from
 * public/vad and public/onnx (dev: http via Vite; prod: custom `orun-asset://`
 * protocol registered in electron/main.cjs so fetch/addModule work over file://).
 *
 * The wrapper is additive: it only fires onSpeechStart/onSpeechEnd. The caller
 * (useVoice) falls back to the RMS VoiceActivityDetector if init fails.
 */
import { MicVAD } from "@ricky0123/vad-web";

export interface SileroVADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface SileroVADHandle {
  /** Begin listening on the provided stream. */
  start(): Promise<void>;
  /** Stop listening and release the model/worklet. Does NOT stop the stream tracks. */
  destroy(): Promise<void>;
}

function assetBasePath(): string {
  if (typeof window !== "undefined" && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    return "/vad/";
  }
  return "orun-asset://local/vad/";
}

function onnxWASMBasePath(): string {
  if (typeof window !== "undefined" && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
    return "/onnx/";
  }
  return "orun-asset://local/onnx/";
}

/**
 * Initializes a Silero VAD on the given stream, reusing the provided AudioContext.
 * Resolves with null (never throws) if the model/worklet can't be loaded.
 */
export async function createSileroVAD(
  stream: MediaStream,
  audioContext: AudioContext,
  callbacks: SileroVADCallbacks
): Promise<SileroVADHandle | null> {
  try {
    const vad = await MicVAD.new({
      model: "v5",
      baseAssetPath: assetBasePath(),
      onnxWASMBasePath: onnxWASMBasePath(),
      startOnLoad: false,
      getStream: () => Promise.resolve(stream),
      audioContext,
      onSpeechStart: () => callbacks.onSpeechStart?.(),
      onSpeechEnd: () => callbacks.onSpeechEnd?.(),
      onVADMisfire: () => {},
      onSpeechRealStart: () => {},
    });

    return {
      async start() {
        await vad.start();
      },
      async destroy() {
        try { await vad.destroy(); } catch { /* already destroyed */ }
      },
    };
  } catch (err) {
    console.warn("[silero-vad] init failed, falling back to RMS VAD:", err);
    return null;
  }
}

/** Whether Silero assets are reachable (dev server or custom protocol). */
export function sileroAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const proto = window.location.protocol;
  return proto === "http:" || proto === "https:" || proto === "orun-asset:";
}
