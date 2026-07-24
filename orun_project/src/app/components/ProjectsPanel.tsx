import { useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Folder, Clock, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: number;
  status: "active" | "archived";
}

const MOCK_PROJECTS: Project[] = [
  { id: "1", name: "Orun OS", description: "Personal AI operating system", created_at: Date.now() - 86400000 * 30, status: "active" },
  { id: "2", name: "F5-TTS Server", description: "Local text-to-speech server", created_at: Date.now() - 86400000 * 15, status: "active" },
  { id: "3", name: "Portfolio Website", description: "Personal portfolio redesign", created_at: Date.now() - 86400000 * 60, status: "archived" },
];

export function ProjectsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const createProject = () => {
    if (!newName.trim()) return;
    const proj: Project = {
      id: `proj_${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || t("projectsNewProject"),
      created_at: Date.now(),
      status: "active",
    };
    setProjects(prev => [proj, ...prev]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
  };

  const deleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== id));
  };

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
        className="w-[520px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Folder size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("projects_title")}</span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            {(["all", "active", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-full text-[10px] tracking-wider uppercase transition-colors"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  background: filter === f ? "rgba(192,0,24,0.15)" : "var(--secondary)",
                  border: `1px solid ${filter === f ? "#C00018" : "var(--border)"}`,
                  color: filter === f ? "#FF1A2D" : "var(--muted-foreground)",
                }}
              >
                {f === "all" ? t("projects_filter_all") : f === "active" ? t("projects_filter_active") : t("projects_filter_archived")}
              </button>
            ))}
            <button onClick={() => setCreating(p => !p)} className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-wider uppercase transition-colors" style={{ background: "#C00018", color: "#fff" }}>
              <Plus size={10} /> {t("projects_new_button")}
            </button>
          </div>

          {creating && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createProject()}
                placeholder={t("projects_name_placeholder")}
                className="w-full bg-transparent text-xs outline-none mb-2"
                style={{ color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
              />
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createProject()}
                placeholder={t("projects_description_placeholder")}
                className="w-full bg-transparent text-[10px] outline-none mb-2"
                style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
              />
              <div className="flex gap-2">
                <button onClick={createProject} className="px-3 py-1 rounded text-[10px]" style={{ background: "#C00018", color: "#fff" }}>{t("projects_create_button")}</button>
                <button onClick={() => setCreating(false)} className="px-3 py-1 rounded text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("projects_cancel_button")}</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(192,0,24,0.1)" }}>
                  <Folder size={14} style={{ color: "#C00018" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{p.name}</div>
                  <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{p.description}</div>
                </div>
                <div className="text-[9px] flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                  <Clock size={9} />
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
                <button onClick={(e) => deleteProject(e, p.id)} className="p-1 rounded transition-colors hover:bg-red-900/30" style={{ color: "var(--muted-foreground)" }} aria-label={t("ariaDeleteProject")}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
