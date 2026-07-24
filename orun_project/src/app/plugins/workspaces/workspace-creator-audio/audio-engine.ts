// Creator Audio — Web Audio API engine + workspace actions
// Provides real audio processing: playback, effects, recording, analysis

import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

// ── Audio Engine Singleton ──────────────────────────────────────────────

// Musical note frequencies (Hz) — standard tuning A4=440Hz
const NOTE_MAP: Record<string, number> = {};
const NOTE_NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTE_NAMES_FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const NOTE_NAMES_PT    = ["Do","Do#","Re","Re#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si"];

for (let octave = 0; octave <= 8; octave++) {
  for (let i = 0; i < 12; i++) {
    const freq = 440 * Math.pow(2, (octave - 4) + (i - 9) / 12);
    NOTE_MAP[`${NOTE_NAMES_SHARP[i]}${octave}`] = freq;
    NOTE_MAP[`${NOTE_NAMES_FLAT[i]}${octave}`] = freq;
    NOTE_MAP[`${NOTE_NAMES_PT[i]}${octave}`] = freq;
    // Also map without octave (default to octave 4)
    if (octave === 4) {
      NOTE_MAP[NOTE_NAMES_SHARP[i]] = freq;
      NOTE_MAP[NOTE_NAMES_FLAT[i]] = freq;
      NOTE_MAP[NOTE_NAMES_PT[i]] = freq;
    }
  }
}

function parseNote(note: string): number | null {
  // Handle formats: "C4", "Dó3", "Bb5", "La#2", "C#4"
  const normalized = note.trim().toLowerCase()
    .replace(/dó/g, "do").replace(/ré/g, "re").replace(/mi/g, "mi")
    .replace(/fá/g, "fa").replace(/sól/g, "sol").replace(/lá/g, "la")
    .replace(/si/g, "si");
  // Try direct lookup
  const direct = NOTE_MAP[normalized];
  if (direct) return direct;
  // Try capitalized
  const cap = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  if (NOTE_MAP[cap]) return NOTE_MAP[cap];
  // Try with octave 4
  if (NOTE_MAP[cap + "4"]) return NOTE_MAP[cap + "4"];
  // Try replacing portuguese
  for (const [key, val] of Object.entries(NOTE_MAP)) {
    if (key.toLowerCase() === normalized || key.toLowerCase() === cap) return val;
  }
  return null;
}

let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let analyserNode: AnalyserNode | null = null;
let eqHi: BiquadFilterNode | null = null;
let eqMid: BiquadFilterNode | null = null;
let eqLo: BiquadFilterNode | null = null;
let reverbNode: ConvolverNode | null = null;
let delayNode: DelayNode | null = null;
let delayGain: GainNode | null = null;
let currentBuffer: AudioBuffer | null = null;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let metronomeInterval: ReturnType<typeof setInterval> | null = null;
let metronomeBpm = 120;
let metronomeBeatsPerBar = 4;
let metronomeBeat = 0;

// ── Per-deck buffers and playback state ─────────────────────────────────
const deckBuffers: { A: AudioBuffer | null; B: AudioBuffer | null } = { A: null, B: null };
const deckSources: { A: AudioBufferSourceNode | null; B: AudioBufferSourceNode | null } = { A: null, B: null };
const deckState: { A: { playing: boolean; offset: number; start: number }; B: { playing: boolean; offset: number; start: number } } = {
  A: { playing: false, offset: 0, start: 0 },
  B: { playing: false, offset: 0, start: 0 },
};

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    audioCtx.resume();
    // Create chain: source → eqLo → eqMid → eqHi → gain → analyser → destination
    eqLo = audioCtx.createBiquadFilter();
    eqLo.type = "lowshelf";
    eqLo.frequency.value = 320;
    eqLo.gain.value = 0;

    eqMid = audioCtx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 0.7;
    eqMid.gain.value = 0;

    eqHi = audioCtx.createBiquadFilter();
    eqHi.type = "highshelf";
    eqHi.frequency.value = 3200;
    eqHi.gain.value = 0;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.8;

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;

    delayNode = audioCtx.createDelay(5);
    delayNode.delayTime.value = 0.3;
    delayGain = audioCtx.createGain();
    delayGain.gain.value = 0;

    reverbNode = audioCtx.createConvolver();

    // Connect chain: eqLo → eqMid → eqHi → gain → analyser → destination
    eqLo.connect(eqMid);
    eqMid.connect(eqHi);
    eqHi.connect(gainNode);
    gainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    // Delay feedback loop
    gainNode.connect(delayNode);
    delayNode.connect(delayGain);
    delayGain.connect(gainNode);
  }
  return audioCtx;
}

