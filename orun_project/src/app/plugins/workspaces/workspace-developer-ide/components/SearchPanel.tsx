import { useCallback } from "react";
import { useIDEStore } from "../developer-store";
import type { SearchMatch } from "../developer-types";

export function SearchPanel() {
  const searchQuery = useIDEStore((s) => s.searchQuery);
  const searchResults = useIDEStore((s) => s.searchResults);

  const handleSearch = useCallback((query: string) => {
    useIDEStore.setState({ searchQuery: query });
    if (!query.trim()) { useIDEStore.setState({ searchResults: [] }); return; }
    const state = useIDEStore.getState();
    const results: SearchMatch[] = [];
    const q = query.toLowerCase();
    for (const [id, node] of Object.entries(state.files)) {
      if (node.type === "file" && node.content) {
        const lines = node.content.split("\n");
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(q)) {
            results.push({ fileId: id, fileName: node.name, line: idx + 1, content: line.trim() });
          }
        });
      }
    }
    useIDEStore.setState({ searchResults: results.slice(0, 200) });
  }, []);

  const openResult = useCallback((fileId: string) => {
    useIDEStore.setState((s) => ({
      activeFileId: fileId,
      openTabs: s.openTabs.includes(fileId) ? s.openTabs : [...s.openTabs, fileId],
      activeSidebarTab: "explorer",
    }));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: "#252525" }}>
        <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#A0A0A0" }}>
          Search
        </span>
        <input
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "#0A0A0C", border: "1px solid #252525", color: "#FFFFFF" }}
          placeholder="Search files..."
        />
      </div>
      <div className="flex-1 overflow-y-auto hs-scroll py-1">
        {searchResults.length === 0 && searchQuery && (
          <p className="text-[10px] text-center py-8" style={{ color: "#A0A0A0" }}>No results found</p>
        )}
        {searchResults.slice(0, 100).map((r, i) => (
          <button key={i} onClick={() => openResult(r.fileId)}
            className="w-full text-left px-3 py-1.5 hover:bg-white/[0.03] transition-colors">
            <p className="text-[10px] font-medium truncate" style={{ color: "#FFFFFF" }}>{r.fileName}</p>
            <p className="text-[9px]" style={{ color: "#A0A0A0" }}>
              <span style={{ color: "#C3002F" }}>Ln {r.line}</span>: {r.content.slice(0, 80)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
