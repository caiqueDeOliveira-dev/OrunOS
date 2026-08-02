import { Cloud, TreePine, Waves, CupSoda, Flame, Ear } from "lucide-react";

export type AmbientSoundType = "rain" | "forest" | "ocean" | "cafe" | "fire" | "white_noise";

export interface AmbientSound {
  id: AmbientSoundType;
  name: string;
  icon: string;
  color: string;
  src: string;
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "rain", name: "sounds_rain", icon: "Cloud", color: "#3B82F6", src: "" },
  { id: "forest", name: "sounds_forest", icon: "TreePine", color: "#22C55E", src: "" },
  { id: "ocean", name: "sounds_ocean", icon: "Waves", color: "#06B6D4", src: "" },
  { id: "cafe", name: "sounds_cafe", icon: "CupSoda", color: "#F59E0B", src: "" },
  { id: "fire", name: "sounds_fire", icon: "Flame", color: "#EF4444", src: "" },
  { id: "white_noise", name: "sounds_white_noise", icon: "Ear", color: "#8B5CF6", src: "" },
];

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

let masterGain: GainNode | null = null;

function getMasterGain(): GainNode {
  if (!masterGain) {
    const ctx = getContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

interface ActiveSound {
  type: AmbientSoundType;
  nodes: AudioNode[];
  stop: () => void;
}

const activeSounds = new Map<AmbientSoundType, ActiveSound>();

function createWhiteNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createBrownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function startRain(): ActiveSound {
  const ctx = getContext();
  const master = getMasterGain();

  const noise = createBrownNoise(ctx);
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 800;
  lpf.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.6;

  noise.connect(lpf);
  lpf.connect(gain);
  gain.connect(master);
  noise.start();

  return {
    type: "rain",
    nodes: [noise, lpf, gain],
    stop: () => { try { noise.stop(); } catch {} },
  };
}

function startForest(): ActiveSound {
  const ctx = getContext();
  const master = getMasterGain();

  const bgNoise = createBrownNoise(ctx);
  const bgLPF = ctx.createBiquadFilter();
  bgLPF.type = "lowpass";
  bgLPF.frequency.value = 400;
  bgLPF.Q.value = 0.3;
  const bgGain = ctx.createGain();
  bgGain.gain.value = 0.15;
  bgNoise.connect(bgLPF);
  bgLPF.connect(bgGain);
  bgGain.connect(master);
  bgNoise.start();

  const chirpInterval = setInterval(() => {
    try {
      const osc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 2000 + Math.random() * 3000;
      chirpGain.gain.value = 0.08;
      chirpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1 + Math.random() * 0.15);
      osc.connect(chirpGain);
      chirpGain.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1 + Math.random() * 0.15);
    } catch {}
  }, 200 + Math.random() * 800);

  return {
    type: "forest",
    nodes: [bgNoise, bgLPF, bgGain],
    stop: () => {
      clearInterval(chirpInterval);
      try { bgNoise.stop(); } catch {}
    },
  };
}

function startOcean(): ActiveSound {
  const ctx = getContext();
  const master = getMasterGain();

  const noise = createBrownNoise(ctx);
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 300;
  lpf.Q.value = 1;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 250;
  lfo.connect(lfoGain);
  lfoGain.connect(lpf.frequency);
  lfo.start();

  const gain = ctx.createGain();
  gain.gain.value = 0.5;

  noise.connect(lpf);
  lpf.connect(gain);
  gain.connect(master);
  noise.start();

  return {
    type: "ocean",
    nodes: [noise, lpf, lfo, lfoGain, gain],
    stop: () => {
      try { lfo.stop(); } catch {}
      try { noise.stop(); } catch {}
    },
  };
}

function startCafe(): ActiveSound {
  const ctx = getContext();
  const master = getMasterGain();

  const noise = createWhiteNoise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 0.3;
  const bgGain = ctx.createGain();
  bgGain.gain.value = 0.12;
  noise.connect(bp);
  bp.connect(bgGain);
  bgGain.connect(master);
  noise.start();

  const cupInterval = setInterval(() => {
    try {
      const osc = ctx.createOscillator();
      const cupGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 800 + Math.random() * 400;
      cupGain.gain.setValueAtTime(0.06, ctx.currentTime);
      cupGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(cupGain);
      cupGain.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);

      const noisePop = createWhiteNoise(ctx);
      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.04, ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      noisePop.connect(popGain);
      popGain.connect(master);
      noisePop.start(ctx.currentTime);
      noisePop.stop(ctx.currentTime + 0.04);
    } catch {}
  }, 2000 + Math.random() * 4000);

  return {
    type: "cafe",
    nodes: [noise, bp, bgGain],
    stop: () => {
      clearInterval(cupInterval);
      try { noise.stop(); } catch {}
    },
  };
}

function startFire(): ActiveSound {
  const ctx = getContext();
  const master = getMasterGain();

  const noise = createWhiteNoise(ctx);
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 400;
  lpf.Q.value = 0.8;
  const bgGain = ctx.createGain();
  bgGain.gain.value = 0.25;
  noise.connect(lpf);
  lpf.connect(bgGain);
  bgGain.connect(master);
  noise.start();

  const crackInterval = setInterval(() => {
    try {
      const popNoise = createWhiteNoise(ctx);
      const popLPF = ctx.createBiquadFilter();
      popLPF.type = "lowpass";
      popLPF.frequency.value = 600 + Math.random() * 800;
      const popGain = ctx.createGain();
      const vol = 0.04 + Math.random() * 0.08;
      popGain.gain.setValueAtTime(vol, ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05 + Math.random() * 0.1);
      popNoise.connect(popLPF);
      popLPF.connect(popGain);
      popGain.connect(master);
      popNoise.start(ctx.currentTime);
      popNoise.stop(ctx.currentTime + 0.05 + Math.random() * 0.1);
    } catch {}
  }, 100 + Math.random() * 300);

  return {
    type: "fire",
    nodes: [noise, lpf, bgGain],
    stop: () => {
      clearInterval(crackInterval);
      try { noise.stop(); } catch {}
    },
  };
}

function startWhiteNoise(): ActiveSound {
  const ctx = getContext();
  const master = getMasterGain();

  const noise = createWhiteNoise(ctx);
  const gain = ctx.createGain();
  gain.gain.value = 0.3;
  noise.connect(gain);
  gain.connect(master);
  noise.start();

  return {
    type: "white_noise",
    nodes: [noise, gain],
    stop: () => { try { noise.stop(); } catch {} },
  };
}

const starters: Record<AmbientSoundType, () => ActiveSound> = {
  rain: startRain,
  forest: startForest,
  ocean: startOcean,
  cafe: startCafe,
  fire: startFire,
  white_noise: startWhiteNoise,
};

export function startSound(type: string): void {
  if (activeSounds.has(type as AmbientSoundType)) return;
  const starter = starters[type as AmbientSoundType];
  if (!starter) return;

  if (getContext().state === "suspended") {
    getContext().resume();
  }

  const active = starter();
  activeSounds.set(type as AmbientSoundType, active);
}

export function stopSound(type: string): void {
  const active = activeSounds.get(type as AmbientSoundType);
  if (!active) return;
  active.stop();
  activeSounds.delete(type as AmbientSoundType);
}

export function setVolume(vol: number): void {
  const master = getMasterGain();
  master.gain.value = Math.max(0, Math.min(1, vol));
}

export function stopAll(): void {
  activeSounds.forEach((active) => active.stop());
  activeSounds.clear();
}

export function getActiveSounds(): string[] {
  return Array.from(activeSounds.keys());
}
