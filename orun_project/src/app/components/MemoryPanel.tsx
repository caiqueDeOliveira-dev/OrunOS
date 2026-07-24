import { useState } from "react";
import { motion } from "motion/react";
import { X, Brain, Tag, Search, Plus, Clock, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: number;
}

const MOCK_MEMORIES: MemoryEntry[] = [
  { id: "1", title: "Orun OS Design Tokens", content: "Background: #080808, Accent: #C00018, Font: Inter + Sora + JetBrains Mono + Cinzel + Cormorant Garamond", tags: ["design", "tokens"], created_at: Date.now() - 86400000 * 5 },
  { id: "2", title: "AI Provider Keys", content: "OpenCode Zen: configured, Groq: configured, Ollama: localhost:11434", tags: ["config", "ai"], created_at: Date.now() - 86400000 * 2 },
  { id: "3", title: "WhatsApp Setup Notes", content: "Uses Baileys (unofficial). QR scan required. Listen JID must be set to 'Message Yourself' chat.", tags: ["whatsapp", "setup"], created_at: Date.now() - 86400000 * 10 },
  { id: "4", title: "F5-TTS Server", content: "Run start.bat to launch. Uses f5_tts.api with F5TTS_v1_Base model. Port 8080.", tags: ["tts", "local"], created_at: Date.now() - 86400000 * 1 },
];

export function MemoryPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [memories] = useState<MemoryEntry[]>(MOCK_MEMORIES);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = [...new Set(memories.flatMap((m) => m.tags))];

  const filtered = memories.filter((m) => {
    const matchesSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => m.tags.includes(t));
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
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
        className="w-[500px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Brain size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("memory_title")}</span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <div className="px-6 py-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("memory_search_placeholder")}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[11px] outline-none"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] tracking-wider uppercase transition-colors"
                style={{
                  background: selectedTags.includes(tag) ? "rgba(192,0,24,0.15)" : "var(--secondary)",
                  border: `1px solid ${selectedTags.includes(tag) ? "#C00018" : "var(--border)"}`,
                  color: selectedTags.includes(tag) ? "#FF1A2D" : "var(--muted-foreground)",
                }}
              >
                <Tag size={8} /> {tag}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((m) => (
              <div key={m.id} className="px-3 py-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{m.title}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Clock size={9} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-[10px] mb-1.5" style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}>{m.content}</div>
                <div className="flex gap-1">
                  {m.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
