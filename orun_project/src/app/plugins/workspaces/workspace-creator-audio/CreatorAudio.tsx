import { useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { registerCreatorAudioActions, unregisterCreatorAudioActions, cleanupAudioEngine, getAudioEngine } from "./audio-engine";
import { useDJStore, pushAudioUndo } from "./creator-audio-store";
import { PremiumRoot } from "../premium";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { DeckPanel } from "./DeckPanel";
import { MixerCenter } from "./MixerCenter";
import { LowerSection } from "./LowerSection";

export function CreatorAudio({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {

  useEffect(() => {
    registerCreatorAudioActions();
    return () => { unregisterCreatorAudioActions(); cleanupAudioEngine(); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        useDJStore.setState((s) => ({ isPlaying: !s.isPlaying }));
      }
      if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        useDJStore.setState((s) => ({ isRecording: !s.isRecording }));
      }
      if (e.key === "m" && !e.ctrlKey && !e.metaKey) {
        const s = useDJStore.getState();
        useDJStore.setState({ channels: s.channels.map((ch) => ({ ...ch, muted: !ch.muted })) });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const masterVolume = useDJStore((s) => s.masterVolume);
  useEffect(() => {
    try {
      getAudioEngine().setMasterVolume(masterVolume);
    } catch {}
  }, [masterVolume]);

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
    <PremiumRoot>
      <TopBar />
      <div className="flex-[7] flex p-1.5 gap-1.5 min-h-0">
        <DeckPanel deck="A" />
        <MixerCenter />
        <DeckPanel deck="B" />
      </div>
      <LowerSection />
      <BottomBar />
      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </PremiumRoot>
  );
}
