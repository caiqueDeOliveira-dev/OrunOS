import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, Pencil, Clock, ChevronDown, Sparkles } from "lucide-react";
import { getAgents, isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunProvider, OrunRouterCombo } from "../../types/orun";

const PROVIDER_LABELS: Record<OrunProvider, string> = {
  ollama: "Ollama (Local)", anthropic: "Claude", openai: "OpenAI",
  openrouter: "OpenRouter", groq: "Groq",
  opencodezen: "OpenCode Zen", nvidia: "NVIDIA NIM",
  ollama_cloud: "Ollama Cloud",
};

type Override = { provider: OrunProvider; model: string; systemPrompt?: string } | null
  | { kind: "combo"; comboId: string; source: "internal" | "external"; systemPrompt?: string };
type Schedule = { enabled: boolean; time: string };
type RecommendedModel = { provider: string; model: string };

export function AgentModelsPanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const AGENTS = getAgents(t);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [modelCatalog, setModelCatalog] = useState<Record<string, { id: string; free: boolean }[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [recommendedModels, setRecommendedModels] = useState<Record<string, RecommendedModel>>({});
  const [combos, setCombos] = useState<OrunRouterCombo[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<Record<string, Override>>("agentModels").then((v) => setOverrides(v || {}));
    window.orun.schedules.get().then((s) => setSchedules(s || {}));
    window.orun.ai.modelCatalog().then(setModelCatalog);
    window.orun.settings.agentRecommendedModels().then(setRecommendedModels);
    window.orun.aiRouter?.listCombosMerged?.().then(setCombos).catch(() => setCombos([]));
  }, []);

  const setAgentProvider = (agent: string, value: string) => {
    setOverrides((prev) => {
      if (value === "default") return { ...prev, [agent]: null };
      if (value.startsWith("combo:")) {
        const [, source, ...rest] = value.split(":");
        const comboId = rest.join(":");
        const existing = prev[agent];
        return { ...prev, [agent]: { kind: "combo", comboId, source: source as "internal" | "external", systemPrompt: existing?.systemPrompt } };
      }
      const provider = value as OrunProvider;
      const existing = prev[agent];
      if (existing && "kind" in existing) return { ...prev, [agent]: { provider, model: "", systemPrompt: existing.systemPrompt } };
      // Auto-select recommended model when first picking a provider
      if (!existing?.model && recommendedModels[agent]?.provider === provider) {
        return { ...prev, [agent]: { provider, model: recommendedModels[agent].model, systemPrompt: existing?.systemPrompt } };
      }
      return { ...prev, [agent]: { provider, model: existing?.model || "", systemPrompt: existing?.systemPrompt } };
    });
  };

  const setAgentModel = (agent: string, model: string) => {
    setOverrides((prev) => {
      const cur = prev[agent];
      if (!cur) return prev;
      if ("kind" in cur) return prev; // combo: no model picker
      return { ...prev, [agent]: { ...cur, model } };
    });
  };

  const setAgentPrompt = (agent: string, systemPrompt: string) => {
    setOverrides((prev) => ({ ...prev, [agent]: { ...(prev[agent] || { provider: "ollama", model: "" }), systemPrompt } }));
  };

  const applyComboToAll = () => {
    const combo = combos.find((c) => c.source === "internal") || combos[0];
    if (!combo) return;
    setOverrides((prev) => {
      const next: Record<string, Override> = { ...prev };
      for (const agent of AGENTS) {
        if (!next[agent.name]) next[agent.name] = { kind: "combo", comboId: combo.id, source: combo.source ?? "internal" };
      }
      return next;
    });
  };

  const save = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("agentModels", overrides);
    for (const [agent, sched] of Object.entries(schedules)) await window.orun.schedules.set(agent, sched);
    setSaved(true);
    setTimeout(() => { if (mountedRef.current) setSaved(false); }, 1500);
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
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} style={{ color: "var(--muted-foreground)" }}><ArrowLeft size={15} /></button>
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {t("agentModelsTitle")}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <p className="px-6 pt-4 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {t("agentModelsDescription")}{" "}
          {t("agentModelsSpecialized")}{" "}
          {t("agentModelsDefaultPersona")}
        </p>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2 scrollbar-hide">
          {AGENTS.map((agent) => {
            const override = overrides[agent.name];
            const schedule = schedules[agent.name] || { enabled: false, time: "07:00" };
            const Icon = agent.icon;
            const editing = editingPrompt === agent.name;
            return (
              <div key={agent.name} className="py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2.5">
                  <Icon size={13} style={{ color: agent.special ? "#C00018" : "var(--muted-foreground)", flexShrink: 0 }} />
                  <span className="text-xs w-24 flex-shrink-0 truncate" title={agent.name} style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{agent.persona}</span>
                  <select
                    value={override && "kind" in override ? `combo:${override.source}:${override.comboId}` : (override?.provider || "default")}
                    onChange={(e) => setAgentProvider(agent.name, e.target.value)}
                    className="px-2 py-1.5 rounded-md text-[10px] outline-none"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", width: 128 }}
                  >
                    <option value="default">{t("agentModelsDefault")}</option>
                    <optgroup label="Combos Orun Router">
                      {(combos || []).map((c) => (
                        <option key={`combo:${c.source}:${c.id}`} value={`combo:${c.source}:${c.id}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {c.name || c.id} · {c.source === "internal" ? "Interno" : "Externo"}
                        </option>
                      ))}
                    </optgroup>
                    {(Object.keys(PROVIDER_LABELS) as OrunProvider[]).map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
                  </select>
                  <div className="relative flex-1 min-w-0">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === agent.name ? null : agent.name)}
                      disabled={!override || (override && "kind" in override)}
                      className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded-md text-[10px] text-left outline-none disabled:opacity-40"
                      style={{ background: "var(--secondary)", border: `1px solid ${openDropdown === agent.name ? "#C00018" : "var(--border)"}`, color: (override && "model" in override && override.model) || (override && "kind" in override) ? "#E0E0E0" : "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <span className="truncate">
                        {override && "kind" in override
                          ? (combos.find((c) => c.id === override.comboId && c.source === override.source)?.name || override.comboId)
                          : (override?.model || (
                              recommendedModels[agent.name]
                                ? <>{t("agentModelsDefault")} <span style={{ color: "#2ecc71", fontSize: "8px" }}>(Recomendado: {recommendedModels[agent.name].model})</span></>
                                : t("agentModelsModelName")
                            ))}
                      </span>
                      <ChevronDown size={10} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    </button>
                    {openDropdown === agent.name && override && !("kind" in override) && (
                      <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border scrollbar-hide" style={{ background: "var(--card)", borderColor: "#C00018" }}>
                        {(modelCatalog[override.provider] || []).map((m) => {
                          const isRecommended = recommendedModels[agent.name]?.provider === override.provider && recommendedModels[agent.name]?.model === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => { setAgentModel(agent.name, m.id); setOpenDropdown(null); }}
                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] text-left"
                              style={{ background: override.model === m.id ? "rgba(192,0,24,0.12)" : "transparent", color: override.model === m.id ? "#FF1A2D" : isRecommended ? "#2ecc71" : "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {m.free && <Sparkles size={8} style={{ color: "#2ecc71" }} />}
                              <span className="truncate">{m.id}</span>
                              {isRecommended && <span className="text-[7px] ml-1" style={{ color: "#2ecc71" }}>(Recomendado)</span>}
                              <span className="ml-auto text-[7px]" style={{ color: m.free ? "#2ecc71" : "var(--muted-foreground)" }}>{m.free ? "FREE" : "PAID"}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setEditingPrompt(editing ? null : agent.name)} title={t("agentModelsCustomPersona")} style={{ color: editing ? "#FF1A2D" : "var(--muted-foreground)" }}><Pencil size={13} /></button>
                  <button
                    onClick={() => setSchedules((prev) => ({ ...prev, [agent.name]: { ...schedule, enabled: !schedule.enabled } }))}
                    title={t("agentModelsDailySchedule")}
                    style={{ color: schedule.enabled ? "#FF1A2D" : "var(--muted-foreground)" }}
                  >
                    <Clock size={13} />
                  </button>
                </div>
                {schedule.enabled && (
                  <div className="flex items-center gap-2 mt-1.5 ml-6 pl-3.5">
                    <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("agentModelsSendEveryDayAt")}</span>
                    <input
                      type="time" value={schedule.time}
                      onChange={(e) => setSchedules((prev) => ({ ...prev, [agent.name]: { ...schedule, time: e.target.value } }))}
                      className="px-2 py-1 rounded-md text-[10px] outline-none"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                    />
                  </div>
                )}
                {editing && (
                  <textarea
                    value={override?.systemPrompt || ""}
                    onChange={(e) => setAgentPrompt(agent.name, e.target.value)}
                    placeholder={`${t("agentModelsPersonaPlaceholder")} ${agent.name}...`}
                    rows={2}
                    className="w-full mt-1.5 ml-6 px-2.5 py-1.5 rounded-md text-[10px] outline-none resize-none"
                    style={{ width: "calc(100% - 1.5rem)", background: "var(--card)", border: "1px dashed var(--border)", color: "var(--foreground)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
          <button onClick={applyComboToAll} disabled={!combos.length} className="w-full py-2 rounded-lg text-xs" style={{ background: "transparent", border: "1px solid var(--border)", color: combos.length ? "#FF1A2D" : "var(--muted-foreground)" }}>
            {t("agentModelsApplyComboAll")}
          </button>
          <button onClick={save} className="w-full py-2 rounded-lg text-xs" style={{ background: saved ? "#1a3a1a" : "#C00018", color: "#fff" }}>
            {saved ? t("agentModelsSaved") : t("agentModelsSave")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
