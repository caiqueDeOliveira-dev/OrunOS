// Shared types and style constants for Creator Audio workspace

export interface Channel {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  active: boolean;
  eqHi: number;
  eqMid: number;
  eqLo: number;
  cue: boolean;
}

export interface EffectSlot {
  name: string;
  active: boolean;
  wetDry: number;
  paramX: number;
  paramY: number;
  color: string;
}

export interface SamplePad {
  name: string;
  category: "drums" | "bass" | "synth" | "fx";
  active: boolean;
}

export interface DJState {
  [key: string]: unknown;
  channels: Channel[];
  masterVolume: number;
  crossfader: number;
  bpm: number;
  isPlaying: boolean;
  isRecording: boolean;
  syncOn: boolean;
  recordTime: number;
  recordFormat: "WAV" | "MP3" | "FLAC";
  recordQuality: "Baixa" | "Média" | "Alta";
  deckA: { track: string; artist: string; current: string; total: string; pitch: number; position: number; key: string; bpm: number; loaded: boolean; waveformData: number[] };
  deckB: { track: string; artist: string; current: string; total: string; pitch: number; position: number; key: string; bpm: number; loaded: boolean; waveformData: number[] };
  effects: EffectSlot[];
  samples: SamplePad[];
  lowerTab: "efeitos" | "samples" | "gravacao";
  cueMix: number;
  headphoneVolume: number;
  hotCuesA: (number | null)[];
  hotCuesB: (number | null)[];
  cuePointA: number | null;
  cuePointB: number | null;
  tapTimes: number[];
  playingDeck: "A" | "B" | null;
}

export const CHANNEL_COLORS = ["#C00018", "#3B82F6", "#22C55E", "#F59E0B"];
export const CHANNEL_NAMES = ["CH 1", "CH 2", "CH 3", "CH 4"];

export const SAMPLE_NAMES: { name: string; category: SamplePad["category"] }[] = [
  { name: "Kick", category: "drums" }, { name: "Snare", category: "drums" },
  { name: "HiHat", category: "drums" }, { name: "Clap", category: "drums" },
  { name: "Tom", category: "drums" }, { name: "Ride", category: "drums" },
  { name: "Perc 1", category: "drums" }, { name: "Perc 2", category: "drums" },
  { name: "Sub Bass", category: "bass" }, { name: "Reese", category: "bass" },
  { name: "Acid", category: "bass" }, { name: "Wobble", category: "bass" },
  { name: "Pad", category: "synth" }, { name: "Lead", category: "synth" },
  { name: "Chord", category: "synth" }, { name: "Pluck", category: "synth" },
];

export const CATEGORY_COLORS: Record<SamplePad["category"], string> = {
  drums: "#8B5CF6", bass: "#3B82F6", synth: "#C00018", fx: "#22C55E",
};

export const EFFECT_COLORS = ["#C00018", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#06B6D4"];

// Style constants
export const BG = "var(--background, #0A0E17)";
export const PANEL = "var(--card, #121722)";
export const STRIP = "var(--secondary, #161D2A)";
export const ACCENT = "#C00018";
export const GREEN = "#22C55E";
export const TEXT_DIM = "var(--muted-foreground, rgba(255,255,255,0.3))";
export const TEXT_MED = "var(--muted-foreground, rgba(255,255,255,0.5))";
export const TEXT_BRI = "var(--foreground, rgba(255,255,255,0.8))";
export const BORDER = "var(--border, rgba(255,255,255,0.06))";
export const BORDER_MED = "var(--border, rgba(255,255,255,0.1))";
export const FONT_MONO = "'JetBrains Mono', monospace";
export const FONT_LABEL = "'Sora', sans-serif";
