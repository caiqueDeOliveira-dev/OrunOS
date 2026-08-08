/**
 * Audio cleaning pipeline for recorded mic blobs.
 *
 * Background: MediaRecorder CANNOT reliably record the output of an
 * AudioWorklet's MediaStreamDestination in Chromium/Electron — the resulting
 * WebM has an invalid EBML header that ffmpeg and cloud STT both reject.
 * The workaround is to record the RAW getUserMedia stream (valid WebM) and
 * apply noise suppression OFFLINE to the decoded PCM before re-encoding as a
 * clean 16kHz mono WAV.
 */

/** Simple spectral-gate noise suppressor applied to raw PCM. */
export interface NoiseGateOptions {
  /** Frames used to estimate the noise floor (default 20) */
  profileFrames?: number;
  /** Multiplier above noise floor that counts as speech (default 2.5) */
  threshold?: number;
  /** Attenuation factor applied when gated (default 0.15) */
  attenuate?: number;
  /** Frame size in samples (default 1024) */
  frameSize?: number;
}

export function applyNoiseGate(
  pcm: Float32Array,
  options?: NoiseGateOptions
): Float32Array {
  const frameSize = options?.frameSize ?? 1024;
  const profileFrames = options?.profileFrames ?? 20;
  const threshold = options?.threshold ?? 2.5;
  const attenuate = options?.attenuate ?? 0.15;

  const out = new Float32Array(pcm.length);
  const frameCount = Math.floor(pcm.length / frameSize);

  // Frame RMS energies
  const energies: number[] = [];
  for (let f = 0; f < frameCount; f++) {
    const off = f * frameSize;
    let sum = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = pcm[off + i];
      sum += s * s;
    }
    energies.push(Math.sqrt(sum / frameSize));
  }

  // Noise floor estimate: average of the lowest `profileFrames` frames
  const sorted = [...energies].sort((a, b) => a - b);
  const noiseFloor =
    sorted.length > 0
      ? sorted.slice(0, Math.min(profileFrames, sorted.length)).reduce((a, b) => a + b, 0) /
        Math.min(profileFrames, sorted.length)
      : 0.01;
  const gateLevel = Math.max(noiseFloor * threshold, 1e-4);

  // Apply gain with attack/release smoothing to avoid clicks
  let gain = 1;
  const attack = 0.6;
  const release = 0.05;
  for (let f = 0; f < frameCount; f++) {
    const target = energies[f] < gateLevel ? attenuate : 1;
    const alpha = target < gain ? attack : release;
    gain += (target - gain) * alpha;
    const off = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      out[off + i] = pcm[off + i] * gain;
    }
  }
  // Trailing samples (frame remainder) — copy at current gain
  const tailStart = frameCount * frameSize;
  for (let i = tailStart; i < pcm.length; i++) {
    out[i] = pcm[i] * gain;
  }

  return out;
}

/**
 * Decode any recorded blob (webm/ogg/mp4) to mono PCM at 16kHz.
 * Returns null if decoding fails.
 */
export async function decodeToPcm16k(blob: Blob): Promise<Float32Array | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    // Use an OfflineAudioContext — decodeAudioData on a plain context also
    // works, but offline avoids touching the audio device.
    const probe = new OfflineAudioContext(1, 1, 16000);
    const decoded = await probe.decodeAudioData(arrayBuffer);

    // Resample to 16kHz mono
    const targetRate = 16000;
    const length = Math.ceil(decoded.duration * targetRate);
    const offline = new OfflineAudioContext(1, length, targetRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } catch {
    return null;
  }
}

/** Encode mono Float32 PCM as a WAV Blob. */
export function pcmToWavBlob(pcm: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length * (bitsPerSample / 8);

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const int16 = new Int16Array(buffer, 44);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/**
 * Convert a recorded blob into a clean WAV, optionally applying the noise gate.
 * Returns the original blob if decoding fails (server/ffmpeg may still handle it).
 */
export async function blobToCleanWav(
  blob: Blob,
  noiseSuppression: boolean
): Promise<Blob> {
  const pcm = await decodeToPcm16k(blob);
  if (!pcm || pcm.length === 0) return blob;

  const cleaned = noiseSuppression ? applyNoiseGate(pcm) : pcm;
  return pcmToWavBlob(cleaned, 16000);
}
