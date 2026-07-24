import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AvatarOrb } from "./AvatarOrb";
import { useVoiceOverlay } from "../hooks/useVoiceOverlay";
import { useTranslation } from "../../i18n/I18nProvider";

interface VoiceOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export const VoiceOverlay = React.memo(function VoiceOverlay({
  visible,
  onDismiss,
}: VoiceOverlayProps) {
  const { t } = useTranslation();
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, volume, startRecording, stopRecording, stopTTS, cleanup } = useVoiceOverlay({
    onStateChange: () => {},
    onVolume: () => {},
  });

  // When overlay becomes visible, start recording
  useEffect(() => {
    if (visible) {
      startRecording();
      // Auto-dismiss after 12s of inactivity
      dismissTimerRef.current = setTimeout(() => {
        stopRecording();
        stopTTS();
        cleanup();
        onDismiss();
      }, 12000);
    } else {
      stopRecording();
      stopTTS();
      cleanup();
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [visible]);

  // Reset dismiss timer when state changes to speaking (keep alive during response)
  useEffect(() => {
    if (state === "speaking" && dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        stopRecording();
        stopTTS();
        cleanup();
        onDismiss();
      }, 20000); // 20s during speaking
    }
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [state]);

  // Escape key dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopRecording();
        stopTTS();
        cleanup();
        onDismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onDismiss, stopRecording, stopTTS, cleanup]);

  const handleDismiss = useCallback(() => {
    stopRecording();
    stopTTS();
    cleanup();
    onDismiss();
  }, [onDismiss, stopRecording, stopTTS, cleanup]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleDismiss}
        >
          {/* Close hint */}
          <span
            className="absolute top-6 right-8 text-[10px] tracking-widest uppercase"
            style={{ fontFamily: "'Sora', sans-serif", color: "rgba(255,255,255,0.25)" }}
          >
            ESC
          </span>

          {/* Avatar */}
          <motion.div
            className="relative"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <AvatarOrb size={320} />
          </motion.div>

          {/* State label */}
          <AnimatePresence>
            {state !== "idle" && (
              <motion.span
                className="mt-5 text-[11px] tracking-[0.22em] uppercase"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  color: "#C00018",
                  animation: "orunStatePulse 1s ease-in-out infinite",
                  display: "inline-block",
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {state === "listening" && t("voiceOverlayListening")}
                {state === "thinking" && t("voiceOverlayThinking")}
                {state === "speaking" && t("voiceOverlaySpeaking")}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Audio visualizer — blood red line driven by mic volume */}
          <div
            className="mt-6 flex items-center justify-center"
            style={{ width: 320, height: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <AudioVisualizer active={state === "listening" || state === "speaking"} volume={volume} />
          </div>
        </motion.div>
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
    const maxH = h * 0.85;
    const minH = 1.2;
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
