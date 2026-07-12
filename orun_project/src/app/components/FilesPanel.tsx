import { useState } from "react";
import { motion } from "motion/react";
import { X, FileText, FileCode, FileImage, File, Folder, ArrowLeft, ChevronRight } from "lucide-react";

interface FileItem {
  name: string;
  type: "file" | "folder";
  size?: string;
  modified?: string;
  children?: FileItem[];
}

const MOCK_FILES: FileItem[] = [
  { name: "orun_project", type: "folder", children: [
    { name: "electron", type: "folder", children: [
      { name: "main.cjs", type: "file", size: "14.2 KB", modified: "2 min ago" },
      { name: "ai-router.cjs", type: "file", size: "8.7 KB", modified: "5 min ago" },
      { name: "db.cjs", type: "file", size: "6.1 KB", modified: "10 min ago" },
      { name: "agent-prompts.cjs", type: "file", size: "5.8 KB", modified: "10 min ago" },
    ]},
    { name: "src", type: "folder", children: [
      { name: "app", type: "folder", children: [
        { name: "HomeScreen.tsx", type: "file", size: "12.4 KB", modified: "15 min ago" },
        { name: "App.tsx", type: "file", size: "2.1 KB", modified: "1 hr ago" },
      ]},
      { name: "components", type: "folder", children: [
        { name: "HamptonAvatar.tsx", type: "file", size: "6.2 KB", modified: "20 min ago" },
        { name: "ChatInput.tsx", type: "file", size: "4.8 KB", modified: "1 hr ago" },
        { name: "AgentDataPanel.tsx", type: "file", size: "8.9 KB", modified: "30 min ago" },
      ]},
    ]},
    { name: "package.json", type: "file", size: "2.4 KB", modified: "1 hr ago" },
  ]},
  { name: "f5tts-server", type: "folder", children: [
    { name: "server.py", type: "file", size: "3.2 KB", modified: "2 hr ago" },
    { name: "start.bat", type: "file", size: "0.1 KB", modified: "2 hr ago" },
  ]},
];

function FileIcon({ item }: { item: FileItem }) {
  if (item.type === "folder") return <Folder size={13} style={{ color: "#C00018" }} />;
  const ext = item.name.split(".").pop();
  if (["tsx", "ts", "js", "cjs", "py"].includes(ext || "")) return <FileCode size={13} style={{ color: "#3498db" }} />;
  if (["png", "jpg", "svg", "ico"].includes(ext || "")) return <FileImage size={13} style={{ color: "#2ecc71" }} />;
  if (["md", "txt", "json"].includes(ext || "")) return <FileText size={13} style={{ color: "#f39c12" }} />;
  return <File size={13} style={{ color: "#666" }} />;
}

export function FilesPanel({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState<FileItem[]>([]);
  const current = path.length > 0 ? path[path.length - 1] : null;
  const items = current?.children || MOCK_FILES;

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
        className="w-[480px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            {path.length > 0 ? (
              <button onClick={() => setPath((p) => p.slice(0, -1))}><ArrowLeft size={15} style={{ color: "#666" }} /></button>
            ) : (
              <FileText size={14} style={{ color: "#C00018" }} />
            )}
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
              {path.length > 0 ? path[path.length - 1].name : "Files"}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>

        {/* Breadcrumb */}
        {path.length > 0 && (
          <div className="px-6 py-2 flex items-center gap-1 text-[9px]" style={{ color: "#555" }}>
            <button onClick={() => setPath([])} style={{ color: "#888" }}>root</button>
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight size={8} />
                <button onClick={() => setPath((prev) => prev.slice(0, i + 1))} style={{ color: i === path.length - 1 ? "#C00018" : "#888" }}>{p.name}</button>
              </span>
            ))}
          </div>
        )}

        <div className="px-6 py-3">
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.name}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
                style={{ background: "#111111", border: "1px solid #1e1e1e" }}
                onClick={() => { if (item.type === "folder") setPath((p) => [...p, item]); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#161616")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#111111")}
              >
                <FileIcon item={item} />
                <span className="text-[11px] flex-1" style={{ color: "#ccc", fontFamily: "'JetBrains Mono', monospace" }}>{item.name}</span>
                {item.size && <span className="text-[9px]" style={{ color: "#444" }}>{item.size}</span>}
                {item.modified && <span className="text-[9px]" style={{ color: "#444" }}>{item.modified}</span>}
                {item.type === "folder" && <ChevronRight size={11} style={{ color: "#444" }} />}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
