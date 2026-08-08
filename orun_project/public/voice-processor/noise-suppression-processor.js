// @ts-nocheck — AudioWorklet processor runs in a separate scope (no DOM types)
/* eslint-disable no-restricted-globals */
/**
 * Adaptive noise gate AudioWorklet.
 * Estimates the noise floor from the quietest frames, then attenuates frames
 * near/under the noise floor with smooth attack/release to avoid clicks.
 * Used to feed the VAD a noise-suppressed stream so that background noise does
 * not prevent speech_end from firing.
 */
const FRAME_SIZE = 128;      // AudioWorklet quantum
const PROFILE_MS = 500;      // noise-floor profiling window

class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._noiseFloor = 1e-3;
    this._ready = false;
    this._gain = 1.0;
    this._profiledMs = 0;
    this._energyHistory = [];
    this._profileCount = 0;
    this.port.onmessage = (e) => {
      if (e.data === "reset") {
        this._noiseFloor = 1e-3;
        this._ready = false;
        this._gain = 1.0;
        this._energyHistory = [];
        this._profiledMs = 0;
        this._profileCount = 0;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // Short-term RMS energy of this quantum
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
    const energy = Math.sqrt(sum / input.length);

    // Profile phase: collect energy history for noise-floor estimate
    if (!this._ready) {
      this._energyHistory.push(energy);
      this._profiledMs += (FRAME_SIZE / sampleRate) * 1000;
      this._profileCount++;
      if (this._profiledMs >= PROFILE_MS && this._energyHistory.length > 4) {
        // Noise floor = median of the quietest frames
        const sorted = [...this._energyHistory].sort((a, b) => a - b);
        const n = Math.max(1, Math.floor(sorted.length * 0.4));
        let total = 0;
        for (let i = 0; i < n; i++) total += sorted[i];
        this._noiseFloor = Math.max(total / n, 1e-4);
        this._ready = true;
        this.port.postMessage({ type: "ready" });
      }
    } else {
      // Adaptive: slowly track the floor (room noise can drift)
      this._noiseFloor = Math.max(
        Math.min(this._noiseFloor, energy),       // follow dips fast
        this._noiseFloor * 0.999                   // slow upward drift
      );
    }

    // Gate decision: attenuate frames near/below the noise floor
    const GATE_THRESHOLD = 2.0; // multiple of noise floor
    const ATTEN = 0.12;         // gain when gated
    const target = this._ready && energy < this._noiseFloor * GATE_THRESHOLD ? ATTEN : 1.0;

    // Smooth to avoid pumping/clicks
    const attack = 0.3;   // fast when gating down
    const release = 0.04; // slow when opening up
    this._gain += (target - this._gain) * (target < this._gain ? attack : release);

    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * this._gain;
    }
    return true;
  }
}

registerProcessor("noise-suppression", NoiseSuppressionProcessor);
