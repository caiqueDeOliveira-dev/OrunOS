import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Clock, Scale, Calendar, Dumbbell, UtensilsCrossed, User, Activity, Share2 } from "lucide-react";
import { isElectron } from "../constants";

interface ScheduleCfg {
  enabled: boolean;
  time: string;
}

interface HealthGoals {
  target_weight_kg?: number;
  target_height_cm?: number;
  current_weight_kg?: number;
  current_height_cm?: number;
  start_weight_kg?: number;
}

interface WeeklyWeight {
  current?: { weight: number; date: string };
  lastWeek?: { weight: number; date: string };
  weeklyChange?: number;
  totalLost?: number;
  goals?: { target?: number; start?: number };
}

const AGENTS = [
  { id: "Nutritionist", label: "Nutricionista", icon: UtensilsCrossed, color: "#2ecc71", desc: "Cardápio diário via WhatsApp" },
  { id: "Personal Trainer", label: "Personal Trainer", icon: Dumbbell, color: "#e67e22", desc: "Treino diário via WhatsApp" },
  { id: "Personal Assistant", label: "Assistente Pessoal", icon: User, color: "#3498db", desc: "Agenda diária via WhatsApp" },
  { id: "Health", label: "Saúde", icon: Activity, color: "#e74c3c", desc: "Check-in de saúde via WhatsApp" },
  { id: "Social Media", label: "Redes Sociais", icon: Share2, color: "#9b59b6", desc: "Conteúdo diário para redes sociais" },
];

