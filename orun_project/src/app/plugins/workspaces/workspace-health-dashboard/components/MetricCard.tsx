import type { Metric } from "../health-types";
import { Scale, Flame, Footprints, Droplets, BarChart3 } from "lucide-react";

const METRIC_ICONS: Record<string, typeof Scale> = { scale: Scale, flame: Flame, footprints: Footprints, droplets: Droplets, "bar-chart": BarChart3 };

export function MetricCard({ metric }: { metric: Metric }) {
  const progress = Math.min((metric.value / metric.target) * 100, 100);
  const isOnTrack = metric.value >= metric.target * 0.8;
  return (
    <div className="p-3 rounded-2xl border" style={{ borderColor: "#22222A", background: "#121216" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "#9CA3AF" }}>
          {(() => { const I = METRIC_ICONS[metric.icon]; return I ? <I size={11} className="inline mr-1 -mt-px" style={{ color: metric.color }} /> : null; })()}
          {metric.name}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
          background: isOnTrack ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: isOnTrack ? "#22C55E" : "#EF4444",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isOnTrack ? "✓" : "↓"}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>{metric.value}</span>
        <span className="text-[10px]" style={{ color: "#6B7280" }}>{metric.unit}</span>
      </div>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: metric.color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px]" style={{ color: "#6B7280" }}>0</span>
        <span className="text-[8px]" style={{ color: "#6B7280" }}>{metric.target} {metric.unit}</span>
      </div>
    </div>
  );
}
