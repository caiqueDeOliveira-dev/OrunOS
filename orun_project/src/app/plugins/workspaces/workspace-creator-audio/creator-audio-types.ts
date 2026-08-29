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
  lowerTab: "efeitos" | "samples" | "gravacao" | "vocal" | "sequencer";
  cueMix: number;
  headphoneVolume: number;
  hotCuesA: (number | null)[];
  hotCuesB: (number | null)[];
  cuePointA: number | null;
  cuePointB: number | null;
  tapTimes: number[];
  playingDeck: "A" | "B" | null;
  undoStack: Channel[][];
  redoStack: Channel[][];
}

export const CHANNEL_COLORS = ["#C3002F", "#4DA3FF", "#00D26A", "#FFB547"];
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
  drums: "#8B5CF6", bass: "#4DA3FF", synth: "#C3002F", fx: "#00D26A",
};

export const EFFECT_COLORS = ["#C3002F", "#4DA3FF", "#00D26A", "#FFB547", "#8B5CF6", "#4DA3FF"];

// Style constants (premium Orun OS theme tokens — see ../premium.tsx)
export const BG = "var(--background)";
export const PANEL = "var(--surface-1)";
export const STRIP = "var(--surface-2)";
export const ACCENT = "var(--primary)";
export const GREEN = "var(--ok)";
export const TEXT_DIM = "var(--text-tertiary)";
export const TEXT_MED = "var(--text-secondary)";
export const TEXT_BRI = "var(--text-primary)";
export const BORDER = "var(--border)";
export const BORDER_MED = "var(--border)";
export const FONT_MONO = "'JetBrains Mono', monospace";
export const FONT_LABEL = "'Sora', sans-serif";
