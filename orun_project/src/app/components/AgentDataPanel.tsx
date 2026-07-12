import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, DollarSign, Heart, Code, BookOpen, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Minus } from "lucide-react";
import { isElectron } from "../constants";

type AgentType = "Finance" | "Health" | "Developer" | "Teacher";

interface Props {
  agent: AgentType;
  onClose: () => void;
  onBack?: () => void;
}

const AGENT_CONFIG: Record<AgentType, { icon: any; color: string; title: string }> = {
  Finance: { icon: DollarSign, color: "#2ecc71", title: "Finance Log" },
  Health: { icon: Heart, color: "#e74c3c", title: "Health Metrics" },
  Developer: { icon: Code, color: "#3498db", title: "Code Reviews" },
  Teacher: { icon: BookOpen, color: "#f39c12", title: "Learning Progress" },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FinanceView() {
  const [data, setData] = useState<{ entries: any[]; totals: { income: number; expenses: number }; balance: number } | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.finance.getDaily().then(setData);
  }, []);

  if (!data) return <div className="text-center py-8 text-[11px]" style={{ color: "#555" }}>Loading...</div>;

  const categoryColors: Record<string, string> = {
    food: "#e74c3c", transport: "#3498db", housing: "#9b59b6", entertainment: "#e67e22",
    health: "#2ecc71", education: "#f39c12", salary: "#2ecc71", other: "#95a5a6",
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="text-[9px] tracking-wider uppercase" style={{ color: "#555" }}>Income</div>
          <div className="text-sm font-medium" style={{ color: "#2ecc71", fontFamily: "'JetBrains Mono', monospace" }}>+${data.totals.income.toFixed(2)}</div>
        </div>
        <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="text-[9px] tracking-wider uppercase" style={{ color: "#555" }}>Expenses</div>
          <div className="text-sm font-medium" style={{ color: "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>-${data.totals.expenses.toFixed(2)}</div>
        </div>
        <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="text-[9px] tracking-wider uppercase" style={{ color: "#555" }}>Balance</div>
          <div className="text-sm font-medium" style={{ color: data.balance >= 0 ? "#2ecc71" : "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>${data.balance.toFixed(2)}</div>
        </div>
      </div>
      {data.entries.length === 0 ? (
        <div className="text-center py-6 text-[11px]" style={{ color: "#444" }}>No transactions today. Chat with Finance to log expenses.</div>
      ) : (
        data.entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${categoryColors[e.category || "other"]}15` }}>
              {e.type === "income" ? <TrendingUp size={13} style={{ color: "#2ecc71" }} /> : <TrendingDown size={13} style={{ color: "#e74c3c" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] truncate" style={{ color: "#ccc" }}>{e.description}</div>
              <div className="text-[9px]" style={{ color: "#555" }}>{e.category || "other"} · {formatTime(e.created_at)}</div>
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
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.health.getDaily().then(setData);
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "#444" }}>No health metrics today. Chat with Health to log vitals.</div>;

  const metricIcons: Record<string, string> = {
    weight: "⚖️", blood_pressure: "🩺", heart_rate: "❤️", steps: "👟", sleep: "😴", temperature: "🌡️",
  };

  return (
    <div className="space-y-2">
      {data.map((e) => (
        <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="text-lg">{metricIcons[e.metric] || "📊"}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px]" style={{ color: "#ccc" }}>{e.metric.replace(/_/g, " ")}</div>
            {e.notes && <div className="text-[9px] truncate" style={{ color: "#555" }}>{e.notes}</div>}
          </div>
          <div className="text-right">
            <div className="text-xs font-medium" style={{ color: "#e74c3c", fontFamily: "'JetBrains Mono', monospace" }}>{e.value}</div>
            {e.unit && <div className="text-[9px]" style={{ color: "#555" }}>{e.unit}</div>}
          </div>
          <div className="text-[9px]" style={{ color: "#444" }}>{formatTime(e.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

function DeveloperView() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.developer.getReviews().then(setData);
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "#444" }}>No code reviews today. Chat with Developer to review code.</div>;

  const severityConfig: Record<string, { color: string; icon: any }> = {
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
          <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-2 mb-1">
              <SevIcon size={12} style={{ color: sev.color }} />
              <span className="text-[10px] tracking-wider uppercase" style={{ color: sev.color }}>{e.severity || "low"}</span>
              <span className="text-[9px]" style={{ color: "#555" }}>· {e.issues_found} issue(s)</span>
              {e.repo && <span className="text-[9px] ml-auto" style={{ color: "#444", fontFamily: "'JetBrains Mono', monospace" }}>{e.repo}</span>}
            </div>
            <div className="text-[11px]" style={{ color: "#ccc" }}>{e.summary}</div>
            {e.file_path && <div className="text-[9px] mt-1" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>{e.file_path}</div>}
          </div>
        );
      })}
    </div>
  );
}

function TeacherView() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.teacher.getProgress().then(setData);
  }, []);

  if (data.length === 0) return <div className="text-center py-6 text-[11px]" style={{ color: "#444" }}>No learning progress today. Chat with Teacher to start learning.</div>;

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
          <div key={e.id} className="px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              <span className="text-[10px] tracking-wider uppercase" style={{ color: st.color }}>{st.label}</span>
              {e.score != null && <span className="text-[9px] ml-auto" style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace" }}>Score: {e.score}</span>}
            </div>
            <div className="text-[11px]" style={{ color: "#ccc" }}>{e.subject} → {e.topic}</div>
            {e.notes && <div className="text-[9px] mt-1" style={{ color: "#555" }}>{e.notes}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function AgentDataPanel({ agent, onClose, onBack }: Props) {
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
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button onClick={onBack}><ArrowLeft size={15} style={{ color: "#666" }} /></button>
            )}
            <Icon size={14} style={{ color: config.color }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>{config.title}</span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>
        <div className="px-6 py-4">
          <div className="text-[9px] tracking-wider uppercase mb-3" style={{ color: "#444" }}>{todayKey()}</div>
          {agent === "Finance" && <FinanceView />}
          {agent === "Health" && <HealthView />}
          {agent === "Developer" && <DeveloperView />}
          {agent === "Teacher" && <TeacherView />}
        </div>
      </motion.div>
    </motion.div>
  );
}
