export function GlobalStyles() {
  return (
    <style>{`
      * { cursor: none !important; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      @keyframes orunFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      @keyframes orunEyePulse {
        0%, 100% { opacity: 0.22; }
        50% { opacity: 0.48; }
      }
      @keyframes orunArmorPulse {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 1; }
      }
      @keyframes orunAuraPulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.06); }
      }
      @keyframes orunProgressGlow {
        0%, 100% { box-shadow: 0 0 6px rgba(192,0,24,0.6), 0 0 12px rgba(255,26,45,0.3); }
        50% { box-shadow: 0 0 14px rgba(192,0,24,0.9), 0 0 28px rgba(255,26,45,0.55); }
      }
      @keyframes orunRipple {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes orunStatePulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      @keyframes orunScan {
        0% { top: -2px; }
        100% { top: 100%; }
      }
    `}</style>
  );
}
