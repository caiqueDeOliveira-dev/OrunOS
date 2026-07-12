import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowLeft, Cloud, Cpu, Play, Loader2, Check } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunTTSEngine, OrunVoice } from "../../types/orun";

const ENGINE_INFO: Record<OrunTTSEngine, { label: string; kind: "cloud" | "local"; needsKey: boolean; needsRegion?: boolean; needsBaseUrl?: boolean; note?: string }> = {
  elevenlabs: { label: "ElevenLabs", kind: "cloud", needsKey: true },
  google: { label: "Google Cloud TTS", kind: "cloud", needsKey: true },
  azure: { label: "Azure Cognitive Services", kind: "cloud", needsKey: true, needsRegion: true },
  xtts: { label: "XTTS v2", kind: "local", needsKey: false, needsBaseUrl: true, note: "Needs xtts-api-server running locally" },
  piper: { label: "Piper", kind: "local", needsKey: false, needsBaseUrl: true, note: "No voice list — server picks the model" },
  bark: { label: "Bark", kind: "local", needsKey: false, needsBaseUrl: true, note: "Fixed preset voices, needs a local Bark server" },
  f5tts: { label: "F5-TTS", kind: "local", needsKey: false, needsBaseUrl: true, note: "Reference-audio cloning, not named voices" },
};

export function VoicesPicker({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [engine, setEngine] = useState<OrunTTSEngine | null>(null);
  const [voices, setVoices] = useState<OrunVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ engine: OrunTTSEngine; voiceId: string } | null>(null);

  // Config fields for the currently-open engine
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [region, setRegion] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ engine: OrunTTSEngine; voiceId: string }>("tts").then((v) => { if (v) setSelected(v); });
  }, []);

  const openEngine = async (eng: OrunTTSEngine) => {
    setEngine(eng);
    setVoices([]);
    setVoicesError("");
    if (!isElectron) return;
    const cfg = await window.orun.tts.getEngineConfig(eng);
    setRegion((cfg as any).region || "");
    setBaseUrl((cfg as any).baseUrl || "");
    setHasKey(await window.orun.settings.hasApiKey(`tts-${eng}`));
    await loadVoices(eng);
  };

  const loadVoices = async (eng: OrunTTSEngine) => {
    if (!isElectron) return;
    setLoadingVoices(true);
    setVoicesError("");
    try {
      setVoices(await window.orun.tts.listVoices(eng));
    } catch (err: any) {
      setVoicesError(err?.message || t("voicesLoadError"));
    }
    setLoadingVoices(false);
  };

  const saveEngineConfig = async () => {
    if (!isElectron || !engine) return;
    await window.orun.tts.setEngineConfig(engine, { region, baseUrl });
    if (apiKey.trim()) { await window.orun.settings.setApiKey(`tts-${engine}`, apiKey.trim()); setApiKey(""); setHasKey(true); }
    await loadVoices(engine);
  };

  const previewVoice = async (voice: OrunVoice) => {
    if (playingId) return;
    setPlayingId(voice.id);
    try {
      if (voice.previewUrl) {
        const audio = new Audio(voice.previewUrl);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => setPlayingId(null);
        await audio.play();
        return;
      }
      if (!isElectron || !engine) { setPlayingId(null); return; }
      const { audioBase64, mime } = await window.orun.tts.synthesize(engine, voice.id, t("voicesPreview"));
      const audio = new Audio(`data:${mime};base64,${audioBase64}`);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  };

  const selectVoice = async (voice: OrunVoice) => {
    if (!engine) return;
    setSelected({ engine, voiceId: voice.id });
    if (isElectron) await window.orun.settings.set("tts", { engine, voiceId: voice.id, enabled: true });
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
        className="w-[460px] max-h-[80vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            {engine && <button onClick={() => setEngine(null)} style={{ color: "#666" }}><ArrowLeft size={15} /></button>}
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
              {engine ? ENGINE_INFO[engine].label : t("voicesHeader")}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>

        <AnimatePresence mode="wait">
          {!engine ? (
            <motion.div key="engines" className="p-4 overflow-y-auto scrollbar-hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[10px] px-2 mb-3" style={{ color: "#555" }}>
                {t("voicesHint")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ENGINE_INFO) as OrunTTSEngine[]).map((eng) => {
                  const info = ENGINE_INFO[eng];
                  const isActive = selected?.engine === eng;
                  return (
                    <button
                      key={eng}
                      onDoubleClick={() => openEngine(eng)}
                      className="flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left"
                      style={{ borderColor: isActive ? "#C00018" : "#1e1e1e", background: isActive ? "rgba(192,0,24,0.08)" : "#111111" }}
                    >
                      <div className="flex items-center gap-1.5" style={{ color: isActive ? "#FF1A2D" : "#888" }}>
                        {info.kind === "cloud" ? <Cloud size={13} /> : <Cpu size={13} />}
                        <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif" }}>{info.label}</span>
                        {isActive && <Check size={12} />}
                      </div>
                      {info.note && <span className="text-[9px]" style={{ color: "#444" }}>{info.note}</span>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="voices" className="flex-1 overflow-y-auto p-4 scrollbar-hide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Engine config */}
              <div className="mb-4 space-y-2">
                {ENGINE_INFO[engine].needsKey && (
                  <input
                    type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasKey ? t("voicesApiKeySaved") : "API key"}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
                  />
                )}
                {ENGINE_INFO[engine].needsRegion && (
                  <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t("voicesAzureRegion")} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }} />
                )}
                {ENGINE_INFO[engine].needsBaseUrl && (
                  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={t("voicesLocalUrl")} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }} />
                )}
                {engine === "f5tts" && (
                  <p className="text-[9px] px-1" style={{ color: "#555" }}>
                    Default server: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>http://localhost:8080</span> — Run <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>start.bat</span> in the <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>f5tts-server/</span> directory to launch.
                  </p>
                )}
                <button onClick={saveEngineConfig} className="w-full py-1.5 rounded-lg text-[10px]" style={{ background: "#151515", border: "1px solid #232323", color: "#888" }}>
                  {t("voicesSaveRefresh")}
                </button>
              </div>

              {loadingVoices && <p className="text-[11px] text-center py-4" style={{ color: "#555" }}><Loader2 size={14} className="animate-spin inline mr-1.5" />{t("voicesLoading")}</p>}
              {voicesError && <p className="text-[10px] mb-2" style={{ color: "#C00018" }}>{voicesError}</p>}
              {!loadingVoices && !voicesError && voices.length === 0 && (
                <p className="text-[10px]" style={{ color: "#555" }}>
                  {engine === "piper" ? t("voicesPiperNote") : t("voicesNotFound")}
                </p>
              )}

              <div className="space-y-1.5">
                {voices.map((voice) => {
                  const isSelected = selected?.engine === engine && selected.voiceId === voice.id;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => previewVoice(voice)}
                      onDoubleClick={() => selectVoice(voice)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{ background: isSelected ? "rgba(192,0,24,0.08)" : "#111111", border: `1px solid ${isSelected ? "#C00018" : "#1e1e1e"}` }}
                    >
                      {playingId === voice.id ? <Loader2 size={13} className="animate-spin" style={{ color: "#FF1A2D" }} /> : <Play size={13} style={{ color: isSelected ? "#FF1A2D" : "#555" }} />}
                      <span className="text-xs flex-1 truncate" style={{ fontFamily: "'Sora', sans-serif", color: isSelected ? "#F5F5F5" : "#ccc" }}>{voice.name}</span>
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
