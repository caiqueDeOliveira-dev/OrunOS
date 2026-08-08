import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  X, Sparkles, Play, ListChecks, ClipboardCheck, Target, RefreshCw,
  CheckCircle2, Circle, XCircle, Loader2, AlertTriangle,
} from "lucide-react";

interface PlannerTask {
  id: string;
  goalId: string;
  title: string;
  description: string;
  agent: string | null;
  status: string;
  priority: number;
  dependencies: string[];
  result: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

interface PlannerStats { total: number; byStatus: Record<string, number>; goals: number; }

const plannerApi = (window as unknown as { orun?: { planner?: {
  list: (opts?: { goalId?: string | null; status?: string | null }) => Promise<PlannerTask[]>;
  next: (goalId: string) => Promise<{ ok: boolean; task?: PlannerTask; error?: string }>;
  run: (goalId: string) => Promise<{ ok: boolean; counts?: { total: number; done: number; failed: number; pending: number } }>;
  plan: (goal: string, context?: string) => Promise<{ ok: boolean; tasks?: PlannerTask[]; error?: string }>;
  review: (goalId: string) => Promise<{ ok: boolean; summary?: { goalId: string; total: number; done: number; failed: number; review?: string } }>;
  stats: () => Promise<PlannerStats>;
} } }).orun?.planner;

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  running: "Executando",
  done: "Concluído",
  failed: "Falhou",
  blocked: "Bloqueado",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--muted-foreground)",
  running: "#3b82f6",
  done: "#22c55e",
  failed: "#ef4444",
  blocked: "#f59e0b",
  cancelled: "var(--muted-foreground)",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 size={12} style={{ color: STATUS_COLOR.done }} />;
  if (status === "failed") return <XCircle size={12} style={{ color: STATUS_COLOR.failed }} />;
  if (status === "running") return <Loader2 size={12} className="animate-spin" style={{ color: STATUS_COLOR.running }} />;
  if (status === "blocked") return <AlertTriangle size={12} style={{ color: STATUS_COLOR.blocked }} />;
  if (status === "cancelled") return <XCircle size={12} style={{ color: "var(--muted-foreground)" }} />;
  return <Circle size={12} style={{ color: "var(--muted-foreground)" }} />;
}

