import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Square, X, AudioLines } from "lucide-react";
import { useVoice } from "../hooks/useVoice";
import { useChat } from "../hooks/useChat";
import { useTTS } from "../hooks/useTTS";
import { useVoiceSettings } from "../hooks/useVoiceSettings";
import { useTranslation } from "../../i18n/I18nProvider";
import { getHamptonReplies } from "../constants";
import type { HamptonState } from "../types";
import type { CommandMatch } from "../voice/voice-commands";
import { extractOpenTarget } from "../voice/voice-commands";

interface VoiceOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  proactivePrompt?: { prompt: string; source?: string } | null;
  onProactiveHandled?: () => void;
}

const BUBBLE_SIZE = 52;
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 400;
const MARGIN = 12;

export const VoiceOverlay = React.memo(function VoiceOverlay({
  visible,
  onDismiss,
  proactivePrompt,
  onProactiveHandled,
}: VoiceOverlayProps) {
  const { t } = useTranslation();
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissingRef = useRef(false);
  const [state, setState] = useState<HamptonState>("idle");
  const [volume, setVolume] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const spokenUpToRef = useRef(0);
  const voiceSettings = useVoiceSettings();
  const tts = useTTS({ spokenUpToRef });

  const chat = useChat({
    t,
    onHamptonStateChange: setState,
    speak: tts.speak,
    speakIncremental: tts.speakIncremental,
    speakRemainder: tts.speakRemainder,
    getHamptonReplies: () => getHamptonReplies(t),
    spokenUpToRef,
    voiceMode: true,
  });

  const handleVoiceCommand = useCallback((command: CommandMatch) => {
    switch (command.command.action) {
      case "stop":
      case "cancel":
        tts.stopTTS();
        break;
      case "clear":
        chat.startNewChat();
        break;
      case "help":
        tts.speak("Posso parar de falar, repetir, limpar a conversa ou abrir um aplicativo. Basta pedir!");
        break;
      case "open": {
        const target = extractOpenTarget(command.text || command.match);
        if (target) {
          window.dispatchEvent(new CustomEvent("voice:open", { detail: { target, text: command.text } }));
          tts.speak("Abrindo!");
        } else {
          tts.speak("Qual aplicativo você quer abrir?");
        }
        break;
      }
      default:
        break;
    }
  }, [tts, chat]);

  const voice = useVoice({
    onTranscript: (text) => {
      if (dismissingRef.current) return;
      chat.handleSend(text);
    },
    onStateChange: setState,
    onVolume: setVolume,
    onCommand: handleVoiceCommand,
    onStopTTS: tts.stopTTS,
    wakeWordEnabled: voiceSettings.wakeWordEnabled,
    whisperConfig: voiceSettings.whisperUrl ? { baseUrl: voiceSettings.whisperUrl, language: "pt" } : undefined,
    conversationalMode: voiceSettings.conversationalMode,
    externalHamptonState: state,
    noiseSuppression: voiceSettings.noiseSuppression,
    responseDelay: voiceSettings.responseDelay,
    sustainedInterrupt: voiceSettings.sustainedInterrupt,
    t,
  });

  const handleDismiss = useCallback(() => {
    dismissingRef.current = true;
    voice.stopRecording();
    tts.stopTTS();
    chat.cleanup();
    voice.cleanup();
    onDismiss();
  }, [voice, tts, chat, onDismiss]);

  const handleDismissRef = useRef(handleDismiss);
  handleDismissRef.current = handleDismiss;

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Position the bubble bottom-right by default
  useEffect(() => {
    if (typeof window === "undefined" || pos) return;
    setPos({ x: window.innerWidth - BUBBLE_SIZE - 20, y: window.innerHeight - BUBBLE_SIZE - 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visible, chat.messages.length]);

  const onBubblePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = posRef.current;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: p?.x ?? 0, baseY: p?.y ?? 0, moved: false };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      if (!d.moved) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.min(Math.max(8, d.baseX + dx), vw - BUBBLE_SIZE - 8);
      const y = Math.min(Math.max(8, d.baseY + dy), vh - BUBBLE_SIZE - 8);
      setPos({ x, y });
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const toggleMic = useCallback(() => {
    if (state === "listening") {
      voice.stopRecording();
    } else {
      voice.startRecording();
    }
  }, [state, voice]);

  const openVoices = useCallback(() => {
    window.dispatchEvent(new CustomEvent("voice:openVoices"));
  }, []);

  // When overlay becomes visible, start recording — unless a proactive prompt
  // arrived (wake command / boot greeting / Spotify), in which case send it to
  // the agent and let the conversational mode pick up the mic after Hampton speaks.
  const proactiveRef = useRef(proactivePrompt);
  proactiveRef.current = proactivePrompt;
  const handledProactiveRef = useRef<unknown>(null);

  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      chat.startNewChat();
      const p = proactiveRef.current;
      if (p && p.prompt && handledProactiveRef.current !== p) {
        handledProactiveRef.current = p;
        onProactiveHandled?.();
        chat.handleSend(p.prompt);
      } else {
        voice.startRecording();
      }
    } else {
      handleDismissRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Handle a proactive prompt arriving while the overlay is ALREADY visible
  // (visible didn't transition, so the effect above won't re-run).
  useEffect(() => {
    if (!visible || !proactivePrompt) return;
    if (handledProactiveRef.current === proactivePrompt) return;
    handledProactiveRef.current = proactivePrompt;
    onProactiveHandled?.();
    voice.stopRecording();
    chat.startNewChat();
    chat.handleSend(proactivePrompt.prompt);
  }, [visible, proactivePrompt, chat, voice, onProactiveHandled]);

  // Auto-dismiss: 30s idle/listening, 60s speaking, never while thinking.
  useEffect(() => {
    if (!visible) {
      clearDismissTimer();
      return;
    }
    clearDismissTimer();
    if (state === "thinking") return;
    const delay = state === "speaking" ? 60000 : 30000;
    dismissTimerRef.current = setTimeout(() => handleDismissRef.current(), delay);
    return clearDismissTimer;
  }, [visible, state, clearDismissTimer]);

  // Escape key dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, handleDismiss]);

  // Cleanup on real unmount only. MUST NOT key on [tts, chat]: those objects are
  // recreated every render, so a deps'd cleanup ran after EVERY render and called
  // chat.cleanup() (cancelling an in-flight autonomous request via the cancel
  // stream) and tts.stopTTS() (killing speech right as it started) — which is
  // exactly the "voice hangs / hears nothing" bug. Use refs + empty deps so the
  // cleanup fires once, with the latest methods.
  const latestTtsRef = useRef(tts);
  latestTtsRef.current = tts;
  const latestChatRef = useRef(chat);
  latestChatRef.current = chat;
  useEffect(() => () => {
    latestTtsRef.current.stopTTS();
    latestChatRef.current.cleanup();
  }, []);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let panelX = vw - PANEL_WIDTH - MARGIN;
  let panelY = vh - PANEL_HEIGHT - BUBBLE_SIZE - MARGIN;
  if (pos) {
    let px = pos.x - PANEL_WIDTH - MARGIN;
    if (px < MARGIN) px = pos.x + BUBBLE_SIZE + MARGIN;
    px = Math.max(MARGIN, Math.min(px, vw - PANEL_WIDTH - MARGIN));
    let py = pos.y - PANEL_HEIGHT + BUBBLE_SIZE;
    if (py < MARGIN) py = pos.y + BUBBLE_SIZE + MARGIN;
    py = Math.max(MARGIN, Math.min(py, vh - PANEL_HEIGHT - MARGIN));
    panelX = px;
    panelY = py;
  }

  const active = state !== "idle";

  return (
    <AnimatePresence>
      {visible && pos && (
        <div className="fixed z-[9999]" style={{ pointerEvents: "none" }}>
          {/* Panel */}
          <motion.div
            className="fixed flex flex-col overflow-hidden rounded-2xl border"
            style={{
              left: panelX,
              top: panelY,
              width: PANEL_WIDTH,
              height: PANEL_HEIGHT,
              background: "#0A0A0C",
              borderColor: "rgba(195,0,47,0.25)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 40px rgba(195,0,47,0.08)",
              pointerEvents: "auto",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0" style={{ background: "#141414", borderColor: "#252525" }}>
              <img src="./LogoIA.png" alt="Hampton" className="rounded-full" style={{ width: 22, height: 22, objectFit: "cover" }} />
              <span className="text-[10px] tracking-widest uppercase flex-1" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
                {state === "listening" && t("voiceOverlayListening")}
                {state === "thinking" && t("voiceOverlayThinking")}
                {state === "speaking" && t("voiceOverlaySpeaking")}
                {state === "idle" && "Hampton"}
              </span>
              <button onClick={openVoices} title="Vozes" style={{ color: "rgba(255,255,255,0.55)" }} className="hover:opacity-80">
                <AudioLines size={15} />
              </button>
              <button onClick={handleDismiss} title="Fechar (ESC)" style={{ color: "rgba(255,255,255,0.55)" }} className="hover:opacity-80">
                <X size={15} />
              </button>
            </div>

            {/* Transcript */}
            <div ref={listRef} className="ws-scrollbar flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
              {chat.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-70">
                  <span className="text-[11px] tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#C00018" }}>
                    {active ? "..." : "Fale comigo"}
                  </span>
                </div>
              )}
              {chat.messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className="flex" style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    <div
                      className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[12px] leading-relaxed"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: "pre-wrap",
                        color: isUser ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.78)",
                        background: isUser ? "rgba(192,0,24,0.18)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isUser ? "rgba(192,0,24,0.35)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {m.content || (m.toolCalls?.length ? "…" : "")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer: mic + visualizer */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-t shrink-0" style={{ background: "#141414", borderColor: "#252525" }}>
              <div className="flex-1" style={{ height: 24 }}>
                <AudioVisualizer active={active} volume={volume} />
              </div>
              <button
                onClick={toggleMic}
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: state === "listening" ? "#C0002F" : "rgba(192,0,47,0.15)",
                  border: `1px solid ${state === "listening" ? "#C0002F" : "rgba(192,0,47,0.4)"}`,
                  color: "#fff",
                }}
                title={state === "listening" ? "Parar" : "Falar"}
              >
                {state === "listening" ? <Square size={15} /> : <Mic size={15} />}
              </button>
            </div>
          </motion.div>

          {/* Bubble */}
          <motion.div
            className="fixed flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
            style={{
              left: pos.x,
              top: pos.y,
              width: BUBBLE_SIZE,
              height: BUBBLE_SIZE,
              background: "#0A0A0C",
              border: `1px solid ${active ? "#C0002F" : "rgba(195,0,47,0.35)"}`,
              boxShadow: active
                ? "0 8px 32px rgba(192,0,47,0.35), 0 0 0 0 rgba(192,0,47,0.4)"
                : "0 8px 24px rgba(0,0,0,0.5)",
              pointerEvents: "auto",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onPointerDown={onBubblePointerDown}
          >
            <img src="./LogoIA.png" alt="" style={{ width: 40, height: 40, objectFit: "cover" }} draggable={false} />
            {active && (
              <span
                className="absolute rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  right: 1,
                  bottom: 1,
                  background: "#C0002F",
                  animation: "orunStatePulse 1s ease-in-out infinite",
                }}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

/* ── Audio Visualizer ─────────────────────────────────────────────────── */
const BAR_COUNT = 40;
const COLOR = "#C00018";

function AudioVisualizer({ active, volume }: { active: boolean; volume: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const barW = w / BAR_COUNT;
    const maxH = h * 0.9;
    const minH = 1;
    const centerY = h / 2;

    const bars = barsRef.current;

    for (let i = 0; i < BAR_COUNT; i++) {
      const phase = Date.now() / 180 + i * 0.35;
      const wave = Math.sin(phase) ** 2;
      const volBoost = active ? 0.15 + volume * 0.85 : 0;
      const target = active
        ? minH + (maxH - minH) * wave * volBoost
        : minH;

      bars[i] += (target - bars[i]) * 0.22;
      const barH = Math.max(minH, bars[i]);
      const x = i * barW;
      const y = centerY - barH / 2;

      const distFromCenter = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
      const alpha = active ? 0.4 + 0.6 * (1 - distFromCenter) * volBoost : 0.1;

      ctx.fillStyle = COLOR;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.roundRect(x + 1, y, barW - 2, barH, 1);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    animRef.current = requestAnimationFrame(draw);
  }, [active, volume]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ borderRadius: 4 }} />;
}
