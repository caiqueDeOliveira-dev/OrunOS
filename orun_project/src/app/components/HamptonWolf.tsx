import { useState, useEffect } from "react";
import type { HamptonState } from "../types";

export function HamptonWolf({ state }: { state: HamptonState }) {
  const speaking = state === "speaking";
  const thinking = state === "thinking";
  const listening = state === "listening";
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 340, height: 360, animation: "orunFloat 5s ease-in-out infinite" }}
    >
      {/* Projection base platform */}
      <div
        className="absolute"
        style={{
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          width: 280,
          height: 14,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(192,0,24,0.3) 0%, rgba(100,0,12,0.1) 50%, transparent 70%)",
          boxShadow: "0 0 50px rgba(192,0,24,0.2), 0 0 100px rgba(192,0,24,0.08)",
          animation: "orunAuraPulse 2s ease-in-out infinite",
        }}
      />

      {/* Projection beam cone */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "90px solid transparent",
          borderRight: "90px solid transparent",
          borderBottom: "260px solid rgba(192,0,24,0.03)",
          filter: "blur(10px)",
          animation: `orunAuraPulse ${thinking ? "0.8s" : "3s"} ease-in-out infinite`,
        }}
      />

      {/* Floating particles — blood red + ghostly white */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 100 + (i % 4) * 20;
        const speed = thinking ? 0.08 : 0.03;
        const offset = tick * speed * (i % 2 === 0 ? 1 : -1);
        const x = Math.cos(angle + offset) * radius;
        const y = Math.sin(angle + offset) * radius * 0.35 - 30;
        const opacity = 0.12 + (Math.sin(tick * 0.08 + i) * 0.5 + 0.5) * 0.3;
        const size = 1 + (i % 3) * 0.8;
        const isRed = i % 3 !== 2;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: isRed ? "#C00018" : "rgba(255,255,255,0.6)",
              left: `calc(50% + ${x}px)`,
              top: `calc(40% + ${y}px)`,
              opacity,
              boxShadow: `0 0 ${size * 4}px ${isRed ? "rgba(192,0,24,0.6)" : "rgba(255,255,255,0.3)"}`,
              transition: "all 0.06s linear",
            }}
          />
        );
      })}

      {/* Orbital rings — blood themed */}
      {[0, 1].map((i) => (
        <div
          key={`ring-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 200 + i * 50,
            height: 50 + i * 12,
            top: "42%",
            left: "50%",
            marginTop: -25 - i * 6,
            marginLeft: -(100 + i * 25),
            border: `1px solid rgba(192,0,24,${0.15 - i * 0.04})`,
            transform: `rotateX(72deg) rotateZ(${tick * (i === 0 ? 0.25 : -0.18)}deg)`,
            transformStyle: "preserve-3d",
          }}
        />
      ))}

      {/* === WOLF HEAD SVG === */}
      <div className="relative" style={{ width: 240, height: 260 }}>
        {/* Hologram shell */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -5,
            border: "1px solid rgba(192,0,24,0.15)",
            boxShadow: `
              0 0 40px rgba(192,0,24,0.1),
              inset 0 0 40px rgba(192,0,24,0.04)
            `,
            animation: `orunAuraPulse ${thinking ? "0.7s" : "2.5s"} ease-in-out infinite`,
          }}
        />

        {/* Scanlines */}
        <div className="absolute overflow-hidden pointer-events-none" style={{ inset: 5, opacity: 0.05, borderRadius: "50%" }}>
          {[...Array(24)].map((_, i) => (
            <div key={i} className="absolute w-full" style={{ height: 1, background: "rgba(192,0,24,0.7)", top: `${(i + 1) * 4}%` }} />
          ))}
        </div>

        {/* Hologram flicker sweep */}
        <div className="absolute overflow-hidden pointer-events-none" style={{ inset: 8, borderRadius: "50%" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 0%, rgba(192,0,24,0.12) 50%, transparent 100%)",
            height: "25%",
            animation: "orunHoloScan 2.8s ease-in-out infinite",
          }} />
        </div>

        {/* Wolf SVG */}
        <svg
          viewBox="0 0 240 260"
          width="240"
          height="260"
          style={{ filter: `drop-shadow(0 0 20px rgba(192,0,24,0.4)) drop-shadow(0 0 40px rgba(192,0,24,0.15))`, position: "relative", zIndex: 2 }}
        >
          <defs>
            {/* Holographic gradient */}
            <linearGradient id="wolfHolo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4040" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#C00018" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#8B0000" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4a0008" stopOpacity="0.9" />
            </linearGradient>
            {/* Hologram overlay */}
            <linearGradient id="holoOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,100,100,0.15)" />
              <stop offset="50%" stopColor="rgba(192,0,24,0.08)" />
              <stop offset="100%" stopColor="rgba(255,60,60,0.12)" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="wolfGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Blood drip clip */}
            <clipPath id="wolfClip">
              <path d="M120 255 C60 255, 20 220, 20 170 C20 130, 40 100, 55 85 L45 45 L70 70 C80 55, 95 40, 110 30 L120 10 L130 30 C145 40, 160 55, 170 70 L195 45 L185 85 C200 100, 220 130, 220 170 C220 220, 180 255, 120 255Z" />
            </clipPath>
          </defs>

          {/* Wolf head silhouette */}
          <g filter="url(#wolfGlow)">
            {/* Main head shape */}
            <path
              d="M120 255 C60 255, 18 215, 18 165 C18 125, 38 95, 55 80 L42 38 L72 68 C82 52, 98 36, 112 26 L120 6 L128 26 C142 36, 158 52, 168 68 L198 38 L185 80 C202 95, 222 125, 222 165 C222 215, 180 255, 120 255Z"
              fill="url(#wolfHolo)"
              stroke="rgba(255,80,80,0.4)"
              strokeWidth="1"
            />
            {/* Hologram overlay */}
            <path
              d="M120 255 C60 255, 18 215, 18 165 C18 125, 38 95, 55 80 L42 38 L72 68 C82 52, 98 36, 112 26 L120 6 L128 26 C142 36, 158 52, 168 68 L198 38 L185 80 C202 95, 222 125, 222 165 C222 215, 180 255, 120 255Z"
              fill="url(#holoOverlay)"
            />

            {/* Eyes — glowing red */}
            <ellipse cx="90" cy="130" rx="14" ry="10" fill="#1a0005" stroke="rgba(255,60,60,0.5)" strokeWidth="0.8" />
            <ellipse cx="150" cy="130" rx="14" ry="10" fill="#1a0005" stroke="rgba(255,60,60,0.5)" strokeWidth="0.8" />
            {/* Eye glow pupils */}
            <ellipse cx="90" cy="130" rx="5" ry="4" fill="#ff3030" opacity={0.7 + Math.sin(tick * 0.12) * 0.3}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="150" cy="130" rx="5" ry="4" fill="#ff3030" opacity={0.7 + Math.sin(tick * 0.12 + 0.5) * 0.3}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="0.3s" repeatCount="indefinite" />
            </ellipse>
            {/* Eye inner glow */}
            <ellipse cx="90" cy="130" rx="8" ry="6" fill="none" stroke="rgba(255,0,0,0.3)" strokeWidth="1">
              <animate attributeName="stroke-opacity" values="0.2;0.6;0.2" dur="1.5s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="150" cy="130" rx="8" ry="6" fill="none" stroke="rgba(255,0,0,0.3)" strokeWidth="1">
              <animate attributeName="stroke-opacity" values="0.2;0.6;0.2" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
            </ellipse>

            {/* Nose */}
            <path d="M112 160 L120 150 L128 160 L120 165Z" fill="#2a0008" stroke="rgba(255,60,60,0.3)" strokeWidth="0.5" />

            {/* Mouth line */}
            <path d="M105 172 Q120 180, 135 172" fill="none" stroke="rgba(100,0,12,0.5)" strokeWidth="1" />

            {/* Inner ear details */}
            <path d="M50 55 L60 75 L42 68Z" fill="rgba(100,0,15,0.6)" />
            <path d="M190 55 L180 75 L198 68Z" fill="rgba(100,0,15,0.6)" />

            {/* Fur texture lines */}
            <path d="M80 100 Q90 95, 100 100" fill="none" stroke="rgba(255,80,80,0.2)" strokeWidth="0.5" />
            <path d="M140 100 Q150 95, 160 100" fill="none" stroke="rgba(255,80,80,0.2)" strokeWidth="0.5" />
            <path d="M70 145 Q80 140, 90 145" fill="none" stroke="rgba(255,80,80,0.15)" strokeWidth="0.5" />
            <path d="M150 145 Q160 140, 170 145" fill="none" stroke="rgba(255,80,80,0.15)" strokeWidth="0.5" />
            <path d="M95 190 Q120 200, 145 190" fill="none" stroke="rgba(100,0,12,0.3)" strokeWidth="0.5" />

            {/* Hologram interference lines across wolf */}
            <g clipPath="url(#wolfClip)" opacity="0.06">
              {[...Array(16)].map((_, i) => (
                <line key={i} x1="0" y1={15 + i * 15} x2="240" y2={15 + i * 15} stroke="white" strokeWidth="0.8" />
              ))}
            </g>
          </g>

          {/* === BLOOD RED CROWN === */}
          <g style={{ filter: "drop-shadow(0 0 12px rgba(192,0,24,0.6)) drop-shadow(0 0 25px rgba(192,0,24,0.3))" }}>
            {/* Crown base band */}
            <path
              d="M72 52 Q95 42, 120 40 Q145 42, 168 52 L165 62 Q145 54, 120 52 Q95 54, 75 62Z"
              fill="url(#wolfHolo)"
              stroke="rgba(255,60,60,0.6)"
              strokeWidth="0.8"
            />
            {/* Crown spikes */}
            <path d="M78 52 L72 22 L88 44Z" fill="#C00018" stroke="rgba(255,80,80,0.5)" strokeWidth="0.5">
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M100 46 L98 10 L112 40Z" fill="#C00018" stroke="rgba(255,80,80,0.5)" strokeWidth="0.5">
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="1.8s" begin="0.2s" repeatCount="indefinite" />
            </path>
            <path d="M120 42 L120 2 L132 40Z" fill="#ff3030" stroke="rgba(255,100,100,0.6)" strokeWidth="0.5">
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="1.6s" begin="0.4s" repeatCount="indefinite" />
            </path>
            <path d="M140 46 L142 10 L128 40Z" fill="#C00018" stroke="rgba(255,80,80,0.5)" strokeWidth="0.5">
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="1.9s" begin="0.1s" repeatCount="indefinite" />
            </path>
            <path d="M162 52 L168 22 L152 44Z" fill="#C00018" stroke="rgba(255,80,80,0.5)" strokeWidth="0.5">
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="2.1s" begin="0.3s" repeatCount="indefinite" />
            </path>

            {/* Crown jewels — glowing red dots */}
            <circle cx="72" cy="22" r="3" fill="#ff4040" opacity="0.9">
              <animate attributeName="r" values="2.5;3.5;2.5" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="98" cy="10" r="3.5" fill="#ff5050" opacity="0.9">
              <animate attributeName="r" values="3;4;3" dur="1.3s" begin="0.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.3s" begin="0.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="120" cy="2" r="4" fill="#ff2020" opacity="1">
              <animate attributeName="r" values="3.5;5;3.5" dur="1.2s" begin="0.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" begin="0.1s" repeatCount="indefinite" />
            </circle>
            <circle cx="142" cy="10" r="3.5" fill="#ff5050" opacity="0.9">
              <animate attributeName="r" values="3;4;3" dur="1.4s" begin="0.3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" begin="0.3s" repeatCount="indefinite" />
            </circle>
            <circle cx="168" cy="22" r="3" fill="#ff4040" opacity="0.9">
              <animate attributeName="r" values="2.5;3.5;2.5" dur="1.6s" begin="0.15s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.6s" begin="0.15s" repeatCount="indefinite" />
            </circle>

            {/* Blood drips from crown */}
            <g opacity="0.5">
              <path d="M85 55 Q84 65, 86 72 Q85 76, 84 78" fill="none" stroke="#C00018" strokeWidth="1.5" strokeLinecap="round">
                <animate attributeName="d" values="M85 55 Q84 65, 86 72 Q85 76, 84 78;M85 55 Q83 68, 86 78 Q85 84, 84 88;M85 55 Q84 65, 86 72 Q85 76, 84 78" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M130 53 Q131 62, 129 70 Q130 75, 131 78" fill="none" stroke="#C00018" strokeWidth="1.2" strokeLinecap="round">
                <animate attributeName="d" values="M130 53 Q131 62, 129 70 Q130 75, 131 78;M130 53 Q132 66, 129 76 Q130 82, 131 85;M130 53 Q131 62, 129 70 Q130 75, 131 78" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" begin="0.5s" repeatCount="indefinite" />
              </path>
              <path d="M155 56 Q156 64, 154 72 Q155 76, 156 79" fill="none" stroke="#C00018" strokeWidth="1" strokeLinecap="round">
                <animate attributeName="d" values="M155 56 Q156 64, 154 72 Q155 76, 156 79;M155 56 Q157 68, 154 78 Q155 83, 156 86;M155 56 Q156 64, 154 72 Q155 76, 156 79" dur="4s" begin="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" begin="1s" repeatCount="indefinite" />
              </path>
            </g>
          </g>
        </svg>

        {/* Inner glow sphere behind wolf */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 30,
            background: "radial-gradient(circle, rgba(192,0,24,0.15) 0%, transparent 60%)",
            filter: "blur(15px)",
            animation: `orunAuraPulse ${thinking ? "0.8s" : "3s"} ease-in-out infinite`,
          }}
        />
      </div>

      {/* Thinking — vertical beam */}
      {thinking && (
        <div
          className="absolute"
          style={{
            width: 2,
            height: 55,
            background: "linear-gradient(to top, #C00018, transparent)",
            top: -50,
            left: "50%",
            borderRadius: 1,
            animation: "orunArmorPulse 0.6s ease-in-out infinite",
          }}
        />
      )}

      {/* Speaking — wolf howl wave */}
      {speaking && (
        <div
          className="absolute pointer-events-none"
          style={{ bottom: 50, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2, alignItems: "flex-end" }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: 5 + Math.abs(Math.sin((tick + i) * 0.25)) * 20,
                background: i % 2 === 0 ? "#C00018" : "#8B0000",
                borderRadius: 1,
                opacity: 0.6,
                transition: "height 0.06s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Listening — pulse rings */}
      {listening && (
        <>
          <div className="absolute rounded-full pointer-events-none" style={{ width: 220, height: 220, border: "1px solid rgba(192,0,24,0.25)", top: "50%", left: "50%", marginLeft: -110, marginTop: -120, animation: "orunRipple 2s ease-out infinite" }} />
          <div className="absolute rounded-full pointer-events-none" style={{ width: 220, height: 220, border: "1px solid rgba(192,0,24,0.18)", top: "50%", left: "50%", marginLeft: -110, marginTop: -120, animation: "orunRipple 2s ease-out 0.7s infinite" }} />
        </>
      )}

      {/* Idle breathing particles */}
      {state === "idle" && (
        <div className="absolute pointer-events-none" style={{ top: "20%", left: "50%", transform: "translateX(-50%)" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 1.5,
                height: 1.5,
                background: "#C00018",
                opacity: 0.2,
                left: `${(i - 1.5) * 14}px`,
                animation: `orunFloat ${3 + i * 0.7}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Status label */}
      <div
        className="absolute text-center pointer-events-none"
        style={{
          bottom: -4,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 9,
          fontFamily: "'Sora', sans-serif",
          fontWeight: 300,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(192,0,24,0.5)",
        }}
      >
        {thinking ? "HUNTING" : speaking ? "HOWLING" : listening ? "SCENTING" : "AWAKE"}
      </div>
    </div>
  );
}
