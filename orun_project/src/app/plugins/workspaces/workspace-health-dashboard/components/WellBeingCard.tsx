import { Smile, CloudLightning, Zap, Battery, Target } from "lucide-react";
import { useHealthStore, getLatestWellness } from "../health-store";
import { WELLNESS_CONFIG, type WellnessMetric } from "../health-types";

const ICONS: Record<string, typeof Smile> = {
  smile: Smile,
  "cloud-lightning": CloudLightning,
  zap: Zap,
  battery: Battery,
  target: Target,
};

export function WellBeingCard() {
  const wellness = useHealthStore((s) => s.wellness);
  const latest = getLatestWellness();
  const metrics: WellnessMetric[] = ["humor", "ansiedade", "estresse", "energia", "foco"];

  const lastEntry = [...wellness].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))[0];

  return (
    <div className="p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
          Bem-Estar Hoje
        </h3>
        <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "rgba(229,9,20,0.1)", color: "#E50914", fontFamily: "'Sora', sans-serif" }}>
          VER DIARIO
        </span>
      </div>

      <div className="space-y-2.5">
        {metrics.map((m) => {
          const config = WELLNESS_CONFIG[m];
          const Icon = ICONS[config.icon];
          const value = latest[m];
          const pct = (value / 10) * 100;

          return (
            <div key={m} className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${config.color}15` }}>
                {Icon && <Icon size={12} style={{ color: config.color }} />}
              </div>
              <span className="text-[10px] w-16 shrink-0" style={{ color: "#9CA3AF" }}>{config.label}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: config.color }} />
              </div>
              <span className="text-[10px] font-medium w-6 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: config.color }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {lastEntry && (
        <p className="text-[8px] mt-3 text-right" style={{ color: "#6B7280" }}>
          Ultimo registro: Hoje as {lastEntry.time}
        </p>
      )}
    </div>
  );
}
