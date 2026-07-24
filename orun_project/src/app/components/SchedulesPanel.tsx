import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { X, Clock, Scale, Calendar, Dumbbell, UtensilsCrossed, User, Activity, Share2 } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";

interface ScheduleCfg {
  enabled: boolean;
  time: string;
  frequency?: "daily" | "hourly";
}

interface HealthGoals {
  target_weight_kg?: number;
  target_height_cm?: number;
  current_weight_kg?: number;
  current_height_cm?: number;
  start_weight_kg?: number;
  start_date?: string;
}

interface WeeklyWeight {
  current?: { weight: number; date: string };
  lastWeek?: { weight: number; date: string };
  weeklyChange?: number;
  totalLost?: number;
  goals?: { target?: number; start?: number };
}

const AGENT_IDS = ["Nutritionist", "Personal Trainer", "Personal Assistant", "Health", "Social Media"] as const;

function getAgents(t: (key: string) => string) {
  return [
    { id: "Nutritionist", label: t("schedulesNutritionist"), icon: UtensilsCrossed, color: "#2ecc71", desc: t("schedulesNutritionistDesc") },
    { id: "Personal Trainer", label: t("schedulesPersonalTrainer"), icon: Dumbbell, color: "#e67e22", desc: t("schedulesPersonalTrainerDesc") },
    { id: "Personal Assistant", label: t("schedulesPersonalAssistant"), icon: User, color: "#3498db", desc: t("schedulesPersonalAssistantDesc") },
    { id: "Health", label: t("schedulesHealth"), icon: Activity, color: "#e74c3c", desc: t("schedulesHealthDesc") },
    { id: "Social Media", label: t("schedulesSocialMedia"), icon: Share2, color: "#9b59b6", desc: t("schedulesSocialMediaAgentDesc") },
  ];
}