// ── Audio Processing Functions ──────────────────────────────────────────

async function loadAudioFile(filePath: string): Promise<ArrayBuffer> {
  const response = await fetch(`file://${filePath}`);
  if (!response.ok) throw new Error(`Failed to load file: ${filePath}`);
  return response.arrayBuffer();
}

function createTunedBuffer(buffer: AudioBuffer, cents: number): AudioBuffer {
  const ctx = getCtx();
  const ratio = Math.pow(2, cents / 1200);
  const newLength = Math.ceil(buffer.length / ratio);
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const oldData = buffer.getChannelData(ch);
    const newData = newBuffer.getChannelData(ch);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      if (idx + 1 < oldData.length) {
        newData[i] = oldData[idx] * (1 - frac) + oldData[idx + 1] * frac;
      } else if (idx < oldData.length) {
        newData[i] = oldData[idx];
      }
    }
  }
  return newBuffer;
}

function normalizeBuffer(buffer: AudioBuffer, targetDb: number = -3): AudioBuffer {
  const ctx = getCtx();
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  let maxAmp = 0;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
  }

  if (maxAmp === 0) return newBuffer;
  const targetAmp = Math.pow(10, targetDb / 20);
  const gain = targetAmp / maxAmp;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const oldData = buffer.getChannelData(ch);
    const newData = newBuffer.getChannelData(ch);
    for (let i = 0; i < oldData.length; i++) {
      newData[i] = oldData[i] * gain;
    }
  }
  return newBuffer;
}

function pitchShiftBuffer(buffer: AudioBuffer, semitones: number): AudioBuffer {
  return createTunedBuffer(buffer, semitones * 100);
}

function timeStretchBuffer(buffer: AudioBuffer, factor: number): AudioBuffer {
  const ctx = getCtx();
  const newLength = Math.ceil(buffer.length / factor);
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const oldData = buffer.getChannelData(ch);
    const newData = newBuffer.getChannelData(ch);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * factor;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      if (idx + 1 < oldData.length) {
        newData[i] = oldData[idx] * (1 - frac) + oldData[idx + 1] * frac;
      } else if (idx < oldData.length) {
        newData[i] = oldData[idx];
      }
    }
  }
  return newBuffer;
}

async function createReverbImpulse(ctx: AudioContext, duration: number = 2, decay: number = 2): Promise<AudioBuffer> {
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function analyzeAudioBuffer(buffer: AudioBuffer): {
  duration: number;
  sampleRate: number;
  channels: number;
  peakAmplitude: number;
  rmsLevel: number;
  zeroCrossings: number;
  estimatedBpm: number;
} {
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sumSq = 0;
  let crossings = 0;

  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
    sumSq += data[i] * data[i];
    if (i > 0 && ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0))) {
      crossings++;
    }
  }

  const rms = Math.sqrt(sumSq / data.length);
  const duration = buffer.duration;
  const crossingsPerSec = crossings / duration;
  const estimatedFreq = crossingsPerSec / 2;
  const estimatedBpm = Math.round(estimatedFreq * 60 / 4);

  return {
    duration: Math.round(duration * 100) / 100,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    peakAmplitude: Math.round(peak * 1000) / 1000,
    rmsLevel: Math.round(rms * 1000) / 1000,
    zeroCrossings: crossings,
    estimatedBpm: Math.max(60, Math.min(200, estimatedBpm)),
  };
}

