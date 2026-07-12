import type { HamptonState } from "../types";

export function HamptonAvatar({ state }: { state: HamptonState }) {
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
          animation: `orunAuraPulse ${state === "thinking" ? "1.2s" : "3.5s"} ease-in-out infinite`,
        }}
      />

      {/* Listening ripple rings */}
      {state === "listening" && (
        <>
          <div className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, border: "1px solid rgba(192,0,24,0.35)", top: "50%", left: "50%", marginLeft: -90, marginTop: -70, animation: "orunRipple 2s ease-out infinite" }} />
          <div className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, border: "1px solid rgba(192,0,24,0.25)", top: "50%", left: "50%", marginLeft: -90, marginTop: -70, animation: "orunRipple 2s ease-out 0.6s infinite" }} />
        </>
      )}

      <svg width="300" height="355" viewBox="0 0 300 355" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="h-eyeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="h-softBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id="h-armorGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="h-eye" cx="33%" cy="33%" r="68%">
            <stop offset="0%" stopColor="#FF7788" />
            <stop offset="40%" stopColor="#FF1A2D" />
            <stop offset="100%" stopColor="#6A000E" />
          </radialGradient>
          <radialGradient id="h-head" cx="50%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#1c1c1c" />
            <stop offset="100%" stopColor="#070707" />
          </radialGradient>
          <linearGradient id="h-armorLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C00018" stopOpacity="0" />
            <stop offset="50%" stopColor="#FF1A2D" stopOpacity="1" />
            <stop offset="100%" stopColor="#C00018" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background aura blob */}
        <ellipse cx="150" cy="190" rx="110" ry="120" fill="#C00018" opacity="0.035" filter="url(#h-softBlur)" />

        {/* ─ LEFT EAR ─ */}
        <polygon points="48,180 30,16 138,164" fill="#0b0b0b" stroke="#1e1e1e" strokeWidth="1" />
        <polygon points="58,173 50,46 126,166" fill="rgba(192,0,24,0.09)" />
        <line x1="50" y1="46" x2="126" y2="166" stroke="#C00018" strokeWidth="0.6" opacity="0.3" />
        {/* Left ear tip glow */}
        <circle cx="30" cy="16" r="3" fill="#C00018" opacity="0.2" filter="url(#h-armorGlow)" />

        {/* ─ RIGHT EAR ─ */}
        <polygon points="252,180 270,16 162,164" fill="#0b0b0b" stroke="#1e1e1e" strokeWidth="1" />
        <polygon points="242,173 250,46 174,166" fill="rgba(192,0,24,0.09)" />
        <line x1="250" y1="46" x2="174" y2="166" stroke="#C00018" strokeWidth="0.6" opacity="0.3" />
        <circle cx="270" cy="16" r="3" fill="#C00018" opacity="0.2" filter="url(#h-armorGlow)" />

        {/* ─ HEAD ─ */}
        <polygon
          points="48,180 40,286 66,320 150,336 234,320 260,286 252,180 182,162 150,155 118,162"
          fill="url(#h-head)"
          stroke="#1d1d1d"
          strokeWidth="1"
        />

        {/* Forehead center ridge */}
        <polygon points="118,162 150,155 182,162 150,182" fill="#151515" stroke="#1e1e1e" strokeWidth="0.5" />

        {/* Geometric head detail lines */}
        <line x1="150" y1="182" x2="150" y2="240" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.8" />
        <path d="M 40,215 L 70,210" stroke="#181818" strokeWidth="0.8" opacity="0.7" />
        <path d="M 260,215 L 230,210" stroke="#181818" strokeWidth="0.8" opacity="0.7" />

        {/* Cheekbone angles */}
        <polygon points="40,200 68,192 55,240" fill="none" stroke="#191919" strokeWidth="0.5" opacity="0.6" />
        <polygon points="260,200 232,192 245,240" fill="none" stroke="#191919" strokeWidth="0.5" opacity="0.6" />

        {/* ─ BROW RIDGES ─ */}
        <path d="M 78,204 Q 108,197 138,202" stroke="#252525" strokeWidth="1.5" fill="none" />
        <path d="M 222,204 Q 192,197 162,202" stroke="#252525" strokeWidth="1.5" fill="none" />

        {/* ─ LEFT EYE ─ */}
        <ellipse cx="108" cy="222" rx="26" ry="16" fill="#C00018" opacity="0.18"
          filter="url(#h-eyeGlow)"
          style={{ animation: "orunEyePulse 2.8s ease-in-out infinite" }} />
        <ellipse cx="108" cy="222" rx="20" ry="13" fill="url(#h-eye)" filter="url(#h-eyeGlow)" />
        {/* Vertical slit pupil */}
        <ellipse cx="108" cy="222" rx="5" ry="10" fill="#020008" />
        {/* Eye shine */}
        <ellipse cx="103" cy="217" rx="3" ry="2" fill="rgba(255,190,190,0.55)" />

        {/* ─ RIGHT EYE ─ */}
        <ellipse cx="192" cy="222" rx="26" ry="16" fill="#C00018" opacity="0.18"
          filter="url(#h-eyeGlow)"
          style={{ animation: "orunEyePulse 2.8s ease-in-out infinite" }} />
        <ellipse cx="192" cy="222" rx="20" ry="13" fill="url(#h-eye)" filter="url(#h-eyeGlow)" />
        <ellipse cx="192" cy="222" rx="5" ry="10" fill="#020008" />
        <ellipse cx="187" cy="217" rx="3" ry="2" fill="rgba(255,190,190,0.55)" />

        {/* ─ SNOUT / MUZZLE ─ */}
        <ellipse cx="150" cy="260" rx="50" ry="38" fill="#0f0f0f" stroke="#1a1a1a" strokeWidth="0.5" />
        {/* Muzzle split line */}
        <line x1="150" y1="246" x2="150" y2="270" stroke="#191919" strokeWidth="0.5" />
        {/* Nose */}
        <ellipse cx="150" cy="275" rx="14" ry="9" fill="#171717" stroke="#222222" strokeWidth="1" />
        <ellipse cx="144" cy="274" rx="3.5" ry="2.5" fill="#0a0a0a" />
        <ellipse cx="156" cy="274" rx="3.5" ry="2.5" fill="#0a0a0a" />
        {/* Mouth */}
        <path d="M 132,290 Q 150,299 168,290" stroke="#1e1e1e" strokeWidth="1" fill="none" />

        {/* ─ NECK / THROAT ─ */}
        <polygon points="118,318 134,336 150,342 166,336 182,318 168,304 150,312 132,304" fill="#0d0d0d" stroke="#1a1a1a" strokeWidth="0.5" />

        {/* ─ CHEST ARMOR ─ */}
        <polygon points="66,320 80,346 220,346 234,320 150,335" fill="#0d0d0d" stroke="#1d1d1d" strokeWidth="1" />
        {/* Left shoulder plate */}
        <polygon points="28,346 66,320 80,346" fill="#0b0b0b" stroke="#C00018" strokeWidth="0.6" opacity="0.35" />
        {/* Right shoulder plate */}
        <polygon points="272,346 234,320 220,346" fill="#0b0b0b" stroke="#C00018" strokeWidth="0.6" opacity="0.35" />
        {/* Armor glow lines */}
        <line x1="118" y1="338" x2="150" y2="328"
          stroke="url(#h-armorLine)" strokeWidth="1.5"
          style={{ animation: "orunArmorPulse 2.2s ease-in-out infinite" }} />
        <line x1="182" y1="338" x2="150" y2="328"
          stroke="url(#h-armorLine)" strokeWidth="1.5"
          style={{ animation: "orunArmorPulse 2.2s ease-in-out infinite" }} />
        <line x1="80" y1="344" x2="150" y2="328" stroke="#C00018" strokeWidth="0.4" opacity="0.2" />
        <line x1="220" y1="344" x2="150" y2="328" stroke="#C00018" strokeWidth="0.4" opacity="0.2" />
        {/* Center hex */}
        <polygon points="144,332 148,327 152,327 156,332 152,337 148,337"
          fill="none" stroke="#C00018" strokeWidth="0.6" opacity="0.5"
          style={{ animation: "orunArmorPulse 2.2s ease-in-out infinite" }} />
      </svg>

      {/* Thinking — vertical beam above head */}
      {state === "thinking" && (
        <div className="absolute" style={{ width: 1.5, height: 36, background: "linear-gradient(to top, #C00018, transparent)", top: -40, left: "50%", borderRadius: 1, animation: "orunArmorPulse 0.9s ease-in-out infinite" }} />
      )}
    </div>
  );
}
