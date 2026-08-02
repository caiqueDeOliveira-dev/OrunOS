export function PanKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const angle = ((value + 100) / 200) * 270 - 135;
  return (
    <div
      style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "#0D1117", border: "1px solid #30363D",
        position: "relative", cursor: "pointer",
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
        const deg = (rad * 180) / Math.PI + 90;
        const clamped = Math.max(-135, Math.min(135, deg));
        const pan = Math.round(((clamped + 135) / 270) * 200 - 100);
        onChange(pan);
      }}
    >
      <div
        style={{
          position: "absolute", top: "50%", left: "50%",
          width: 2, height: 8, background: "#C9D1D9",
          borderRadius: 1, transformOrigin: "center top",
          transform: `translate(-50%, 0) rotate(${angle}deg)`,
        }}
      />
    </div>
  );
}
