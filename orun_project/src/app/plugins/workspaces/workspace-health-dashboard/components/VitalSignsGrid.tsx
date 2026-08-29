import { Scale, Heart, Droplet, Moon } from "lucide-react";
import { useHealthStore } from "../health-store";

interface VitalCardProps {
  icon: typeof Scale;
  label: string;
  value: string;
  unit: string;
  status?: string;
  statusColor?: string;
  comparison?: string;
  compColor?: string;
  time?: string;
}

function VitalCard({ icon: Icon, label, value, unit, status, statusColor, comparison, compColor, time }: VitalCardProps) {
  return (
    <div className="p-3 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: "#E50914" }} />
        <span className="text-[9px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#9CA3AF" }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>{value}</span>
        <span className="text-[9px]" style={{ color: "#6B7280" }}>{unit}</span>
      </div>
      {status && (
        <span className="text-[8px] font-medium block mt-1" style={{ color: statusColor || "#22C55E" }}>{status}</span>
      )}
      {comparison && (
        <span className="text-[8px] block mt-1" style={{ color: compColor || "#22C55E" }}>{comparison}</span>
      )}
      {time && (
        <span className="text-[7px] block mt-0.5" style={{ color: "#6B7280" }}>{time}</span>
      )}
    </div>
  );
}

export function VitalSignsGrid() {
  const measurements = useHealthStore((s) => s.bodyMeasurements);
  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const prev = sorted[1];

  const weightDelta = latest?.weight && prev?.weight ? (latest.weight - prev.weight).toFixed(1) : null;
  const weightDir = weightDelta && Number(weightDelta) < 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <VitalCard
        icon={Scale}
        label="Peso"
        value={latest?.weight != null ? String(latest.weight) : "—"}
        unit="kg"
        comparison={weightDelta ? `${weightDir ? "↓" : "↑"} ${Math.abs(Number(weightDelta))} kg vs ontem` : undefined}
        compColor={weightDir ? "#22C55E" : "#F59E0B"}
      />
      <VitalCard
        icon={Heart}
        label="Frequencia Cardiaca"
        value="78"
        unit="bpm"
        status="Normal"
        statusColor="#22C55E"
        time="Hoje as 18:20"
      />
      <VitalCard
        icon={Droplet}
        label="Pressao Arterial"
        value="13/8"
        unit="mmHg"
        status="Normal"
        statusColor="#22C55E"
        time="Hoje as 18:20"
      />
      <VitalCard
        icon={Moon}
        label="Sono"
        value="7h 32m"
        unit=""
        comparison="↑ 42 min vs media"
        compColor="#22C55E"
      />
    </div>
  );
}
