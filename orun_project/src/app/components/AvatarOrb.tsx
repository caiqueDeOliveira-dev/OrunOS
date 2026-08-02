import React from "react";

interface AvatarOrbProps {
  size?: number;
}

export const AvatarOrb = React.memo(function AvatarOrb({ size = 320 }: AvatarOrbProps) {
  const s = size;
  const h = s / 2;
  const scale = s / 320;

  return (
    <div
      data-testid="avatar-orb"
      className="relative flex items-center justify-center shrink-0 select-none"
      style={{ width: s, height: s, animation: "orunFloat 4.5s ease-in-out infinite" }}
    >
      {/* Outer aura */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: s * 1.06,
          height: s * 0.875,
          background: "radial-gradient(ellipse, rgba(192,0,24,0.11) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -38%)",
          animation: "orunAuraPulse 3.5s ease-in-out infinite",
        }}
      />

      {/* Outer hologram field */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.97,
          height: s * 0.97,
          border: `${1 * scale}px solid rgba(192,0,24,0.2)`,
          boxShadow: `
            0 0 ${30 * scale}px rgba(192,0,24,0.15),
            inset 0 0 ${30 * scale}px rgba(192,0,24,0.05)
          `,
          animation: "orunAuraPulse 2.5s ease-in-out infinite",
        }}
      />

      {/* Hologram scanlines */}
      <div
        className="absolute rounded-full overflow-hidden pointer-events-none"
        style={{ width: s * 0.9, height: s * 0.9, opacity: 0.08 }}
      >
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full"
            style={{
              height: 1,
              background: "rgba(255,255,255,0.6)",
              top: `${(i + 1) * 7.5}%`,
            }}
          />
        ))}
      </div>

      {/* Hologram flicker sweep */}
      <div
        className="absolute rounded-full overflow-hidden pointer-events-none"
        style={{ width: s * 0.85, height: s * 0.85 }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 0%, rgba(255,80,80,0.12) 50%, transparent 100%)",
            height: "40%",
            animation: "orunHoloScan 3s ease-in-out infinite",
          }}
        />
      </div>

      {/* Inner glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.75,
          height: s * 0.75,
          background: "radial-gradient(circle at 40% 35%, rgba(255,60,60,0.4) 0%, rgba(192,0,24,0.2) 40%, transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      {/* Core sphere */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.53,
          height: s * 0.53,
          background: "radial-gradient(circle at 38% 32%, #ff4040 0%, #C00018 30%, #7a0010 65%, #3a0008 100%)",
          boxShadow: `
            inset ${-8 * scale}px ${-8 * scale}px ${20 * scale}px rgba(0,0,0,0.4),
            inset ${6 * scale}px ${6 * scale}px ${16 * scale}px rgba(255,140,140,0.3),
            0 0 ${40 * scale}px rgba(192,0,24,0.3),
            0 0 ${80 * scale}px rgba(192,0,24,0.15)
          `,
        }}
      />

      {/* Specular highlight */}
      <div
        className="absolute rounded-full"
        style={{
          width: 40 * scale,
          height: 24 * scale,
          top: 55 * scale,
          left: 65 * scale,
          background: "radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)",
          transform: "rotate(-20deg)",
        }}
      />

      {/* Hologram interference lines on sphere */}
      <div
        className="absolute rounded-full overflow-hidden pointer-events-none"
        style={{ width: s * 0.53, height: s * 0.53, opacity: 0.06 }}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-full"
            style={{
              height: 1,
              background: "white",
              top: `${(i + 1) * 11}%`,
            }}
          />
        ))}
      </div>

      {/* "O" logo mark */}
      <div
        className="absolute flex items-center justify-center"
        style={{ inset: 0, pointerEvents: "none" }}
      >
        <svg width={52 * scale} height={52 * scale} viewBox="0 0 52 52" fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.15))", opacity: 0.6 }}>
          <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
          <circle cx="26" cy="26" r="16" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" fill="none" />
          <circle cx="26" cy="26" r="3" fill="rgba(255,255,255,0.4)" />
        </svg>
      </div>

      {/* Orbiting dot */}
      <div
        className="absolute"
        style={{
          inset: 0,
          animation: "orunSpin 6s linear infinite",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 5 * scale,
            height: 5 * scale,
            background: "#ff6060",
            top: 0,
            left: "50%",
            marginLeft: -2.5 * scale,
            boxShadow: `0 0 ${8 * scale}px rgba(255,96,96,0.6)`,
          }}
        />
      </div>

      {/* Second orbit ring (opposite direction) */}
      <div
        className="absolute"
        style={{
          inset: -8 * scale,
          animation: "orunSpinReverse 8s linear infinite",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 3 * scale,
            height: 3 * scale,
            background: "rgba(255,180,180,0.5)",
            bottom: 10 * scale,
            right: 0,
            boxShadow: `0 0 ${6 * scale}px rgba(255,120,120,0.4)`,
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute pointer-events-none" style={{ top: "30%", left: "50%", transform: "translateX(-50%)" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2,
              height: 2,
              background: "#C00018",
              opacity: 0.3,
              left: `${(i - 1) * 20}px`,
              animation: `orunFloat ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
});
