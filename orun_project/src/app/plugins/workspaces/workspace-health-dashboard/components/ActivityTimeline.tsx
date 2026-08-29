import { Camera, Droplet, Mic, Activity, AlertTriangle, Pill } from "lucide-react";
import { useHealthStore } from "../health-store";

interface ActivityItem {
  id: string;
  icon: typeof Camera;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}

export function ActivityTimeline() {
  const meals = useHealthStore((s) => s.meals);
  const symptoms = useHealthStore((s) => s.symptoms);
  const wellness = useHealthStore((s) => s.wellness);

  const activities: ActivityItem[] = [];

  for (const meal of meals.slice(-3)) {
    activities.push({
      id: meal.id,
      icon: Camera,
      iconBg: "rgba(139,92,246,0.15)",
      iconColor: "#8B5CF6",
      title: meal.description,
      subtitle: `Refeicao registrada - ${meal.calories} kcal`,
      time: meal.time,
    });
  }

  for (const s of symptoms.slice(-2)) {
    activities.push({
      id: s.id,
      icon: AlertTriangle,
      iconBg: "rgba(239,68,68,0.15)",
      iconColor: "#EF4444",
      title: `Dor - ${s.description}`,
      subtitle: `Sintoma registrado - Intensidade ${s.intensity}/5`,
      time: "—",
    });
  }

  for (const w of wellness.slice(-2)) {
    activities.push({
      id: w.id,
      icon: Mic,
      iconBg: "rgba(59,130,246,0.15)",
      iconColor: "#3B82F6",
      title: "Bem-estar registrado",
      subtitle: `${w.metric.charAt(0).toUpperCase() + w.metric.slice(1)} ${w.value}/10`,
      time: w.time,
    });
  }

  activities.sort((a, b) => b.time.localeCompare(a.time));
  const displayed = activities.slice(0, 5);

  if (displayed.length === 0) {
    return (
      <div className="p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
        <h3 className="text-[11px] font-semibold tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
          Ultimas Atividades
        </h3>
        <p className="text-[9px] text-center py-4" style={{ color: "#6B7280" }}>Nenhuma atividade registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
          Ultimas Atividades
        </h3>
        <span className="text-[8px]" style={{ color: "#6B7280" }}>VER TODAS</span>
      </div>

      <div className="space-y-2">
        {displayed.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-center gap-3 py-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: activity.iconBg }}>
                <Icon size={13} style={{ color: activity.iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate" style={{ color: "#FFFFFF" }}>{activity.title}</p>
                <p className="text-[8px] truncate" style={{ color: "#9CA3AF" }}>{activity.subtitle}</p>
              </div>
              <span className="text-[8px] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#6B7280" }}>
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
