import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, DollarSign, Heart, Code, BookOpen, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus, Video, Cpu, Music } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { LucideIcon } from "lucide-react";
import type { OrunFinanceDaily, OrunHealthEntry, OrunDeveloperReview, OrunTeacherProgress, OrunVideoProject, OrunImage3DGeneration, OrunMusicProject, OrunNutritionDaily } from "../../types/orun";

type AgentType = "Finance" | "Health" | "Developer" | "Teacher" | "Creator" | "Designer";

interface Props {
  agent: AgentType;
  onClose: () => void;
  onBack?: () => void;
}

type FinanceEntry = OrunFinanceDaily["entries"][number];

const AGENT_CONFIG: Record<AgentType, { icon: LucideIcon; color: string; titleKey: string }> = {
  Finance: { icon: DollarSign, color: "#2ecc71", titleKey: "agentDataFinanceLog" },
  Health: { icon: Heart, color: "#e74c3c", titleKey: "agentDataWellnessLog" },
  Developer: { icon: Code, color: "#3498db", titleKey: "agentDataCodeReviews" },
  Teacher: { icon: BookOpen, color: "#f39c12", titleKey: "agentDataLearningProgress" },
  Creator: { icon: Video, color: "#9b59b6", titleKey: "agentDataCreatorProjects" },
  Designer: { icon: Cpu, color: "#1abc9c", titleKey: "agentDataDesigns" },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FinanceView() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrunFinanceDaily | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.finance.getDaily().then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (!data) return <div className="text-center py-8 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataLoading")}</div>;

  const categoryColors: Record<string, string> = {
    food: "#e74c3c", transport: "#3498db", housing: "#9b59b6", entertainment: "#e67e22",
    health: "#2ecc71", education: "#f39c12", salary: "#2ecc71", other: "#95a5a6",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] tracking-wider uppercase" style={{ color: "var(--muted-foreground)" }}>{t("agentDataIncome")}</div>
          <div className="text-sm font-medium" style={{ color: "#2ecc71", fontFamily: "'JetBrains Mono', monospace" }}>+${data.totals.income.toFixed(2)}</div>
        </div>
        <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] tracking-wider uppercase" style={{ color: "var(--muted-foreground)" }}>{t("agentDataExpenses")}</div>
          <div className="text-sm font-medium" style={{ color: "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>-${data.totals.expenses.toFixed(2)}</div>
        </div>
        <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] tracking-wider uppercase" style={{ color: "var(--muted-foreground)" }}>{t("agentDataBalance")}</div>
          <div className="text-sm font-medium" style={{ color: data.balance >= 0 ? "#2ecc71" : "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>${data.balance.toFixed(2)}</div>
        </div>
      </div>
      {data.entries.length === 0 ? (
        <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoTransactions")}</div>
      ) : (
        data.entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${categoryColors[e.category || "other"]}15` }}>
              {e.type === "income" ? <TrendingUp size={13} style={{ color: "#2ecc71" }} /> : <TrendingDown size={13} style={{ color: "#e74c3c" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] truncate" style={{ color: "var(--foreground)" }}>{e.description}</div>
              <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{e.category || "other"} · {formatTime(e.created_at)}</div>
            </div>
            <div className="text-xs font-medium" style={{ color: e.type === "income" ? "#2ecc71" : "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>
              {e.type === "income" ? "+" : "-"}${Math.abs(e.amount).toFixed(2)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function HealthView() {
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState<OrunHealthEntry[]>([]);
  const [nutritionData, setNutritionData] = useState<OrunNutritionDaily | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.health.getDaily().then(setHealthData).catch((err: unknown) => console.warn("[IPC error]", err));
    window.orun.nutrition.getDaily().then(setNutritionData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  const hasHealth = healthData.length > 0;
  const hasNutrition = nutritionData && nutritionData.entries.length > 0;

  if (!hasHealth && !hasNutrition) return <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoHealth")}</div>;

  const metricIcons: Record<string, string> = {
    weight: "⚖️", blood_pressure: "🩺", heart_rate: "❤️", steps: "👟", sleep: "😴", temperature: "🌡️",
  };

  return (
    <div className="space-y-4">
      {/* Nutrition Summary */}
      {hasNutrition && nutritionData && (
        <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#e67e22" }}>{t("agentDataNutritionToday")}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><div className="text-sm font-medium" style={{ color: "#e67e22", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(nutritionData.totals.calories)}</div><div className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>kcal</div></div>
            <div><div className="text-sm font-medium" style={{ color: "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(nutritionData.totals.protein_g)}g</div><div className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataProtein")}</div></div>
            <div><div className="text-sm font-medium" style={{ color: "#f39c12", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(nutritionData.totals.carbs_g)}g</div><div className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataCarbs")}</div></div>
            <div><div className="text-sm font-medium" style={{ color: "#3498db", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(nutritionData.totals.fat_g)}g</div><div className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataFat")}</div></div>
          </div>
          <div className="mt-2 space-y-1">
            {nutritionData.entries.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                <span>{e.description}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(e.calories ?? 0)} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Metrics */}
      {hasHealth && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "#e74c3c" }}>{t("agentDataHealthMetrics")}</div>
          {healthData.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="text-lg">{metricIcons[e.metric] || "📊"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.metric.replace(/_/g, " ")}</div>
                {e.notes && <div className="text-[9px] truncate" style={{ color: "var(--muted-foreground)" }}>{e.notes}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs font-medium" style={{ color: "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>{e.value}</div>
                {e.unit && <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{e.unit}</div>}
              </div>
              <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{formatTime(e.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeveloperView() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrunDeveloperReview[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.developer.getReviews().then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoCodeReviews")}</div>;

  const severityConfig: Record<string, { color: string; icon: LucideIcon }> = {
    low: { color: "#2ecc71", icon: CheckCircle },
    medium: { color: "#f39c12", icon: AlertTriangle },
    high: { color: "#e67e22", icon: AlertTriangle },
    critical: { color: "#e74c3c", icon: AlertTriangle },
  };

  return (
    <div className="space-y-2">
      {data.map((e) => {
        const sev = severityConfig[e.severity || "low"] || severityConfig.low;
        const SevIcon = sev.icon;
        return (
          <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <SevIcon size={12} style={{ color: sev.color }} />
              <span className="text-[10px] tracking-wider uppercase" style={{ color: sev.color }}>{e.severity || "low"}</span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>· {e.issues_found} issue(s)</span>
              {e.repo && <span className="text-[9px] ml-auto" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{e.repo}</span>}
            </div>
            <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.summary}</div>
            {e.file_path && <div className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{e.file_path}</div>}
          </div>
        );
      })}
    </div>
  );
}

function TeacherView() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrunTeacherProgress[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.teacher.getProgress().then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoLearning")}</div>;

  const statusConfig: Record<string, { color: string; label: string }> = {
    learning: { color: "#3498db", label: "Learning" },
    reviewed: { color: "#f39c12", label: "Reviewed" },
    mastered: { color: "#2ecc71", label: "Mastered" },
  };

  return (
    <div className="space-y-2">
      {data.map((e) => {
        const st = statusConfig[e.status] || statusConfig.learning;
        return (
          <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              <span className="text-[10px] tracking-wider uppercase" style={{ color: st.color }}>{st.label}</span>
              {e.score != null && <span className="text-[9px] ml-auto" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>Score: {e.score}</span>}
            </div>
            <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.subject} → {e.topic}</div>
            {e.notes && <div className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>{e.notes}</div>}
          </div>
        );
      })}
    </div>
  );
}

function CreatorView() {
  const { t } = useTranslation();
  const [videoData, setVideoData] = useState<OrunVideoProject[]>([]);
  const [musicData, setMusicData] = useState<OrunMusicProject[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.videoEditor.getProjects().then(setVideoData).catch((err: unknown) => console.warn("[IPC error]", err));
    window.orun.musicProducer.getProjects().then(setMusicData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  const hasVideo = videoData.length > 0;
  const hasMusic = musicData.length > 0;

  if (!hasVideo && !hasMusic) return <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoCreator")}</div>;

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: "#95a5a6", label: t("agentDataDraft") },
    rendering: { color: "#3498db", label: t("agentDataRendering") },
    processing: { color: "#3498db", label: t("agentDataProcessing") },
    completed: { color: "#2ecc71", label: t("agentDataCompleted") },
    failed: { color: "#e74c3c", label: t("agentDataFailed") },
  };

  const engineLabels: Record<string, string> = { wondera: "Wondera.AI", autotone: "Autotone", mixer: "Audio Mixer" };

  return (
    <div className="space-y-4">
      {hasVideo && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "#9b59b6" }}>{t("agentDataVideoProjects")}</div>
          {videoData.map((e) => {
            const st = statusConfig[e.status] || statusConfig.draft;
            return (
              <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                  <span className="text-[10px] tracking-wider uppercase" style={{ color: st.color }}>{st.label}</span>
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>· {e.template || t("agentDataCustom")}</span>
                  {e.render_time_ms != null && <span className="text-[9px] ml-auto" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{(e.render_time_ms / 1000).toFixed(1)}s</span>}
                </div>
                <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.title}</div>
                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{e.resolution} · {e.fps}fps{e.duration_sec != null ? ` · ${e.duration_sec}s` : ""}</div>
              </div>
            );
          })}
        </div>
      )}

      {hasMusic && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "#e67e22" }}>{t("agentDataMusicProjects")}</div>
          {musicData.map((e) => {
            const st = statusConfig[e.status] || statusConfig.draft;
            return (
              <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                  <span className="text-[10px] tracking-wider uppercase" style={{ color: st.color }}>{st.label}</span>
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>· {engineLabels[e.engine] || e.engine}</span>
                  {e.duration_sec != null && <span className="text-[9px] ml-auto" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{e.duration_sec}s</span>}
                </div>
                <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.title}</div>
                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{e.genre || "untagged"}{e.bpm != null ? ` · ${e.bpm} BPM` : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DesignerView() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrunImage3DGeneration[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.image3d.getGenerations().then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoGenerations")}</div>;

  const engineColors: Record<string, string> = { fal: "#8b5cf6", tripo: "#06b6d4", comfyui: "#10b981" };

  return (
    <div className="space-y-2">
      {data.map((e) => (
        <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: engineColors[e.engine] || "#888" }} />
            <span className="text-[10px] tracking-wider uppercase" style={{ color: engineColors[e.engine] || "#888" }}>{e.engine}</span>
            {e.model_used && <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>· {e.model_used}</span>}
            {e.generation_time_ms != null && <span className="text-[9px] ml-auto" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{(e.generation_time_ms / 1000).toFixed(1)}s</span>}
          </div>
          <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.prompt.slice(0, 120)}{e.prompt.length > 120 ? "..." : ""}</div>
          {e.output_url && <div className="text-[9px] mt-1 truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{e.output_url}</div>}
        </div>
      ))}
    </div>
  );
}

function MusicProducerView() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrunMusicProject[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.musicProducer.getProjects().then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("agentDataNoMusic")}</div>;

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: "#95a5a6", label: "Draft" },
    processing: { color: "#3498db", label: "Processing" },
    completed: { color: "#2ecc71", label: "Completed" },
    failed: { color: "#e74c3c", label: "Failed" },
  };

  const engineLabels: Record<string, string> = { wondera: "Wondera.AI", autotone: "Autotone", mixer: "Audio Mixer" };

  return (
    <div className="space-y-2">
      {data.map((e) => {
        const st = statusConfig[e.status] || statusConfig.draft;
        return (
          <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              <span className="text-[10px] tracking-wider uppercase" style={{ color: st.color }}>{st.label}</span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>· {engineLabels[e.engine] || e.engine}</span>
              {e.duration_sec != null && <span className="text-[9px] ml-auto" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>{e.duration_sec}s</span>}
            </div>
            <div className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.title}</div>
            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{e.genre || "untagged"}{e.bpm != null ? ` · ${e.bpm} BPM` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AgentDataPanel({ agent, onClose, onBack }: Props) {
  const { t } = useTranslation();
  const config = AGENT_CONFIG[agent];
  const Icon = config.icon;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[460px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button onClick={onBack}><ArrowLeft size={15} style={{ color: "var(--muted-foreground)" }} /></button>
            )}
            <Icon size={14} style={{ color: config.color }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t(config.titleKey as any)}</span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>
        <div className="px-6 py-4">
          <div className="text-[9px] tracking-wider uppercase mb-3" style={{ color: "var(--muted-foreground)" }}>{todayKey()}</div>
          {agent === "Finance" && <FinanceView />}
          {agent === "Health" && <HealthView />}
          {agent === "Developer" && <DeveloperView />}
          {agent === "Teacher" && <TeacherView />}
          {agent === "Creator" && <CreatorView />}
          {agent === "Designer" && <DesignerView />}
        </div>
      </motion.div>
    </motion.div>
  );
}
