export function LevelMeter({ color }: { color: string }) {
  return (
    <div className="flex gap-px items-end" style={{ height: 28 }}>
      {[0.4, 0.6, 0.8, 1].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${h * 100}%`,
            background: i >= 2 ? "#C00018" : i === 1 ? "#D4A017" : color,
            borderRadius: 1,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}
