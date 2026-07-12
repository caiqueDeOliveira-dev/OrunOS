import { useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Folder, Clock, Trash2 } from "lucide-react";

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
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

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
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            <Folder size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>Projects</span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
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
                  background: filter === f ? "rgba(192,0,24,0.15)" : "#111111",
                  border: `1px solid ${filter === f ? "#C00018" : "#1e1e1e"}`,
                  color: filter === f ? "#FF1A2D" : "#666",
                }}
              >
                {f}
              </button>
            ))}
            <button className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-wider uppercase" style={{ background: "#C00018", color: "#fff" }}>
              <Plus size={10} /> New
            </button>
          </div>

          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-3 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(192,0,24,0.1)" }}>
                  <Folder size={14} style={{ color: "#C00018" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: "#ccc", fontFamily: "'Sora', sans-serif" }}>{p.name}</div>
                  <div className="text-[9px]" style={{ color: "#555" }}>{p.description}</div>
                </div>
                <div className="text-[9px] flex items-center gap-1" style={{ color: "#444" }}>
                  <Clock size={9} />
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
                <button className="p-1 rounded" style={{ color: "#444" }}>
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
