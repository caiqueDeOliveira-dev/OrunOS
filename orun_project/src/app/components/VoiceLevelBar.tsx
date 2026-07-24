// VoiceLevelBar — visual audio level indicator above chat
// Shows green (speaking) → yellow (fading) → red (quiet) based on mic volume
import React, { useEffect, useRef } from "react";

interface VoiceLevelBarProps {
  volume: number; // 0-1
  active: boolean; // mic is on
  state: "idle" | "listening" | "thinking" | "speaking";
}

export const VoiceLevelBar = React.memo(function VoiceLevelBar({
  volume,
  active,
  state,
}: VoiceLevelBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const smoothVolume = useRef(0);

  useEffect(() => {
    if (!active) {
      smoothVolume.current = 0;
      if (barRef.current) {
        barRef.current.style.width = "0%";
        barRef.current.style.background = "var(--muted)";
      }
      return;
    }

    // Smooth the volume for visual effect
    const target = volume;
    smoothVolume.current += (target - smoothVolume.current) * 0.3;
    const v = smoothVolume.current;

    if (barRef.current) {
      const pct = Math.min(100, Math.max(2, v * 100));
      barRef.current.style.width = `${pct}%`;

      // Color: green > 0.4, yellow > 0.15, red below
      if (state === "thinking") {
        barRef.current.style.background = "#8B5CF6"; // purple for thinking
      } else if (v > 0.4) {
        barRef.current.style.background = "#22C55E"; // green
      } else if (v > 0.15) {
        barRef.current.style.background = "#EAB308"; // yellow
      } else {
        barRef.current.style.background = "#EF4444"; // red
      }
    }
  }, [volume, active, state]);

  if (!active && state === "idle") return null;

  return (
    <div
      style={{
        width: "100%",
        height: 3,
        background: "var(--border)",
        borderRadius: 2,
        overflow: "hidden",
        transition: "opacity 0.2s",
        opacity: active ? 1 : 0.3,
      }}
    >
      <div
        ref={barRef}
        style={{
          height: "100%",
          width: "0%",
          borderRadius: 2,
          transition: "width 0.08s ease-out, background 0.15s ease",
        }}
      />
    </div>
  );
});
