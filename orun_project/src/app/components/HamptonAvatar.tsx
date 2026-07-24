import type { HamptonState } from "../types";

export function HamptonAvatar({ state }: { state: HamptonState }) {
  const speaking = state === "speaking";
  const thinking = state === "thinking";
  const listening = state === "listening";

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ animation: "orunFloat 4.5s ease-in-out infinite" }}
    >
      {/* Outer aura */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 340, height: 280,
          background: "radial-gradient(ellipse, rgba(192,0,24,0.11) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%, -38%)",
          animation: `orunAuraPulse ${thinking ? "1.2s" : "3.5s"} ease-in-out infinite`,
        }}
      />

      {/* Listening ripple rings */}
      {listening && (
        <>
          <div className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, border: "1px solid rgba(192,0,24,0.35)", top: "50%", left: "50%", marginLeft: -90, marginTop: -70, animation: "orunRipple 2s ease-out infinite" }} />
          <div className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, border: "1px solid rgba(192,0,24,0.25)", top: "50%", left: "50%", marginLeft: -90, marginTop: -70, animation: "orunRipple 2s ease-out 0.6s infinite" }} />
        </>
      )}

      {/* Idle breathing particles */}
      {state === "idle" && (
        <div className="absolute pointer-events-none" style={{ top: "30%", left: "50%", transform: "translateX(-50%)" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 2, height: 2,
                background: "#C00018",
                opacity: 0.3,
                left: `${(i - 1) * 20}px`,
                animation: `orunFloat ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Orb core — holographic */}
      <div className="relative" style={{ width: 220, height: 220 }}>
        {/* Outer hologram field */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 5,
            border: "1px solid rgba(192,0,24,0.2)",
            boxShadow: `
              0 0 30px rgba(192,0,24,0.15),
              inset 0 0 30px rgba(192,0,24,0.05)
            `,
            animation: `orunAuraPulse ${thinking ? "0.8s" : "2.5s"} ease-in-out infinite`,
          }}
        />

        {/* Hologram scanlines */}
        <div
          className="absolute rounded-full overflow-hidden pointer-events-none"
          style={{ inset: 10, opacity: 0.08 }}
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
          style={{ inset: 12 }}
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
            inset: 22,
            background: "radial-gradient(circle at 40% 35%, rgba(255,60,60,0.4) 0%, rgba(192,0,24,0.2) 40%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />

        {/* Core sphere */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 35,
            background: "radial-gradient(circle at 38% 32%, #ff4040 0%, #C00018 30%, #7a0010 65%, #3a0008 100%)",
            boxShadow: `
              inset -8px -8px 20px rgba(0,0,0,0.4),
              inset 6px 6px 16px rgba(255,140,140,0.3),
              0 0 40px rgba(192,0,24,0.3),
              0 0 80px rgba(192,0,24,0.15)
            `,
          }}
        />

        {/* Specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            width: 40, height: 24,
            top: 55, left: 65,
            background: "radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)",
            transform: "rotate(-20deg)",
          }}
        />

        {/* Hologram interference lines on sphere */}
        <div
          className="absolute rounded-full overflow-hidden pointer-events-none"
          style={{ inset: 35, opacity: 0.06 }}
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
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.15))", opacity: 0.6 }}>
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
            animation: thinking ? "orunSpin 2s linear infinite" : "orunSpin 6s linear infinite",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 5, height: 5,
              background: "#ff6060",
              top: 0, left: "50%", marginLeft: -2.5,
              boxShadow: "0 0 8px rgba(255,96,96,0.6)",
            }}
          />
        </div>

        {/* Second orbit ring (opposite direction) */}
        <div
          className="absolute"
          style={{
            inset: -8,
            animation: thinking ? "orunSpinReverse 3s linear infinite" : "orunSpinReverse 8s linear infinite",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 3, height: 3,
              background: "rgba(255,180,180,0.5)",
              bottom: 10, right: 0,
              boxShadow: "0 0 6px rgba(255,120,120,0.4)",
            }}
          />
        </div>
      </div>

      {/* Thinking — vertical beam above head */}
      {thinking && (
        <div className="absolute" style={{ width: 1.5, height: 36, background: "linear-gradient(to top, #C00018, transparent)", top: -40, left: "50%", borderRadius: 1, animation: "orunArmorPulse 0.9s ease-in-out infinite" }} />
      )}

      {/* Speaking — voice wave lines */}
      {speaking && (
        <div className="absolute pointer-events-none" style={{ bottom: 30, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: 8 + Math.random() * 12,
                background: "#C00018",
                borderRadius: 1,
                opacity: 0.5,
                animation: `orunArmorPulse ${0.3 + i * 0.1}s ease-in-out infinite`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