export function SchedulesPanel({ onClose }: { onClose: () => void }) {
  const [schedules, setSchedules] = useState<Record<string, ScheduleCfg>>({});
  const [goals, setGoals] = useState<HealthGoals>({});
  const [weight, setWeight] = useState("");
  const [weekly, setWeekly] = useState<WeeklyWeight | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.schedules.get().then(setSchedules);
    window.orun.healthGoals.get().then((g) => { if (g) setGoals(g); });
    window.orun.healthGoals.weeklyWeight().then(setWeekly);
  }, []);

  const toggleAgent = async (agentId: string, enabled: boolean) => {
    const current = schedules[agentId] || { enabled: false, time: "07:00" };
    const next = { ...schedules, [agentId]: { ...current, enabled } };
    setSchedules(next);
    if (isElectron) await window.orun.schedules.set(agentId, next[agentId]);
  };

  const setTime = async (agentId: string, time: string) => {
    const current = schedules[agentId] || { enabled: false, time: "07:00" };
    const next = { ...schedules, [agentId]: { ...current, time } };
    setSchedules(next);
    if (isElectron) await window.orun.schedules.set(agentId, next[agentId]);
  };

  const saveGoals = async () => {
    if (!isElectron) return;
    await window.orun.healthGoals.set({
      ...goals,
      start_weight_kg: goals.start_weight_kg || (goals.current_weight_kg ? Number(goals.current_weight_kg) : undefined),
      start_date: goals.start_date || new Date().toISOString().slice(0, 10),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    const w = await window.orun.healthGoals.weeklyWeight();
    setWeekly(w);
  };

  const logWeight = async () => {
    if (!isElectron || !weight) return;
    await window.orun.healthGoals.logWeight(Number(weight));
    setWeight("");
    const w = await window.orun.healthGoals.weeklyWeight();
    setWeekly(w);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[480px] max-h-[88vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
              Automações & Metas
            </span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>
        <p className="text-[10px] mb-5" style={{ color: "#555" }}>
          Configure horários diários para os agentes enviarem resumo no WhatsApp. Defina suas metas de peso.
        </p>

        {/* Health Goals */}
        <div className="p-3 rounded-lg mb-4" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-2 mb-3">
            <Scale size={13} style={{ color: "#e74c3c" }} />
            <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>Metas de Saúde</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#555" }}>Peso Atual (kg)</label>
              <input type="number" step="0.1" value={goals.current_weight_kg || ""} onChange={(e) => setGoals((p) => ({ ...p, current_weight_kg: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd" }} />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#555" }}>Meta de Peso (kg)</label>
              <input type="number" step="0.1" value={goals.target_weight_kg || ""} onChange={(e) => setGoals((p) => ({ ...p, target_weight_kg: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd" }} />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#555" }}>Altura (cm)</label>
              <input type="number" step="0.1" value={goals.current_height_cm || ""} onChange={(e) => setGoals((p) => ({ ...p, current_height_cm: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd" }} />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "#555" }}>Peso Inicial (kg)</label>
              <input type="number" step="0.1" value={goals.start_weight_kg || ""} onChange={(e) => setGoals((p) => ({ ...p, start_weight_kg: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd" }} />
            </div>
          </div>
          <button onClick={saveGoals} className="w-full py-1.5 rounded-md text-xs mb-2" style={{ background: "#C00018", color: "#fff" }}>
            {saved ? "✓ Salvo!" : "Salvar Metas"}
          </button>

          {/* Weekly Weight Comparison */}
          {weekly && (
            <div className="mt-2 p-2 rounded-md" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
              {weekly.current && (
                <div className="flex justify-between text-[10px] mb-1" style={{ color: "#888" }}>
                  <span>Peso atual: <b style={{ color: "#ddd" }}>{weekly.current.weight}kg</b></span>
                  <span>{weekly.current.date}</span>
                </div>
              )}
              {weekly.weeklyChange != null && (
                <div className="text-[10px]" style={{ color: weekly.weeklyChange <= 0 ? "#2ecc71" : "#e74c3c" }}>
                  Variação semanal: {weekly.weeklyChange > 0 ? "+" : ""}{weekly.weeklyChange}kg
                </div>
              )}
              {weekly.totalLost != null && (
                <div className="text-[10px]" style={{ color: "#2ecc71" }}>
                  Total perdido: {weekly.totalLost}kg
                </div>
              )}
              {weekly.goals?.target && (
                <div className="text-[10px]" style={{ color: "#555" }}>
                  Meta: {weekly.goals.target}kg {weekly.current ? `(${(weekly.current.weight - weekly.goals.target).toFixed(1)}kg restantes)` : ""}
                </div>
              )}
            </div>
          )}

          {/* Quick weight log */}
          <div className="flex gap-2 mt-2">
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Registrar peso (kg)"
              className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd" }} />
            <button onClick={logWeight} disabled={!weight} className="px-3 py-1.5 rounded-md text-xs" style={{ background: "#1a1a1a", color: "#aaa", opacity: weight ? 1 : 0.4 }}>
              Registrar
            </button>
          </div>
        </div>

        <div className="h-px my-4" style={{ background: "#1a1a1a" }} />

        {/* Agent Schedules */}
        <p className="text-[10px] tracking-wider uppercase mb-3" style={{ color: "#555" }}>Horários Diários</p>
        <div className="space-y-2">
          {AGENTS.map((agent) => {
            const cfg = schedules[agent.id] || { enabled: false, time: "07:00" };
            const Icon = agent.icon;
            return (
              <div key={agent.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
                <input type="checkbox" checked={cfg.enabled} onChange={(e) => toggleAgent(agent.id, e.target.checked)} className="accent-[#C00018]" />
                <Icon size={14} style={{ color: agent.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "#ddd" }}>{agent.label}</p>
                  <p className="text-[10px]" style={{ color: "#555" }}>{agent.desc}</p>
                </div>
                <input type="time" value={cfg.time} onChange={(e) => setTime(agent.id, e.target.value)}
                  className="px-2 py-1 rounded-md text-xs outline-none" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ddd", width: 90 }} />
              </div>
            );
          })}
        </div>

        <div className="h-px my-4" style={{ background: "#1a1a1a" }} />
        <p className="text-[10px]" style={{ color: "#444" }}>
          Os agentes enviam resumos no WhatsApp na horário configurado. O Nutricionista prepara cardápio, o Personal Trainer monta treino, o Assistente manda agenda e Saúde faz check-in.
        </p>
      </motion.div>
    </motion.div>
  );
}
