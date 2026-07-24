/**
 * Energy-based Voice Activity Detection (VAD).
 * Much more precise than simple volume threshold — uses:
 * - Short-term energy (RMS)
 * - Zero-crossing rate (speech vs noise)
 * - Spectral centroid (voice frequency range)
 * - Hangover timer (prevents choppy cuts)
 */
export interface VADConfig {
  /** RMS threshold to consider a frame as speech (0-1, default 0.02) */
  speechThreshold?: number;
  /** RMS below this is definitely silence (0-1, default 0.008) */
  silenceThreshold?: number;
  /** How long silence must last before declaring end of speech (ms, default 2000) */
  silenceDuration?: number;
  /** Hangover time to keep "speech" state after energy drops (ms, default 400) */
  hangover?: number;
  /** Minimum speech duration to count (ms, default 300) */
  minSpeechDuration?: number;
  /** Frame size in samples (default 512) */
  frameSize?: number;
}

export interface VADEvent {
  type: "speech_start" | "speech_end" | "energy";
  energy: number;
  /** Zero-crossing rate (0-1) — ~0.03-0.15 for speech */
  zcr: number;
  /** Spectral centroid in Hz — voice is typically 85-300Hz fundamental */
  spectralCentroid: number;
  timestamp: number;
}

export type VADCallback = (event: VADEvent) => void;

export class VoiceActivityDetector {
  private config: Required<VADConfig>;
  private _isSpeaking = false;
  private _lastSpeechTime = 0;
  private _speechStartTime = 0;
  private _onEvent: VADCallback | null = null;
  private _analyser: AnalyserNode | null = null;
  private _ctx: AudioContext | null = null;
  private _checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: VADConfig) {
    this.config = {
      speechThreshold: config?.speechThreshold ?? 0.02,
      silenceThreshold: config?.silenceThreshold ?? 0.008,
      silenceDuration: config?.silenceDuration ?? 2000,
      hangover: config?.hangover ?? 400,
      minSpeechDuration: config?.minSpeechDuration ?? 300,
      frameSize: config?.frameSize ?? 512,
    };
  }

  get isSpeaking() {
    return this._isSpeaking;
  }

  /** Attach to an audio stream for continuous analysis */
  start(stream: MediaStream, onEvent: VADCallback) {
    this._onEvent = onEvent;
    this._ctx = new AudioContext({ sampleRate: 48000 });
    this._ctx.resume().catch(() => {});
    const source = this._ctx.createMediaStreamSource(stream);
    this._analyser = this._ctx.createAnalyser();
    this._analyser.fftSize = this.config.frameSize * 2;
    this._analyser.smoothingTimeConstant = 0.3;
    source.connect(this._analyser);

    this._checkInterval = setInterval(() => this._analyze(), 50);
  }

  stop() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
    this._analyser = null;
    this._isSpeaking = false;
    this._onEvent = null;
  }

  private _analyze() {
    if (!this._analyser) return;

    const bufLen = this._analyser.fftSize;
    const timeData = new Float32Array(bufLen);
    const freqData = new Float32Array(bufLen);
    this._analyser.getFloatTimeDomainData(timeData);
    this._analyser.getFloatFrequencyData(freqData);

    // 1. RMS energy
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) sumSq += timeData[i] * timeData[i];
    const energy = Math.sqrt(sumSq / timeData.length);

    // 2. Zero-crossing rate
    let crossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) crossings++;
    }
    const zcr = crossings / timeData.length;

    // 3. Spectral centroid (weighted average of frequencies)
    let weightedSum = 0;
    let totalMag = 0;
    for (let i = 0; i < freqData.length; i++) {
      const sampleRate = this._ctx?.sampleRate || 48000;
      const freq = (i * sampleRate) / freqData.length;
      const mag = Math.pow(10, freqData[i] / 20); // dB to linear
      weightedSum += freq * mag;
      totalMag += mag;
    }
    const spectralCentroid = totalMag > 0 ? weightedSum / totalMag : 0;

    const now = Date.now();
    const event: VADEvent = { type: "energy", energy, zcr, spectralCentroid, timestamp: now };

    if (!this._isSpeaking) {
      // Voice characteristics: energy above threshold, ZCR in speech range (0.02-0.2),
      // spectral centroid in voice range (80-4000Hz)
      const isSpeechLike =
        energy > this.config.silenceThreshold &&
        zcr > 0.01 &&
        zcr < 0.4 &&
        spectralCentroid > 50 &&
        spectralCentroid < 6000;

      if (energy > this.config.speechThreshold || (isSpeechLike && energy > this.config.silenceThreshold * 2)) {
        this._isSpeaking = true;
        this._speechStartTime = now;
        this._lastSpeechTime = now;
        this._onEvent?.({ ...event, type: "speech_start" });
      }
    } else {
      // Currently speaking — check for silence
      if (energy > this.config.silenceThreshold) {
        this._lastSpeechTime = now;
      }

      const silenceTime = now - this._lastSpeechTime;
      const speechDuration = now - this._speechStartTime;

      // Hangover: wait hangover ms after last speech before declaring silence
      if (silenceTime > this.config.hangover) {
        // Check minimum duration
        if (speechDuration >= this.config.minSpeechDuration) {
          this._isSpeaking = false;
          this._onEvent?.({ ...event, type: "speech_end" });
        } else {
          // Too short — reset without event
          this._isSpeaking = false;
        }
      }
    }

    // Always report energy for visualizer
    if (this._onEvent) {
      this._onEvent(event);
    }
  }
}
