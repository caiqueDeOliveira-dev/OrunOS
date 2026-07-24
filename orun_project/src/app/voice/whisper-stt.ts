/**
 * Whisper STT integration — supports multiple backends:
 * 1. Local Whisper.cpp server (HTTP API)
 * 2. Browser's built-in SpeechRecognition as fallback
 * 3. Any OpenAI-compatible /v1/audio/transcriptions endpoint
 *
 * Also handles automatic language detection.
 */

export interface WhisperConfig {
  /** Whisper server base URL (e.g. "http://localhost:8080") */
  baseUrl?: string;
  /** API key (optional, for cloud endpoints) */
  apiKey?: string;
  /** Model name (default: "whisper-1" or "base") */
  model?: string;
  /** Language hint (e.g. "pt", "en", "es") — null = auto-detect */
  language?: string | null;
  /** Response format: "json" | "verbose_json" | "text" | "srt" | "vtt" */
  responseFormat?: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * Transcribe audio using a Whisper-compatible backend.
 */
export async function transcribeWhisper(
  audioBlob: Blob,
  config?: WhisperConfig
): Promise<TranscriptionResult> {
  if (!config?.baseUrl) {
    throw new Error("Whisper: baseUrl is required");
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const formData = new FormData();

  // Convert to wav if needed for compatibility
  const wavBlob = await ensureWav(audioBlob);
  formData.append("file", wavBlob, "audio.wav");
  formData.append("model", config.model || "whisper-1");

  if (config.language) {
    formData.append("language", config.language);
  }

  if (config.responseFormat) {
    formData.append("response_format", config.responseFormat);
  }

  // Try /v1/audio/transcriptions first (OpenAI-compatible)
  let url = `${baseUrl}/v1/audio/transcriptions`;
  let response = await fetch(url, {
    method: "POST",
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
    body: formData,
  });

  // Fallback to /transcribe (whisper.cpp native)
  if (!response.ok) {
    url = `${baseUrl}/transcribe`;
    response = await fetch(url, {
      method: "POST",
      body: formData,
    });
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Whisper STT failed (${response.status}): ${errText}`);
  }

  const data = await response.json();

  // Normalize response format
  if (typeof data === "string") {
    return { text: data };
  }
  if (data.text) {
    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
      segments: data.segments?.map((s: any) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
    };
  }
  return { text: JSON.stringify(data) };
}

/**
 * Detect language from audio using Whisper's /detect-language endpoint.
 */
export async function detectLanguage(
  audioBlob: Blob,
  baseUrl: string
): Promise<{ language: string; probability: number }> {
  const wavBlob = await ensureWav(audioBlob);
  const formData = new FormData();
  formData.append("file", wavBlob, "audio.wav");

  const response = await fetch(`${baseUrl}/v1/audio/detect-language`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Language detection failed: ${response.status}`);
  }

  const data = await response.json();
  return { language: data.language || "pt", probability: data.probability || 0.5 };
}

/**
 * Browser SpeechRecognition fallback — works in Electron with network limitation.
 * Returns partial results as they come in (for real-time transcription).
 */
export function createBrowserSTT(
  lang = "pt-BR",
  onPartial?: (text: string) => void,
  onFinal?: (text: string) => void,
  onError?: (error: string) => void
): { start: () => void; stop: () => void } {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      start: () => onError?.("SpeechRecognition not available"),
      stop: () => {},
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event: any) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (interim && onPartial) onPartial(interim);
    if (final && onFinal) onFinal(final);
  };

  recognition.onerror = (e: any) => {
    if (e.error !== "no-speech") {
      onError?.(e.error);
    }
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch { /* already running */ }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch { /* ignore */ }
    },
  };
}

/**
 * Ensure audio is in WAV format for Whisper compatibility.
 */
async function ensureWav(blob: Blob): Promise<Blob> {
  if (blob.type.includes("wav")) return blob;

  // Decode to PCM, then encode as WAV
  try {
    const ctx = new OfflineAudioContext(1, 1, 16000);
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Re-sample to 16kHz mono
    const targetRate = 16000;
    const length = Math.ceil(audioBuffer.duration * targetRate);
    const offlineCtx = new OfflineAudioContext(1, length, targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    const rendered = await offlineCtx.startRendering();
    const pcmData = rendered.getChannelData(0);

    // Encode as WAV
    return pcmToWav(pcmData, targetRate);
  } catch {
    // If decoding fails, return original (server may handle it)
    return blob;
  }
}

function pcmToWav(pcm: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  const int16 = new Int16Array(buffer, 44);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
