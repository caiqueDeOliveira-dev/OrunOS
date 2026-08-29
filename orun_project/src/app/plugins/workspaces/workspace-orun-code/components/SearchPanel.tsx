// plugins/workspaces/workspace-orun-code/components/SearchPanel.tsx
import { useState } from "react";
import { Search, CornerDownRight, X } from "lucide-react";
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";

export function SearchPanel() {
  const files = useOrunCodeStore((s) => s.files);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ fileName: string; line: number; content: string; id: string }>>([]);

  const runSearch = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const needle = q.toLowerCase();
    const out: Array<{ fileName: string; line: number; content: string; id: string }> = [];
    for (const [, node] of Object.entries(files) as any) {
      if (node.type === "file" && node.content) {
        node.content.split("\n").forEach((line: string, idx: number) => {
          if (line.toLowerCase().includes(needle)) {
            out.push({ fileName: node.name, line: idx + 1, content: line.trim().slice(0, 120), id: node.id });
          }
        });
      }
    }
    setResults(out.slice(0, 100));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b" style={{ borderColor: OC.border }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: OC.card, border: `1px solid ${OC.borderHi}` }}>
          <Search size={13} style={{ color: OC.dim }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Buscar no projeto..."
            className="w-full bg-transparent outline-none text-[11px]"
            style={{ color: OC.text }}
          />
          {query && (
            <button onClick={() => runSearch("")} style={{ color: OC.dim }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto oc-scroll py-1">
        {results.length === 0 && query && (
          <p className="text-[11px] px-3 py-4" style={{ color: OC.dim }}>Nenhum resultado para "{query}".</p>
        )}
        {results.length === 0 && !query && (
          <p className="text-[11px] px-3 py-4" style={{ color: OC.dim }}>Digite para buscar arquivos, símbolos e texto.</p>
        )}
        {results.map((r, i) => (
          <div key={i} className="px-3 py-2 border-b hover:bg-white/[0.02] cursor-pointer" style={{ borderColor: `${OC.border}66` }}>
            <div className="flex items-center gap-1.5">
              <CornerDownRight size={10} style={{ color: OC.info }} />
              <span className="text-[10px] font-mono font-semibold truncate" style={{ color: OC.text }}>{r.fileName}</span>
              <span className="text-[9px]" style={{ color: OC.dim }}>:{r.line}</span>
            </div>
            <p className="text-[10px] mt-0.5 font-mono truncate" style={{ color: OC.sub }}>{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
