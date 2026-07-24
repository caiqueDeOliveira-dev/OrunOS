// Creator Video store — shared by all components
import { createStore } from "../../lib/store";
import { FPS, TOTAL_FRAMES, type VideoState } from "./video-types";

export const useVideoStore = createStore<VideoState>({
  clips: [],
  currentTimeFrame: 0,
  totalFrames: TOTAL_FRAMES,
  fps: FPS,
  isPlaying: false,
  zoomLevel: 1,
  selectedClipId: null,
  posX: 0,
  posY: 0,
  scale: 100,
  rotation: 0,
  opacity: 100,
  volume: 80,
  fadeIn: 0,
  fadeOut: 0,
  speed: 1,
  blendMode: "Normal",
  tool: "select",
  snapEnabled: true,
  previewQuality: "1080p",
  undoStack: [],
  redoStack: [],
  trackMuted: {},
  trackSolo: {},
  copiedClip: null,
  font: "Inter",
  fontSize: 48,
  bold: false,
  italic: false,
  underline: false,
  textAlign: "left" as const,
  textColor: "#FFFFFF",
  selectedEffect: null,
  selectedTransition: null,
});

// Undo/Redo helpers
export function pushUndo() {
  const s = useVideoStore.getState();
  useVideoStore.setState({
    undoStack: [...s.undoStack.slice(-49), s.clips],
    redoStack: [],
  });
}

export function undo() {
  const s = useVideoStore.getState();
  if (s.undoStack.length === 0) return;
  const prev = s.undoStack[s.undoStack.length - 1];
  useVideoStore.setState({
    undoStack: s.undoStack.slice(0, -1),
    redoStack: [...s.redoStack, s.clips],
    clips: prev,
  });
}

export function redo() {
  const s = useVideoStore.getState();
  if (s.redoStack.length === 0) return;
  const next = s.redoStack[s.redoStack.length - 1];
  useVideoStore.setState({
    redoStack: s.redoStack.slice(0, -1),
    undoStack: [...s.undoStack, s.clips],
    clips: next,
  });
}