export function PlannerPanel({ onClose }: { onClose: () => void }) {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [stats, setStats] = useState<PlannerStats>({ total: 0, byStatus: {}, goals: 0 });
  const [review, setReview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!plannerApi?.list) return;
    setLoading(true);
    try {
      setTasks(await plannerApi.list());
      const s = await plannerApi.stats();
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const goals = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) set.add(t.goalId);
    return Array.from(set).sort();
  }, [tasks]);

  const goalTasks = useMemo(
    () => tasks.filter((t) => t.goalId === selectedGoal).sort((a, b) => (a.priority || 3) - (b.priority || 3)),
    [tasks, selectedGoal],
  );

  useEffect(() => {
    if (!selectedGoal && goals.length > 0) setSelectedGoal(goals[0]);
  }, [goals, selectedGoal]);

  const currentGoal = selectedGoal || goal.trim() || "default";

  const doPlan = async () => {
    if (!plannerApi?.plan || !goal.trim()) return;
    setBusy(true); setError(""); setReview("");
    try {
      const res = await plannerApi.plan(goal.trim(), context.trim());
      if (!res.ok) setError(res.error || "falha ao planejar");
      else if (res.tasks?.length) setSelectedGoal(goal.trim());
      await load();
    } finally {
      setBusy(false);
    }
  };

  const doNext = async () => {
    if (!plannerApi?.next) return;
    setBusy(true); setError(""); setReview("");
    try {
      const res = await plannerApi.next(currentGoal);
      if (!res.ok && !res.task) setError(res.error || "nenhuma tarefa");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const doRun = async () => {
    if (!plannerApi?.run) return;
    setBusy(true); setError(""); setReview("");
    try {
      const res = await plannerApi.run(currentGoal);
      if (!res.ok) setError("falha ao executar");
      else if (res.counts && res.counts.total === 0) setError("nenhuma tarefa nesse objetivo");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const doReview = async () => {
    if (!plannerApi?.review) return;
    setBusy(true); setError(""); setReview("");
    try {
      const res = await plannerApi.review(currentGoal);
      setReview(res.summary?.review || "");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const done = (stats.byStatus.done || 0) + (stats.byStatus.failed || 0) + (stats.byStatus.cancelled || 0);

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
        className="w-[600px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Target size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Planner</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
              {stats.total} tarefas · {stats.goals} objetivos
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex gap-2">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doPlan(); }}
              placeholder="Objetivo (ex.: organizar a semana)"
              className="flex-1 px-3 py-2 rounded-lg text-[12px] outline-none"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
            />
            <button
              onClick={doPlan}
              disabled={busy || !goal.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-opacity disabled:opacity-40"
              style={{ background: "rgba(192,0,24,0.9)", color: "#fff" }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Planejar
            </button>
          </div>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Contexto opcional (prioridades, prazos, notas)..."
            className="w-full px-3 py-2 rounded-lg text-[11px] outline-none"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
          />

          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            {Object.entries({ pending: "pendente", running: "executando", done: "concluída", failed: "falhou", blocked: "bloqueada", cancelled: "cancelada" }).map(([k, label]) => (
              <span key={k} className="px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: STATUS_COLOR[k] || "var(--muted-foreground)" }}>
                {stats.byStatus[k] || 0} {label}
              </span>
            ))}
          </div>

          {goals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Objetivo:</span>
              {goals.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGoal(g)}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                  style={{
                    background: selectedGoal === g ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--secondary)",
                    color: selectedGoal === g ? "var(--primary)" : "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {error}
            </div>
          )}

          {review && (
            <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(34,197,94,0.08)", color: "var(--foreground)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#22c55e" }}>Revisão</div>
              {review}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              {goalTasks.length > 0 ? `Tarefas — ${goalTasks.filter((t) => t.status === "done").length}/${goalTasks.length} concluídas` : "Nenhuma tarefa"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={doReview}
                disabled={busy || goalTasks.length === 0}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] disabled:opacity-40 transition-colors"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                title="Revisar objetivo"
              >
                <ClipboardCheck size={11} /> Revisar
              </button>
              <button
                onClick={doNext}
                disabled={busy || goalTasks.length === 0}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] disabled:opacity-40 transition-colors"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                title="Executar próxima tarefa"
              >
                <Play size={11} /> Próxima
              </button>
              <button
                onClick={doRun}
                disabled={busy || goalTasks.length === 0}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] disabled:opacity-40 transition-colors"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                title="Executar todas as tarefas"
              >
                <ListChecks size={11} /> Executar tudo
              </button>
              <button
                onClick={load}
                disabled={busy}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                title="Recarregar"
              >
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {loading && tasks.length === 0 ? (
            <div className="py-8 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
          ) : goalTasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Target size={18} style={{ color: "var(--muted-foreground)" }} />
              <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Digite um objetivo e clique em "Planejar" para criar as tarefas.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {goalTasks.map((t) => (
                <div key={t.id} className="px-3 py-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon status={t.status} />
                    <span className="text-[11px] font-medium truncate" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif", textDecoration: t.status === "done" || t.status === "cancelled" ? "line-through" : "none" }}>
                      {t.title}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>P{t.priority}</span>
                    {t.agent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(192,0,24,0.12)", color: "#C00018" }}>{t.agent}</span>
                    )}
                    <span className="ml-auto text-[9px] uppercase tracking-wider" style={{ color: STATUS_COLOR[t.status] || "var(--muted-foreground)" }}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  {t.description && (
                    <div className="text-[10px] mb-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}>{t.description}</div>
                  )}
                  {t.error && (
                    <div className="text-[10px] mb-1.5" style={{ color: "#ef4444", fontFamily: "'Inter', sans-serif" }}>{t.error}</div>
                  )}
                  {t.result && t.status === "done" && (
                    <div className="text-[10px] mb-1.5" style={{ color: "#22c55e", fontFamily: "'Inter', sans-serif" }}>{t.result}</div>
                  )}
                  {t.dependencies.length > 0 && (
                    <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                      depende de: {t.dependencies.join(", ")}
                    </div>
                  )}
                </div>
              ))}
              {done > 0 && (
                <div className="text-center text-[10px] pt-1" style={{ color: "var(--muted-foreground)" }}>{done} tarefa(s) finalizada(s)</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
