// workspace-home-ia / HomeHampton.tsx
// Premium circular Hampton avatar for the Home dashboard.
// Black wolf head, glowing red eyes, luminous red ring that pulses
// while listening, waveform while speaking. No cartoon.

import { useEffect, useState } from "react";
import type { HamptonState } from "../../../types";

const RED = "#C3002F";

export function HomeHampton({ state, size = 190, image }: { state: HamptonState; size?: number; image?: string }) {
  const [tick, setTick] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const listening = state === "listening";
  const thinking = state === "thinking";
  const speaking = state === "speaking";
  const active = state !== "idle";

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, []);

  const ringPulse = listening || thinking ? "1s" : speaking ? "1.6s" : "3.5s";
  const glow = listening || thinking ? 0.55 : speaking ? 0.42 : 0.28;

  const eyeOpL = 0.55 + Math.sin(tick * 0.14) * 0.4;
  const eyeOpR = 0.55 + Math.sin(tick * 0.14 + 0.6) * 0.4;

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      {/* Listening — expanding ripple rings */}
      {listening && (
        <>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ inset: -size * 0.18, border: "1px solid rgba(195,0,47,0.35)", animation: "orunRipple 2s ease-out infinite" }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ inset: -size * 0.18, border: "1px solid rgba(195,0,47,0.2)", animation: "orunRipple 2s ease-out 0.7s infinite" }}
          />
        </>
      )}

      {/* Ambient glow halo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -size * 0.1,
          background: `radial-gradient(circle, rgba(195,0,47,${glow}) 0%, transparent 65%)`,
          animation: `orunAuraPulse ${ringPulse} ease-in-out infinite`,
        }}
      />

      {/* Luminous red ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -2,
          border: "1px solid rgba(195,0,47,0.45)",
          boxShadow: `0 0 ${Math.round(size * 0.07)}px rgba(195,0,47,${active ? 0.5 : 0.3}), inset 0 0 ${Math.round(size * 0.05)}px rgba(195,0,47,0.12)`,
          animation: `orunAuraPulse ${ringPulse} ease-in-out infinite`,
        }}
      />

      {/* Disc */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: 0,
          background: "radial-gradient(circle at 50% 28%, #17171b 0%, #0c0c0f 55%, #050505 100%)",
          border: "1px solid #252525",
        }}
      >
        {/* Subtle red ambient light from below */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 110%, rgba(195,0,47,0.12) 0%, transparent 55%)" }}
        />

        {image && !imgFailed ? (
          <img
            src={image}
            alt="Hampton"
            onError={() => setImgFailed(true)}
            className="select-none"
            style={{
              position: "absolute",
              inset: "5%",
              width: "90%",
              height: "90%",
              objectFit: "contain",
              borderRadius: "50%",
              zIndex: 2,
            }}
          />
        ) : (
        <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ position: "relative", zIndex: 2 }}>
          <defs>
            <linearGradient id="homeWolfFur" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1e23" />
              <stop offset="100%" stopColor="#0b0b0e" />
            </linearGradient>
            <filter id="homeWolfEyeGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="homeWolfSoft">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ears */}
          <g filter="url(#homeWolfSoft)">
            <path d="M68 52 L46 10 L92 34 Z" fill="url(#homeWolfFur)" stroke="#2a2a2f" strokeWidth="1" />
            <path d="M132 52 L154 10 L108 34 Z" fill="url(#homeWolfFur)" stroke="#2a2a2f" strokeWidth="1" />
            {/* Inner ear */}
            <path d="M66 46 L56 22 L84 36 Z" fill="#0e0e11" />
            <path d="M134 46 L144 22 L116 36 Z" fill="#0e0e11" />
          </g>

          {/* Head silhouette */}
          <g filter="url(#homeWolfSoft)">
            <path
              d="M100 30 C88 30, 76 38, 68 50 C58 66, 50 86, 48 108 C46 132, 52 154, 64 170 C76 184, 88 190, 100 190 C112 190, 124 184, 136 170 C148 154, 154 132, 152 108 C150 86, 142 66, 132 50 C124 38, 112 30, 100 30 Z"
              fill="url(#homeWolfFur)"
              stroke="#2a2a2f"
              strokeWidth="1"
            />
          </g>

          {/* Muzzle */}
          <path
            d="M78 150 C78 164, 86 178, 100 178 C114 178, 122 164, 122 150 C122 142, 112 138, 100 138 C88 138, 78 142, 78 150 Z"
            fill="#16161a"
            stroke="#242428"
            strokeWidth="0.8"
          />

          {/* Cheek shading */}
          <ellipse cx="64" cy="130" rx="16" ry="24" fill="#0a0a0d" opacity="0.35" />
          <ellipse cx="136" cy="130" rx="16" ry="24" fill="#0a0a0d" opacity="0.35" />

          {/* Eyes — glowing red */}
          <g>
            <path d="M58 116 Q74 108, 90 116 Q74 124, 58 116 Z" fill="#08080a" stroke="rgba(195,0,47,0.45)" strokeWidth="1" />
            <path d="M110 116 Q126 108, 142 116 Q126 124, 110 116 Z" fill="#08080a" stroke="rgba(195,0,47,0.45)" strokeWidth="1" />
            <ellipse cx="74" cy="116" rx="5" ry="2.6" fill="#ff1f4d" opacity={eyeOpL} filter="url(#homeWolfEyeGlow)" />
            <ellipse cx="126" cy="116" rx="5" ry="2.6" fill="#ff1f4d" opacity={eyeOpR} filter="url(#homeWolfEyeGlow)" />
            <ellipse cx="74" cy="116" rx="2" ry="1.2" fill="#ffb3c2" opacity={0.7 + Math.sin(tick * 0.14) * 0.3} />
            <ellipse cx="126" cy="116" rx="2" ry="1.2" fill="#ffb3c2" opacity={0.7 + Math.sin(tick * 0.14 + 0.6) * 0.3} />
          </g>

          {/* Nose */}
          <path d="M92 148 L100 143 L108 148 L100 155 Z" fill="#000000" stroke="rgba(195,0,47,0.4)" strokeWidth="0.8" />
          {/* Mouth line */}
          <path d="M86 164 Q100 172, 114 164" fill="none" stroke="#232327" strokeWidth="1.2" strokeLinecap="round" />

          {/* Fur texture — subtle */}
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" fill="none" strokeLinecap="round">
            <path d="M84 96 Q90 92, 96 96" />
            <path d="M104 96 Q110 92, 116 96" />
            <path d="M80 60 Q84 56, 88 60" />
            <path d="M112 60 Q116 56, 120 60" />
            <path d="M52 128 Q58 126, 62 130" />
            <path d="M138 130 Q142 126, 148 128" />
          </g>
        </svg>
        )}

        {/* Inner vignette */}
        <div
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.6), inset 0 0 8px rgba(195,0,47,0.08)" }}
        />
      </div>

      {/* Speaking — waveform */}
      {speaking && (
        <div
          className="absolute pointer-events-none"
          style={{ bottom: Math.round(size * 0.14), left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3, alignItems: "flex-end" }}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: 4 + Math.abs(Math.sin((tick + i) * 0.28)) * 14,
                background: i % 2 === 0 ? RED : "#8B0021",
                borderRadius: 2,
                opacity: 0.75,
                transition: "height 0.06s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Thinking — vertical beam */}
      {thinking && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 2,
            height: 34,
            background: "linear-gradient(to top, #C3002F, transparent)",
            top: -30,
            left: "50%",
            borderRadius: 1,
            animation: "orunArmorPulse 0.6s ease-in-out infinite",
          }}
        />
      )}

      {/* Status label */}
      <div
        className="absolute text-center pointer-events-none"
        style={{
          bottom: -Math.round(size * 0.035),
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: active ? RED : "#A0A0A0",
          animation: active ? "orunStatePulse 1s ease-in-out infinite" : "none",
        }}
      >
        {thinking ? "Pensando" : speaking ? "Falando" : listening ? "Ouvindo" : "Pronto"}
      </div>
    </div>
  );
}
