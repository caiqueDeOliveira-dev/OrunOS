// CreatorAudio — Main workspace component (Virtual DJ style)
// Split into: DeckPanel, MixerCenter, FXRack, SamplePads, RecordingPanel, TopBar, BottomBar, LowerSection
import { useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerCreatorAudioActions, unregisterCreatorAudioActions, getAudioEngine } from "./audio-engine";
import { useDJStore } from "./creator-audio-store";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { DeckPanel } from "./DeckPanel";
import { MixerCenter } from "./MixerCenter";
import { LowerSection } from "./LowerSection";
import { BG, FONT_LABEL } from "./creator-audio-types";

export function CreatorAudio({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  useEffect(() => {
    registerCreatorAudioActions();
    return () => unregisterCreatorAudioActions();
  }, []);

  // Connect audio engine to effects via custom events
  useEffect(() => {
    const handleEffect = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      try {
        const engine = getAudioEngine();
        const delayNode = engine.getDelayNode();
        const delayGain = engine.getDelayGain();
        if (detail.type === "delay" && delayNode && delayGain) {
          delayGain.gain.value = detail.wetDry;
          delayNode.delayTime.value = detail.paramX * 0.8;
        }
      } catch {}
    };
    window.addEventListener("creator-audio:effect", handleEffect);
    return () => window.removeEventListener("creator-audio:effect", handleEffect);
  }, []);

  // Sync masterVolume to Web Audio engine
  const masterVolume = useDJStore((s) => s.masterVolume);
  useEffect(() => {
    try {
      getAudioEngine().setMasterVolume(masterVolume);
    } catch {}
  }, [masterVolume]);

  // Update deck A when AI generates a beat via workspace_action
  useEffect(() => {
    const handleBufferChanged = () => {
      try {
        const engine = getAudioEngine();
        const buf = engine.getCurrentBuffer?.();
        if (!buf) return;
        const waveformData = engine.getWaveformData?.(120) || [];
        const dur = buf.duration;
        const mm = String(Math.floor(dur / 60)).padStart(2, "0");
        const ss = String(Math.floor(dur % 60)).padStart(2, "0");
        useDJStore.setState((s: any) => ({
          deckA: {
            ...s.deckA,
            loaded: true,
            track: "AI Generated Beat",
            artist: "Hampton AI",
            total: `${mm}:${ss}`,
            waveformData,
          },
          isPlaying: false,
        }));
      } catch {}
    };
    window.addEventListener("creator-audio:buffer-changed", handleBufferChanged);
    return () => window.removeEventListener("creator-audio:buffer-changed", handleBufferChanged);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, overflow: "hidden", fontFamily: FONT_LABEL }}>
      {/* Top bar */}
      <TopBar />

      {/* Upper section: Decks + Mixer */}
      <div style={{ flex: 7, display: "flex", padding: "6px 8px", gap: 6, minHeight: 0 }}>
        <DeckPanel deck="A" />
        <MixerCenter />
        <DeckPanel deck="B" />
      </div>

      {/* Lower section */}
      <LowerSection />

      {/* Bottom bar */}
      <BottomBar />
    </div>
  );
}
