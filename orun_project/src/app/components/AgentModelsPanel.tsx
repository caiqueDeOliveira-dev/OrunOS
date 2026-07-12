import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, Pencil, Clock } from "lucide-react";
import { AGENTS, isElectron } from "../constants";
import type { OrunProvider } from "../../types/orun";

const PROVIDER_LABELS: Record<OrunProvider, string> = {
  ollama: "Ollama (Local)", anthropic: "Claude", openai: "OpenAI",
  openrouter: "OpenRouter", groq: "Groq", github: "GitHub Models",
  opencodezen: "OpenCode Zen",
};

type Override = { provider: OrunProvider; model: string; systemPrompt?: string } | null;
type Schedule = { enabled: boolean; time: string };

export function AgentModelsPanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<Record<string, Override>>("agentModels").then((v) => setOverrides(v || {}));
    window.orun.schedules.get().then((s) => setSchedules(s || {}));
  }, []);

  const setAgentProvider = (agent: string, provider: OrunProvider | "default") => {
    setOverrides((prev) => {
      if (provider === "default") return { ...prev, [agent]: null };
      const existing = prev[agent];
      return { ...prev, [agent]: { provider, model: existing?.model || "", systemPrompt: existing?.systemPrompt } };
    });
  };

  const setAgentModel = (agent: string, model: string) => {
    setOverrides((prev) => (prev[agent] ? { ...prev, [agent]: { ...prev[agent]!, model } } : prev));
  };

  const setAgentPrompt = (agent: string, systemPrompt: string) => {
    setOverrides((prev) => ({ ...prev, [agent]: { ...(prev[agent] || { provider: "ollama", model: "" }), systemPrompt } }));
  };

  const save = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("agentModels", overrides);
    for (const [agent, sched] of Object.entries(schedules)) await window.orun.schedules.set(agent, sched);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[560px] max-h-[85vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} style={{ color: "#666" }}><ArrowLeft size={15} /></button>
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
              Agentes
            </span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>

        <p className="px-6 pt-4 text-[10px]" style={{ color: "#555" }}>
          Modelo + persona por agente, além de uma agenda diária opcional (ex: Personal Trainer toda manhã).
          Apenas Nutritionist e Personal Trainer têm comportamento especializado real agora — os demais usam sua
          persona padrão até receberem lógica real também.
        </p>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2 scrollbar-hide">
          {AGENTS.map((agent) => {
            const override = overrides[agent.name];
            const schedule = schedules[agent.name] || { enabled: false, time: "07:00" };
            const Icon = agent.icon;
            const editing = editingPrompt === agent.name;
            return (
              <div key={agent.name} className="py-2 border-b" style={{ borderColor: "#151515" }}>
                <div className="flex items-center gap-2.5">
                  <Icon size={13} style={{ color: agent.special ? "#C00018" : "#555", flexShrink: 0 }} />
                  <span className="text-xs w-24 flex-shrink-0 truncate" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>{agent.name}</span>
                  <select
                    value={override?.provider || "default"}
                    onChange={(e) => setAgentProvider(agent.name, e.target.value as OrunProvider | "default")}
                    className="px-2 py-1.5 rounded-md text-[10px] outline-none"
                    style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa", width: 108 }}
                  >
                    <option value="default">Padrão</option>
                    {(Object.keys(PROVIDER_LABELS) as OrunProvider[]).map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
                  </select>
                  <input
                    value={override?.model || ""} onChange={(e) => setAgentModel(agent.name, e.target.value)} disabled={!override}
                    placeholder={override ? "nome do modelo" : "—"}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-md text-[10px] outline-none disabled:opacity-30"
                    style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa", fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  <button onClick={() => setEditingPrompt(editing ? null : agent.name)} title="Persona personalizada" style={{ color: editing ? "#FF1A2D" : "#555" }}><Pencil size={13} /></button>
                  <button
                    onClick={() => setSchedules((prev) => ({ ...prev, [agent.name]: { ...schedule, enabled: !schedule.enabled } }))}
                    title="Agenda diária"
                    style={{ color: schedule.enabled ? "#FF1A2D" : "#555" }}
                  >
                    <Clock size={13} />
                  </button>
                </div>
                {schedule.enabled && (
                  <div className="flex items-center gap-2 mt-1.5 ml-6 pl-3.5">
                    <span className="text-[9px]" style={{ color: "#555" }}>Enviar todo dia às</span>
                    <input
                      type="time" value={schedule.time}
                      onChange={(e) => setSchedules((prev) => ({ ...prev, [agent.name]: { ...schedule, time: e.target.value } }))}
                      className="px-2 py-1 rounded-md text-[10px] outline-none"
                      style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa" }}
                    />
                  </div>
                )}
                {editing && (
                  <textarea
                    value={override?.systemPrompt || ""}
                    onChange={(e) => setAgentPrompt(agent.name, e.target.value)}
                    placeholder={`Persona personalizada para ${agent.name} (deixe em branco para usar o padrão)`}
                    rows={2}
                    className="w-full mt-1.5 ml-6 px-2.5 py-1.5 rounded-md text-[10px] outline-none resize-none"
                    style={{ width: "calc(100% - 1.5rem)", background: "#0f0f0f", border: "1px dashed #232323", color: "#ccc" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t" style={{ borderColor: "#1a1a1a" }}>
          <button onClick={save} className="w-full py-2 rounded-lg text-xs" style={{ background: saved ? "#1a3a1a" : "#C00018", color: "#fff" }}>
            {saved ? "Salvo ✓" : "Salvar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