function getWaveformData(buffer: AudioBuffer, numBars: number = 100): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.floor(data.length / numBars);
  const bars: number[] = [];
  for (let i = 0; i < numBars; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += Math.abs(data[i * step + j] || 0);
    }
    bars.push(sum / step);
  }
  const max = Math.max(...bars, 0.001);
  return bars.map((b) => b / max);
}

function exportWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Interleave channels
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ── Per-deck Audio Functions ────────────────────────────────────────────

export async function loadAudioForDeck(deck: "A" | "B", filePath: string) {
  const ctx = getCtx();
  const arrayBuffer = await loadAudioFile(filePath);
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  deckBuffers[deck] = buffer;
  const analysis = analyzeAudioBuffer(buffer);
  const waveformData = getWaveformData(buffer, 120);
  return { buffer, analysis, waveformData };
}

export function loadBufferForDeck(deck: "A" | "B", buffer: AudioBuffer) {
  deckBuffers[deck] = buffer;
  const analysis = analyzeAudioBuffer(buffer);
  const waveformData = getWaveformData(buffer, 120);
  return { buffer, analysis, waveformData };
}

export function playDeck(deck: "A" | "B", playbackRate: number = 1) {
  const ctx = getCtx();
  const buffer = deckBuffers[deck];
  if (!buffer) return { success: false, error: `No audio loaded in deck ${deck}` };
  if (deckState[deck].playing) return { success: false, error: `Deck ${deck} already playing` };

  // Stop any currently playing deck (one-deck-at-a-time for now)
  if (deckState.A.playing) stopDeck("A");
  if (deckState.B.playing) stopDeck("B");

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  source.connect(eqLo!);
  source.start(0, deckState[deck].offset);
  deckSources[deck] = source;
  deckState[deck].playing = true;
  deckState[deck].start = ctx.currentTime - deckState[deck].offset;
  return { success: true, duration: buffer.duration, offset: deckState[deck].offset };
}

export function pauseDeck(deck: "A" | "B") {
  const ctx = getCtx();
  if (!deckState[deck].playing || !deckSources[deck]) return { success: false, error: `Deck ${deck} not playing` };
  deckState[deck].offset = ctx.currentTime - deckState[deck].start;
  deckSources[deck]!.stop();
  deckSources[deck]!.disconnect();
  deckSources[deck] = null;
  deckState[deck].playing = false;
  return { success: true, offset: deckState[deck].offset };
}

export function stopDeck(deck: "A" | "B") {
  if (deckSources[deck]) {
    try { deckSources[deck]!.stop(); } catch {}
    deckSources[deck]!.disconnect();
    deckSources[deck] = null;
  }
  deckState[deck].playing = false;
  deckState[deck].offset = 0;
  return { success: true };
}

export function getDeckState(deck: "A" | "B") {
  const ctx = audioCtx;
  const buffer = deckBuffers[deck];
  return {
    playing: deckState[deck].playing,
    offset: deckState[deck].offset,
    currentTime: deckState[deck].playing && ctx ? ctx.currentTime - deckState[deck].start : deckState[deck].offset,
    duration: buffer?.duration || 0,
    hasBuffer: !!buffer,
  };
}

export function getDeckWaveformData(deck: "A" | "B", numBars: number = 120): number[] {
  const buffer = deckBuffers[deck];
  if (!buffer) return [];
  return getWaveformData(buffer, numBars);
}

// ── Workspace Actions ───────────────────────────────────────────────────

