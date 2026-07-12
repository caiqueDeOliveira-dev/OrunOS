import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowLeft, Cloud, Cpu, Check, Loader2, RefreshCw } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunProvider } from "../../types/orun";

const PROVIDER_INFO: Record<OrunProvider, { label: string; kind: "local" | "cloud" }> = {
  ollama: { label: "Ollama", kind: "local" },
  anthropic: { label: "Claude", kind: "cloud" },
  openai: { label: "OpenAI", kind: "cloud" },
  openrouter: { label: "OpenRouter", kind: "cloud" },
  groq: { label: "Groq", kind: "cloud" },
  github: { label: "GitHub Models", kind: "cloud" },
  opencodezen: { label: "OpenCode Zen", kind: "cloud" },
};

export function ModelPicker({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<OrunProvider | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ provider: OrunProvider; model: string } | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ provider: OrunProvider; model: string }>("ai").then((v) => { if (v) setSelected(v); });
  }, []);

  const openProvider = async (p: OrunProvider) => {
    setProvider(p);
    setModels([]);
    if (!isElectron) return;
    setLoading(true);
    if (p === "ollama") {
      const cfg = await window.orun.settings.get<{ baseUrl?: string }>("ai");
      setModels(await window.orun.ai.listOllamaModels(cfg?.baseUrl));
    } else {
      const free = await window.orun.ai.knownFreeModels();
      const cloudList = await window.orun.ai.listCloudModels(p);
      const combined = Array.from(new Set([...(free[p] || []), ...cloudList]));
      setModels(combined);
    }
    setLoading(false);
  };

  const refresh = () => provider && openProvider(provider);

  const selectModel = async (model: string) => {
    if (!provider) return;
    setSelected({ provider, model });
    if (isElectron) {
      const current = (await window.orun.settings.get<Record<string, unknown>>("ai")) || {};
      await window.orun.settings.set("ai", { ...current, provider, model });
    }
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[440px] max-h-[80vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            {provider && <button onClick={() => setProvider(null)} style={{ color: "#666" }}><ArrowLeft size={15} /></button>}
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
              {provider ? PROVIDER_INFO[provider].label : "/model"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {provider && <button onClick={refresh} style={{ color: "#666" }}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>}
            <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!provider ? (
            <motion.div key="providers" className="p-4 overflow-y-auto scrollbar-hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[10px] px-2 mb-3" style={{ color: "#555" }}>{t("modelPickerHint")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PROVIDER_INFO) as OrunProvider[]).map((p) => {
                  const info = PROVIDER_INFO[p];
                  const isActive = selected?.provider === p;
                  return (
                    <button
                      key={p}
                      onDoubleClick={() => openProvider(p)}
                      className="flex items-center gap-1.5 p-3 rounded-xl border text-left"
                      style={{ borderColor: isActive ? "#C00018" : "#1e1e1e", background: isActive ? "rgba(192,0,24,0.08)" : "#111111", color: isActive ? "#FF1A2D" : "#888" }}
                    >
                      {info.kind === "cloud" ? <Cloud size={13} /> : <Cpu size={13} />}
                      <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif" }}>{info.label}</span>
                      {isActive && <Check size={12} className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="models" className="flex-1 overflow-y-auto p-4 scrollbar-hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading && <p className="text-[11px] text-center py-4" style={{ color: "#555" }}><Loader2 size={14} className="animate-spin inline mr-1.5" />{t("modelPickerLoading")}</p>}
              {!loading && models.length === 0 && <p className="text-[10px]" style={{ color: "#555" }}>{t("modelPickerNotFound")}</p>}
              <div className="space-y-1.5">
                {models.map((model) => {
                  const isSelected = selected?.provider === provider && selected.model === model;
                  return (
                    <button
                      key={model}
                      onClick={() => selectModel(model)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left"
                      style={{ background: isSelected ? "rgba(192,0,24,0.08)" : "#111111", border: `1px solid ${isSelected ? "#C00018" : "#1e1e1e"}` }}
                    >
                      <span className="text-xs flex-1 truncate" style={{ fontFamily: "'JetBrains Mono', monospace", color: isSelected ? "#F5F5F5" : "#ccc" }}>{model}</span>
                      {isSelected && <Check size={13} style={{ color: "#FF1A2D" }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
