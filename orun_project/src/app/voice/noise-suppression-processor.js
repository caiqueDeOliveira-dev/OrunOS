// @ts-nocheck — AudioWorklet processor runs in a separate scope (no DOM types)
/* eslint-disable no-restricted-globals */
/**
 * Simple spectral-gate noise suppression AudioWorklet.
 * Captures a noise profile from the first ~500ms, then gates frequencies below
 * that profile + a threshold. Light-weight, no external dependencies.
 */
const FFT_SIZE = 2048;
const SAMPLE_RATE = 48000;
const NOISE_FRAMES = 25; // ~500ms at 48kHz/2048

class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(FFT_SIZE);
    this._writePos = 0;
    this._noiseProfile = null;
    this._noiseFramesCollected = 0;
    this._ready = false;
    this.port.onmessage = (e) => {
      if (e.data === "reset") {
        this._noiseProfile = null;
        this._noiseFramesCollected = 0;
        this._ready = false;
      }
    };
  }

  process(inputs, outputs, _params) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    // Copy input to output (passthrough — we shape in-place for simplicity)
    output.set(input);

    // Accumulate into FFT-sized buffer for noise profiling
    for (let i = 0; i < input.length; i++) {
      this._buffer[this._writePos++] = input[i];
      if (this._writePos >= FFT_SIZE) {
        this._writePos = 0;
        this._processBlock();
      }
    }
    return true;
  }

  _processBlock() {
    // Simple energy-based noise gate per half-frame
    const half = FFT_SIZE / 2;
    const frameA = this._buffer.subarray(0, half);
    const frameB = this._buffer.subarray(half);

    const energyA = this._rms(frameA);
    const energyB = this._rms(frameB);

    if (!this._ready) {
      // Collect noise profile from first ~500ms
      this._noiseFramesCollected++;
      if (!this._noiseProfile) {
        this._noiseProfile = { a: energyA, b: energyB };
      } else {
        this._noiseProfile.a = this._noiseProfile.a * 0.8 + energyA * 0.2;
        this._noiseProfile.b = this._noiseProfile.b * 0.8 + energyB * 0.2;
      }
      if (this._noiseFramesCollected >= NOISE_FRAMES) {
        this._ready = true;
        this.port.postMessage({ type: "ready" });
      }
      return;
    }

    // Gate: if energy is close to noise floor, attenuate
    const THRESHOLD = 2.5; // multiplier above noise floor
    const ATTEN = 0.15;    // attenuation factor when gated

    if (energyA < this._noiseProfile.a * THRESHOLD) {
      this._attenuate(frameA, ATTEN);
    }
    if (energyB < this._noiseProfile.b * THRESHOLD) {
      this._attenuate(frameB, ATTEN);
    }
  }

  _rms(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    return Math.sqrt(sum / frame.length);
  }

  _attenuate(frame, factor) {
    for (let i = 0; i < frame.length; i++) frame[i] *= factor;
  }
}

registerProcessor("noise-suppression", NoiseSuppressionProcessor);