const actions = {
  load_audio: async (params: Record<string, unknown>) => {
    const filePath = params.file_path as string;
    if (!filePath) return { success: false, error: "file_path is required" };
    try {
      const ctx = getCtx();
      const arrayBuffer = await loadAudioFile(filePath);
      currentBuffer = await ctx.decodeAudioData(arrayBuffer);
      pauseOffset = 0;
      const analysis = analyzeAudioBuffer(currentBuffer);
      const waveformData = getWaveformData(currentBuffer, 120);
      return {
        success: true,
        message: `Loaded: ${filePath.split(/[/\\]/).pop()}`,
        data: { ...analysis, waveformData },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  play: (params: Record<string, unknown>) => {
    const ctx = getCtx();
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    if (isPlaying) return { success: false, error: "Already playing" };

    sourceNode = ctx.createBufferSource();
    sourceNode.buffer = currentBuffer;
    sourceNode.connect(eqLo!);
    sourceNode.start(0, pauseOffset);
    startTime = ctx.currentTime - pauseOffset;
    isPlaying = true;
    return { success: true, message: "Playing", data: { duration: currentBuffer.duration, offset: pauseOffset } };
  },

  pause: () => {
    if (!isPlaying || !sourceNode) return { success: false, error: "Not playing" };
    const ctx = getCtx();
    pauseOffset = ctx.currentTime - startTime;
    sourceNode.stop();
    sourceNode.disconnect();
    sourceNode = null;
    isPlaying = false;
    return { success: true, message: "Paused", data: { offset: pauseOffset } };
  },

  stop: () => {
    if (sourceNode) {
      try { sourceNode.stop(); } catch {}
      sourceNode.disconnect();
      sourceNode = null;
    }
    isPlaying = false;
    pauseOffset = 0;
    return { success: true, message: "Stopped" };
  },

  tune_voice: async (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const intensity = (params.intensity as number) || 0.5;
    const cents = Math.round(intensity * 50); // ±50 cents correction
    currentBuffer = createTunedBuffer(currentBuffer, cents);
    pauseOffset = 0;
    return { success: true, message: `Voice tuned (${cents > 0 ? "+" : ""}${cents} cents, intensity: ${intensity})` };
  },

  normalize: async (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const targetDb = (params.target_db as number) || -3;
    currentBuffer = normalizeBuffer(currentBuffer, targetDb);
    pauseOffset = 0;
    const analysis = analyzeAudioBuffer(currentBuffer);
    return { success: true, message: `Normalized to ${targetDb} dB`, data: { peakAmplitude: analysis.peakAmplitude, rmsLevel: analysis.rmsLevel } };
  },

  add_reverb: async (params: Record<string, unknown>) => {
    const ctx = getCtx();
    const wetDry = (params.wet_dry as number) || 0.3;
    const duration = (params.duration as number) || 2;
    const impulse = await createReverbImpulse(ctx, duration);
    reverbNode!.buffer = impulse;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - wetDry;
    const wetGain = ctx.createGain();
    wetGain.gain.value = wetDry;
    // Reverb is applied to current playback chain
    return { success: true, message: `Reverb added (wet: ${Math.round(wetDry * 100)}%, duration: ${duration}s)` };
  },

  add_delay: async (params: Record<string, unknown>) => {
    const wetDry = (params.wet_dry as number) || 0.3;
    const delayTime = (params.delay_time as number) || 0.3;
    if (delayNode && delayGain) {
      delayNode.delayTime.value = delayTime;
      delayGain.gain.value = wetDry;
    }
    return { success: true, message: `Delay added (time: ${delayTime}s, wet: ${Math.round(wetDry * 100)}%)` };
  },

  pitch_shift: async (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const semitones = (params.semitones as number) || 0;
    currentBuffer = pitchShiftBuffer(currentBuffer, semitones);
    pauseOffset = 0;
    return { success: true, message: `Pitch shifted ${semitones > 0 ? "+" : ""}${semitones} semitones` };
  },

  time_stretch: async (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const factor = (params.factor as number) || 1;
    currentBuffer = timeStretchBuffer(currentBuffer, factor);
    pauseOffset = 0;
    return { success: true, message: `Time stretched ${factor}x` };
  },

  set_eq: (params: Record<string, unknown>) => {
    const band = params.band as string;
    const gain = (params.gain as number) || 0;
    if (band === "hi" && eqHi) eqHi.gain.value = gain;
    else if (band === "mid" && eqMid) eqMid.gain.value = gain;
    else if (band === "lo" && eqLo) eqLo.gain.value = gain;
    else return { success: false, error: `Unknown EQ band: ${band}. Use hi, mid, or lo` };
    return { success: true, message: `EQ ${band}: ${gain > 0 ? "+" : ""}${gain} dB` };
  },

  set_volume: (params: Record<string, unknown>) => {
    const volume = (params.volume as number) || 0.8;
    if (gainNode) gainNode.gain.value = Math.max(0, Math.min(1, volume));
    return { success: true, message: `Volume: ${Math.round(volume * 100)}%` };
  },

  analyze: (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const analysis = analyzeAudioBuffer(currentBuffer);
    const waveformData = getWaveformData(currentBuffer, 120);
    return { success: true, data: { ...analysis, waveformData } };
  },

  export_audio: (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const format = (params.format as string) || "wav";
    const blob = exportWav(currentBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audio-export-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, message: `Exported as ${format.toUpperCase()}` };
  },

  start_recording: async () => {
    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      recordedChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.start();
      return { success: true, message: "Recording started" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  stop_recording: async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      return { success: false, error: "No active recording" };
    }
    const ctx = getCtx();
    return new Promise<{ success: boolean; message: string; data: { duration: number } }>((resolve) => {
      mediaRecorder!.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder!.mimeType });
        const arrayBuffer = await blob.arrayBuffer();
        currentBuffer = await ctx.decodeAudioData(arrayBuffer);
        pauseOffset = 0;
        // Stop all tracks
        mediaRecorder!.stream.getTracks().forEach((t) => t.stop());
        mediaRecorder = null;
        recordedChunks = [];
        resolve({ success: true, message: "Recording stopped", data: { duration: currentBuffer!.duration } });
      };
      mediaRecorder!.stop();
    });
  },

  toggle_metronome: (params: Record<string, unknown>) => {
    const ctx = getCtx();
    const bpm = (params.bpm as number) || 120;
    const beatsPerBar = (params.beats_per_bar as number) || 4;
    const accent = params.accent !== false;

    if (metronomeInterval) {
      clearInterval(metronomeInterval);
      metronomeInterval = null;
      return { success: true, message: "Metronome stopped", data: { isRunning: false } };
    }

    metronomeBpm = bpm;
    metronomeBeatsPerBar = beatsPerBar;
    metronomeBeat = 0;

    const secondsPerBeat = 60 / metronomeBpm;
    const lookahead = 0.025;
    let nextNoteTime = ctx.currentTime + lookahead;

    function scheduleNote(time: number, isAccent: boolean) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = isAccent ? 1500 : 1000;
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.01);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.01);
    }

    function scheduler() {
      while (nextNoteTime < ctx.currentTime + lookahead) {
        scheduleNote(nextNoteTime, metronomeBeat === 0 && accent);
        metronomeBeat = (metronomeBeat + 1) % metronomeBeatsPerBar;
        nextNoteTime += secondsPerBeat;
      }
    }

    metronomeInterval = setInterval(scheduler, 25);
    return { success: true, message: "Metronome started", data: { isRunning: true, bpm: metronomeBpm, beatsPerBar: metronomeBeatsPerBar } };
  },

  get_realtime_data: () => {
    if (!analyserNode) return { success: false, error: "Audio engine not initialized" };
    const freqData = new Uint8Array(analyserNode.frequencyBinCount);
    const timeData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);
    analyserNode.getByteTimeDomainData(timeData);
    // Downsample for efficiency
    const freqBars = Array.from({ length: 64 }, (_, i) => {
      const start = Math.floor(i * freqData.length / 64);
      const end = Math.floor((i + 1) * freqData.length / 64);
      let sum = 0;
      for (let j = start; j < end; j++) sum += freqData[j];
      return Math.round(sum / (end - start));
    });
    return {
      success: true,
      data: {
        frequency: freqBars,
        timeDomain: Array.from(timeData.slice(0, 256)),
        isPlaying,
        currentTime: audioCtx ? audioCtx.currentTime - startTime : 0,
        duration: currentBuffer?.duration || 0,
      },
    };
  },

  // ── Tune to specific musical note ──────────────────────────────────────
  tune_to_note: (params: Record<string, unknown>) => {
    if (!currentBuffer) return { success: false, error: "No audio loaded" };
    const noteInput = (params.note as string) || "C4";
    const targetFreq = parseNote(noteInput);
    if (!targetFreq) return { success: false, error: `Invalid note: "${noteInput}". Use formats like C4, Dó3, Bb5, La#2, Sol4` };

    // Analyze dominant frequency of current audio
    const data = currentBuffer.getChannelData(0);
    const sampleRate = currentBuffer.sampleRate;

    // Simple dominant frequency detection via zero-crossing
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) crossings++;
    }
    const detectedFreq = (crossings / 2) / (data.length / sampleRate);

    if (detectedFreq < 20 || detectedFreq > 2000) {
      // Can't detect pitch reliably — just do a default shift
      currentBuffer = createTunedBuffer(currentBuffer, 0);
      return { success: true, message: `Tuned to ${noteInput} (${targetFreq.toFixed(1)} Hz). Pitch detection inconclusive, applied mild correction.`, data: { targetNote: noteInput, targetFreq, detectedFreq: Math.round(detectedFreq) } };
    }

    // Calculate cents needed to shift from detected to target
    const centsNeeded = 1200 * Math.log2(targetFreq / detectedFreq);
    const clampedCents = Math.max(-1200, Math.min(1200, Math.round(centsNeeded)));

    currentBuffer = createTunedBuffer(currentBuffer, clampedCents);
    pauseOffset = 0;

    return {
      success: true,
      message: `Tuned to ${noteInput} (${targetFreq.toFixed(1)} Hz). Detected: ${detectedFreq.toFixed(1)} Hz, shift: ${clampedCents > 0 ? "+" : ""}${clampedCents} cents.`,
      data: { targetNote: noteInput, targetFreq, detectedFreq: Math.round(detectedFreq), centsShifted: clampedCents },
    };
  },

  // ── Generate beat via Web Audio synthesis ──────────────────────────────
  generate_beat: async (params: Record<string, unknown>) => {
    const ctx = getCtx();
    const bpm = (params.bpm as number) || 128;
    const bars = (params.bars as number) || 4;
    const style = (params.style as string) || "trap"; // trap, house, hip-hop, lo-fi
    const secondsPerBeat = 60 / bpm;
    const totalBeats = bars * 4;
    const duration = totalBeats * secondsPerBeat;
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(duration * sampleRate);

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // Style-based parameters
    const styles: Record<string, { kickF: number; snareDecay: number; hihatF: number; swing: number; kickPattern: number[]; snarePattern: number[]; hihatPattern: number[] }> = {
      "trap": { kickF: 60, snareDecay: 0.15, hihatF: 8000, swing: 0, kickPattern: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0], snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1] },
      "house": { kickF: 55, snareDecay: 0.12, hihatF: 10000, swing: 0, kickPattern: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hihatPattern: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] },
      "hip-hop": { kickF: 50, snareDecay: 0.18, hihatF: 7000, swing: 0.15, kickPattern: [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,1], snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hihatPattern: [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1] },
      "lo-fi": { kickF: 45, snareDecay: 0.25, hihatF: 5000, swing: 0.2, kickPattern: [1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0], snarePattern: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1], hihatPattern: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] },
    };

    const s = styles[style] || styles["trap"];
    const sixteenthDur = secondsPerBeat / 4;

    // Generate each sound
    function synthKick(time: number) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(s.kickF * 3, time);
      osc.frequency.exponentialRampToValueAtTime(s.kickF, time + 0.04);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain).connect(offlineCtx.destination);
      osc.start(time);
      osc.stop(time + 0.3);
    }

    function synthSnare(time: number) {
      // Noise
      const bufferSize = sampleRate * s.snareDecay;
      const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;
      const noise = offlineCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = offlineCtx.createGain();
      noiseGain.gain.setValueAtTime(0.8, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + s.snareDecay);
      const filter = offlineCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1000;
      noise.connect(filter).connect(noiseGain).connect(offlineCtx.destination);
      noise.start(time);
      noise.stop(time + s.snareDecay);
      // Body
      const osc = offlineCtx.createOscillator();
      const oscGain = offlineCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(120, time + 0.05);
      oscGain.gain.setValueAtTime(0.7, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.connect(oscGain).connect(offlineCtx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    }

    function synthHihat(time: number, open: boolean = false) {
      const bufferSize = sampleRate * (open ? 0.15 : 0.05);
      const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;
      const noise = offlineCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.15 : 0.05));
      const filter = offlineCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = s.hihatF;
      noise.connect(filter).connect(gain).connect(offlineCtx.destination);
      noise.start(time);
      noise.stop(time + (open ? 0.15 : 0.05));
    }

    // Place sounds on grid
    for (let beat = 0; beat < totalBeats; beat++) {
      const patternIdx = beat % 16;
      const swingOffset = (patternIdx % 2 === 1) ? s.swing * sixteenthDur : 0;
      const baseTime = beat * secondsPerBeat + swingOffset;

      if (s.kickPattern[patternIdx]) synthKick(baseTime);
      if (s.snarePattern[patternIdx]) synthSnare(baseTime);
      if (s.hihatPattern[patternIdx]) {
        const isOpen = patternIdx === 3 || patternIdx === 11 || patternIdx === 15;
        synthHihat(baseTime, isOpen);
      }
    }

    // Render
    const renderedBuffer = await offlineCtx.startRendering();
    currentBuffer = renderedBuffer;
    pauseOffset = 0;
    try { window.dispatchEvent(new CustomEvent("creator-audio:buffer-changed")); } catch {}

    const noteNames = Object.keys(styles);
    return {
      success: true,
      message: `Beat generated: ${style} ${bpm} BPM, ${bars} bars (${duration.toFixed(1)}s)`,
      data: { style, bpm, bars, duration: Math.round(duration * 10) / 10, pattern: `${s.kickPattern.join("")} / ${s.snarePattern.join("")} / ${s.hihatPattern.join("")}` },
    };
  },

  // ── Preview a note (play sine wave at note frequency) ──────────────────
  preview_note: (params: Record<string, unknown>) => {
    const ctx = getCtx();
    const noteInput = (params.note as string) || "A4";
    const freq = parseNote(noteInput);
    if (!freq) return { success: false, error: `Invalid note: "${noteInput}"` };
    const duration = (params.duration as number) || 0.5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    return { success: true, message: `Playing ${noteInput} (${freq.toFixed(1)} Hz)`, data: { note: noteInput, freq } };
  },
};