export function SchedulesPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<Record<string, ScheduleCfg>>({});
  const [goals, setGoals] = useState<HealthGoals>({});
  const [weight, setWeight] = useState("");
  const [weekly, setWeekly] = useState<WeeklyWeight | null>(null);
  const [saved, setSaved] = useState(false);
  const agents = getAgents(t);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.schedules.get().then(setSchedules).catch((err: unknown) => console.warn("[IPC error]", err));
    window.orun.healthGoals.get().then((g) => { if (g) setGoals(g); }).catch((err: unknown) => console.warn("[IPC error]", err));
    window.orun.healthGoals.weeklyWeight().then(setWeekly).catch((err: unknown) => console.warn("[IPC error]", err));
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
    setTimeout(() => { if (mountedRef.current) setSaved(false); }, 2000);
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
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {t("schedulesTitle")}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>
        <p className="text-[10px] mb-5" style={{ color: "var(--muted-foreground)" }}>
          {t("schedulesDescription")}
        </p>

        {/* Health Goals */}
        <div className="p-3 rounded-lg mb-4" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Scale size={13} style={{ color: "#e74c3c" }} />
            <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("schedulesHealthGoals")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>{t("schedulesCurrentWeight")}</label>
              <input type="number" step="0.1" value={goals.current_weight_kg || ""} onChange={(e) => setGoals((p) => ({ ...p, current_weight_kg: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>{t("schedulesTargetWeight")}</label>
              <input type="number" step="0.1" value={goals.target_weight_kg || ""} onChange={(e) => setGoals((p) => ({ ...p, target_weight_kg: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>{t("schedulesHeight")}</label>
              <input type="number" step="0.1" value={goals.current_height_cm || ""} onChange={(e) => setGoals((p) => ({ ...p, current_height_cm: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--muted-foreground)" }}>{t("schedulesStartWeight")}</label>
              <input type="number" step="0.1" value={goals.start_weight_kg || ""} onChange={(e) => setGoals((p) => ({ ...p, start_weight_kg: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            </div>
          </div>
          <button onClick={saveGoals} className="w-full py-1.5 rounded-md text-xs mb-2" style={{ background: "#C00018", color: "var(--foreground)" }}>
            {saved ? t("schedulesSaved") : t("schedulesSaveGoals")}
          </button>

          {/* Weekly Weight Comparison */}
          {weekly && (
            <div className="mt-2 p-2 rounded-md" style={{ background: "var(--input)", border: "1px solid var(--border)" }}>
              {weekly.current && (
                <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--muted-foreground)" }}>
                  <span>{t("schedulesWeightCurrent")} <b style={{ color: "var(--foreground)" }}>{weekly.current.weight}kg</b></span>
                  <span>{weekly.current.date}</span>
                </div>
              )}
              {weekly.weeklyChange != null && (
                <div className="text-[10px]" style={{ color: weekly.weeklyChange <= 0 ? "#2ecc71" : "#e74c3c" }}>
                  {t("schedulesWeightChange")} {weekly.weeklyChange > 0 ? "+" : ""}{weekly.weeklyChange}kg
                </div>
              )}
              {weekly.totalLost != null && (
                <div className="text-[10px]" style={{ color: "#2ecc71" }}>
                  {t("schedulesWeightLost")} {weekly.totalLost}kg
                </div>
              )}
              {weekly.goals?.target && (
                <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {t("schedulesTarget")} {weekly.goals.target}kg {weekly.current ? `(${(weekly.current.weight - weekly.goals.target).toFixed(1)}kg ${t("schedulesRemaining")}` : ""}
                </div>
              )}
            </div>
          )}

          {/* Quick weight log */}
          <div className="flex gap-2 mt-2">
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t("schedulesLogWeight")}
              className="flex-1 px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            <button onClick={logWeight} disabled={!weight} className="px-3 py-1.5 rounded-md text-xs" style={{ background: "var(--border)", color: "var(--muted-foreground)", opacity: weight ? 1 : 0.4 }}>
              {t("schedulesRegister")}
            </button>
          </div>
        </div>

        <div className="h-px my-4" style={{ background: "var(--border)" }} />

        {/* Social Media Auto-Post */}
        <div className="p-3 rounded-lg mb-4" style={{ background: "var(--secondary)", border: "1px solid #9b59b6" }}>
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={13} style={{ color: "#9b59b6" }} />
            <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("schedulesSocialMediaAuto")}</span>
          </div>
          <p className="text-[10px] mb-3" style={{ color: "var(--muted-foreground)" }}>
            {t("schedulesSocialMediaDesc")}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={schedules["Social Media"]?.enabled || false}
              onChange={(e) => toggleAgent("Social Media", e.target.checked)}
              className="accent-[#9b59b6]" />
            <span className="text-xs" style={{ color: "var(--foreground)" }}>{t("schedulesAutoEnable")}</span>
          </div>
          {schedules["Social Media"]?.enabled && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("schedulesStart")}</span>
              <input type="time" value={schedules["Social Media"]?.time || "09:00"}
                onChange={(e) => setTime("Social Media", e.target.value)}
                className="px-2 py-1 rounded-md text-xs outline-none"
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", width: 90 }} />
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("schedulesHourly")}</span>
            </div>
          )}
        </div>

        {/* Agent Schedules */}
        <p className="text-[10px] tracking-wider uppercase mb-3" style={{ color: "var(--muted-foreground)" }}>{t("schedulesOtherAgents")}</p>
        <div className="space-y-2">
          {agents.filter((a) => a.id !== "Social Media").map((agent) => {
            const cfg = schedules[agent.id] || { enabled: false, time: "07:00" };
            const Icon = agent.icon;
            return (
              <div key={agent.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <input type="checkbox" checked={cfg.enabled} onChange={(e) => toggleAgent(agent.id, e.target.checked)} className="accent-[#C00018]" />
                <Icon size={14} style={{ color: agent.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{agent.label}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{agent.desc}</p>
                </div>
                <input type="time" value={cfg.time} onChange={(e) => setTime(agent.id, e.target.value)}
                  className="px-2 py-1 rounded-md text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", width: 90 }} />
              </div>
            );
          })}
        </div>

        <div className="h-px my-4" style={{ background: "var(--border)" }} />
        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {t("schedulesFooter")}
        </p>
      </motion.div>
    </motion.div>
  );
}
