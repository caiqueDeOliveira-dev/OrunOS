// Shared types, constants, and icons for Creator Video workspace

export interface VideoClip {
  id: string;
  trackIndex: number;
  name: string;
  color: string;
  startFrame: number;
  durationFrames: number;
  type: "video" | "audio" | "text" | "effect";
  waveformData?: number[];
}

export interface VideoState {
  [key: string]: unknown;
  clips: VideoClip[];
  currentTimeFrame: number;
  totalFrames: number;
  fps: number;
  isPlaying: boolean;
  zoomLevel: number;
  selectedClipId: string | null;
  posX: number;
  posY: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  speed: number;
  blendMode: string;
  tool: string;
  snapEnabled: boolean;
  previewQuality: string;
  undoStack: VideoClip[][];
  redoStack: VideoClip[][];
  trackMuted: Record<number, boolean>;
  trackSolo: Record<number, boolean>;
  copiedClip: VideoClip | null;
  font: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: "left" | "center" | "right";
  textColor: string;
  selectedEffect: string | null;
  selectedTransition: string | null;
}

export const FPS = 30;
export const TOTAL_SECONDS = 204;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

export const TRACK_CONFIG = [
  { name: "\u{1F4F9} V\u00eddeo", color: "#E04040", controls: "eye-lock" as const },
  { name: "\u{1F3B5} M\u00fasica", color: "#7B2FBE", controls: "solo-mute" as const },
  { name: "\u{1F3A4} Narra\u00e7\u00e3o", color: "#2D9B5A", controls: "solo-mute" as const },
  { name: "\u270F\uFE0F Texto", color: "#D4A017", controls: "eye" as const },
];

export const MEDIA_TABS = ["M\u00eddia", "Texto", "Efeitos", "Transi\u00e7\u00f5es"];

export const MEDIA_ITEMS_GRID = [
  { label: "Intro.mp4", color: "#1a1a2e", ratio: "16/9" as const, dur: "0:12" },
  { label: "BRoll 01.mp4", color: "#1a3a5e", ratio: "16/9" as const, dur: "0:34" },
  { label: "BRoll 02.mp4", color: "#1a4e2a", ratio: "16/9" as const, dur: "0:22" },
  { label: "Close-up.mp4", color: "#5e3a1a", ratio: "16/9" as const, dur: "0:08" },
];

export const TEXT_PRESETS = [
  { label: "T\u00edtulo", preview: "T\u00cdTULO", bg: "#C00018", weight: 800, size: 13 },
  { label: "Subt\u00edtulo", preview: "SUB", bg: "#2D7FF9", weight: 700, size: 11 },
  { label: "Legenda", preview: "Legenda", bg: "#30363D", weight: 400, size: 9 },
];

export const EFFECTS = [
  { label: "S\u00e9pia", color: "#A0703C" },
  { label: "Vivido", color: "#D04040" },
  { label: "Frio", color: "#4080D0" },
  { label: "Cinematic", color: "#2A1F3D" },
  { label: "VHS", color: "#8B6914" },
];

export const TRANSITIONS = [
  { label: "Fade", arrow: "\u2195" },
  { label: "Slide", arrow: "\u2190" },
  { label: "Zoom", arrow: "\u2295" },
  { label: "Dissolve", arrow: "\u25CE" },
  { label: "Glitch", arrow: "\u26A1" },
];

export const MONO = "'JetBrains Mono', monospace";
export const SANS = "'Sora', sans-serif";

export const btnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  color: "#8B949E",
  cursor: "pointer",
  borderRadius: 3,
  transition: "all 0.12s",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 22,
  background: "var(--secondary, #0D1117)",
  border: "1px solid #30363D",
  borderRadius: 3,
  padding: "0 5px",
  fontSize: 10,
  fontFamily: MONO,
  color: "#C9D1D9",
  outline: "none",
  boxSizing: "border-box",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 9,
  color: "#8B949E",
  fontFamily: SANS,
  marginBottom: 2,
  display: "block",
};

export function formatTC(frame: number, fps: number): string {
  const totalSec = frame / fps;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const f = frame % fps;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
}

export function formatTCShort(frame: number, fps: number): string {
  const totalSec = frame / fps;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Inline SVG Icons
export function IPointer() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>);
}
export function IScissors() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>);
}
export function ITrash() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>);
}
export function ICopy() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>);
}
export function IPaste() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>);
}
export function ITrim() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v12" /><circle cx="18" cy="12" r="3" /><path d="M18 3v12" /><circle cx="6" cy="12" r="3" /><path d="M3 12h3m12 0h3" /></svg>);
}
export function IUndo() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>);
}
export function IRedo() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>);
}
export function IPlay() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>);
}
export function IPause() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>);
}
export function ISkipBack() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><line x1="18" y1="5" x2="18" y2="19" /></svg>);
}
export function ISkipFwd() {
  return (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 7 18 12 13 17" /><line x1="6" y1="5" x2="6" y2="19" /></svg>);
}
export function IFramePrev() {
  return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><line x1="18" y1="5" x2="18" y2="19" /></svg>);
}
export function IFrameNext() {
  return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 7 18 12 13 17" /><line x1="6" y1="5" x2="6" y2="19" /></svg>);
}
export function IMaximize() {
  return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>);
}
export function IZoomIn() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>);
}
export function IZoomOut() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>);
}
export function IVolIcon() {
  return (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>);
}
export function IEye() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>);
}
export function IEyeOff() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>);
}
export function ILock() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>);
}
export function IBold() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" /><path d="M6 12h9a4 4 0 010 8H6z" /></svg>);
}
export function IItalic() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>);
}
export function IUnderline() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>);
}
export function IAlignL() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>);
}
export function IAlignC() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" /></svg>);
}
export function IAlignR() {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>);
}