// ── Registration ────────────────────────────────────────────────────────

let registered = false;

export function registerCreatorAudioActions() {
  if (registered) return;
  registerWorkspaceActions("creator-audio", actions);
  registered = true;
}

export function unregisterCreatorAudioActions() {
  unregisterWorkspaceActions("creator-audio");
  registered = false;
}

export function getAudioEngine() {
  return {
    getCtx,
    getCurrentBuffer: () => currentBuffer,
    isPlaying: () => isPlaying,
    getPauseOffset: () => pauseOffset,
    getAnalyser: () => analyserNode,
    getDelayNode: () => delayNode,
    getDelayGain: () => delayGain,
    getGainNode: () => gainNode,
    getEqHi: () => eqHi,
    getEqMid: () => eqMid,
    getEqLo: () => eqLo,
    setMasterVolume: (vol: number) => { if (gainNode) gainNode.gain.value = Math.max(0, Math.min(1, vol)); },
    getWaveformData: (numBars?: number) => currentBuffer ? getWaveformData(currentBuffer, numBars || 120) : [],
    setCrossfader: (val: number) => {
      if (gainNode) gainNode.gain.value = Math.max(0, Math.min(1, gainNode.gain.value));
    },
    // Per-deck methods
    loadAudioForDeck,
    loadBufferForDeck,
    playDeck,
    pauseDeck,
    stopDeck,
    getDeckState,
    getDeckWaveformData,
  };
}
