import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Puzzle, Download, Trash2, FolderOpen, RefreshCw, AlertTriangle, CheckCircle2, Power } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

interface SkillEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  status: "ok" | "invalid";
  errors: string[];
  warnings: string[];
  permissions: string[];
}

const skillsApi = (window as unknown as { orun?: { skills?: {
  list: () => Promise<SkillEntry[]>;
  setEnabled: (id: string, enabled: boolean) => Promise<{ ok: boolean; error?: string }>;
  uninstall: (id: string, force?: boolean) => Promise<{ ok: boolean; error?: string }>;
  installDialog: () => Promise<{ ok: boolean; canceled?: boolean; error?: string }>;
  reload: () => Promise<{ ok: boolean }>;
  openDir: () => Promise<{ ok: boolean; dir?: string; error?: string }>;
} } }).orun?.skills;

export function SkillsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!skillsApi?.list) return;
    setLoading(true);
    try {
      setSkills(await skillsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (skill: SkillEntry) => {
    if (!skillsApi?.setEnabled) return;
    await skillsApi.setEnabled(skill.id, !skill.enabled);
    await load();
  };

  const uninstall = async (skill: SkillEntry) => {
    if (!skillsApi?.uninstall) return;
    await skillsApi.uninstall(skill.id);
    await load();
  };

  const install = async () => {
    if (!skillsApi?.installDialog) return;
    await skillsApi.installDialog();
    await load();
  };

  const reload = async () => {
    if (!skillsApi?.reload) return;
    await skillsApi.reload();
    await load();
  };

  const openDir = async () => {
    if (!skillsApi?.openDir) return;
    await skillsApi.openDir();
  };

  const enabledCount = skills.filter((s) => s.enabled).length;

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
        className="w-[580px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Puzzle size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Skills</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{enabledCount}/{skills.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openDir} title="Abrir pasta" style={{ color: "var(--muted-foreground)" }}><FolderOpen size={13} /></button>
            <button onClick={install} title="Instalar skill" style={{ color: "var(--muted-foreground)" }}><Download size={13} /></button>
            <button onClick={reload} title="Recarregar" style={{ color: "var(--muted-foreground)" }}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
          </div>
        </div>

        <div className="px-6 py-4">
          {loading && skills.length === 0 ? (
            <div className="py-8 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Puzzle size={18} style={{ color: "var(--muted-foreground)" }} />
              <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Nenhuma skill instalada</span>
            </div>
          ) : (
            <div className="space-y-2">
              {skills.map((s) => (
                <div key={s.id} className="px-3 py-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    {s.status === "ok" && s.enabled ? (
                      <CheckCircle2 size={11} style={{ color: "#22c55e" }} />
                    ) : s.status === "ok" ? (
                      <Power size={11} style={{ color: "var(--muted-foreground)" }} />
                    ) : (
                      <AlertTriangle size={11} style={{ color: "#f59e0b" }} />
                    )}
                    <span className="text-[11px] font-medium truncate" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{s.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>v{s.version}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => uninstall(s)} title="Desinstalar" style={{ color: "var(--muted-foreground)" }} className="hover:opacity-70"><Trash2 size={11} /></button>
                      <button
                        onClick={() => toggle(s)}
                        title={s.enabled ? "Desativar" : "Ativar"}
                        className="relative w-8 h-4 rounded-full transition-colors"
                        style={{ background: s.enabled ? "rgba(192,0,24,0.8)" : "var(--border)" }}
                      >
                        <span
                          className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                          style={{ left: s.enabled ? "18px" : "2px", background: "#fff" }}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] mb-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}>
                    {s.description || s.id}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.permissions.slice(0, 4).map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>{p}</span>
                    ))}
                    {s.errors.map((e) => (
                      <span key={e} className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{e}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
