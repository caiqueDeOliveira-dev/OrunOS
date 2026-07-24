// CreatorVideo — Root component that brings everything together
import { useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerVideoActions, unregisterVideoActions, setVideoStoreGetter } from "./video-actions";
import { useVideoStore, undo, redo, pushUndo } from "./video-store";
import { TopToolbar } from "./TopToolbar";
import { LeftSidebar } from "./LeftSidebar";
import { CenterPreview } from "./CenterPreview";
import { RightSidebar } from "./RightSidebar";
import { AudioMixer } from "./AudioMixer";
import { TimelineEditor } from "./TimelineEditor";

export function CreatorVideo({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  // Register video actions + store getter
  useEffect(() => {
    setVideoStoreGetter(() => useVideoStore);
    registerVideoActions();
    return () => unregisterVideoActions();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === " " && !e.ctrlKey && !e.metaKey) { e.preventDefault(); useVideoStore.setState((s) => ({ isPlaying: !s.isPlaying })); }
      if (e.key === "Delete" || e.key === "Backspace") {
        const s = useVideoStore.getState();
        if (s.selectedClipId) {
          pushUndo();
          useVideoStore.setState((st) => ({ clips: st.clips.filter((c) => c.id !== s.selectedClipId), selectedClipId: null }));
        }
      }
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        useVideoStore.setState({ tool: "split" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-play timer
  const isPlaying = useVideoStore((s) => s.isPlaying);
  const fps = useVideoStore((s) => s.fps);
  const totalFrames = useVideoStore((s) => s.totalFrames);
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => {
      useVideoStore.setState((s) => ({
        currentTimeFrame: s.currentTimeFrame >= s.totalFrames ? 0 : s.currentTimeFrame + 1,
        isPlaying: s.currentTimeFrame < s.totalFrames,
      }));
    }, 1000 / fps);
    return () => clearInterval(iv);
  }, [isPlaying, fps, totalFrames]);

  return (
    <div className="flex flex-col w-full h-full" style={{ background: "var(--background, #0D1117)", color: "var(--foreground, #C9D1D9)" }}>
      <TopToolbar />
      <div className="flex flex-1 min-h-0">
        <LeftSidebar />
        <CenterPreview />
        <RightSidebar />
      </div>
      <AudioMixer />
      <TimelineEditor />
    </div>
  );
}
