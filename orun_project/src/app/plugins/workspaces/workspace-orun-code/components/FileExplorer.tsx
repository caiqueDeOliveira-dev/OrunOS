// plugins/workspaces/workspace-orun-code/components/FileExplorer.tsx
import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, File, FolderOpen, Folder, Plus, RefreshCw } from "lucide-react";
import { useOrunCodeStore } from "../store";
import { getLanguage } from "../types";
import { OC } from "../orun-code";

export function FileExplorer() {
  const files = useOrunCodeStore((s) => s.files);
  const rootIds = useOrunCodeStore((s) => s.rootIds);
  const activeFileId = useOrunCodeStore((s) => s.activeFileId);
  const setState = useOrunCodeStore.setState;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const handler = () => setRefresh((r) => r + 1);
    window.addEventListener("oruncode:refresh-explorer", handler);
    return () => window.removeEventListener("oruncode:refresh-explorer", handler);
  }, []);

  useEffect(() => {
    if (rootIds.length) {
      const init: Record<string, boolean> = {};
      rootIds.forEach((id) => { init[id] = true; });
      setExpanded(init);
    }
  }, [rootIds]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      useOrunCodeStore.setState({ files: { ...useOrunCodeStore.getState().files, [id]: { ...files[id], expanded: next[id] } } });
      return next;
    });
  };

  const openFile = (id: string, name: string, language: string, content: string) => {
    setState((s: any) => ({
      activeFileId: id,
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
    }));
    window.dispatchEvent(new CustomEvent("oruncode:open-file", { detail: { id, name, language, content } }));
  };

  const renderNode = (id: string, depth: number): JSX.Element | null => {
    const node = files[id];
    if (!node) return null;
    const isOpen = expanded[id] ?? node.expanded;
    const isActive = id === activeFileId;

    if (node.type === "folder") {
      return (
        <div key={id}>
          <div
            className="flex items-center gap-1.5 px-2 py-[3px] cursor-pointer select-none rounded-sm hover:bg-white/[0.03]"
            style={{ paddingLeft: 8 + depth * 12, color: OC.sub }}
            onClick={() => toggle(id)}
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isOpen ? <FolderOpen size={13} style={{ color: OC.info }} /> : <Folder size={13} style={{ color: OC.sub }} />}
            <span className="text-[11px] truncate">{node.name}</span>
          </div>
          {isOpen && node.children?.map((cid) => renderNode(cid, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={id}
        className="flex items-center gap-1.5 px-2 py-[3px] cursor-pointer select-none rounded-sm"
        style={{
          paddingLeft: 8 + (depth + 1) * 12,
          color: isActive ? OC.text : OC.sub,
          background: isActive ? "rgba(229,9,20,0.12)" : "transparent",
        }}
        onClick={() => openFile(id, node.name, node.language || getLanguage(node.name), node.content || "")}
      >
        <span className="w-3" />
        <File size={13} style={{ color: isActive ? OC.primary : OC.dim }} />
        <span className="text-[11px] truncate font-mono">{node.name}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: OC.border }}>
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: OC.dim }}>Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setState({ sidebarVisible: true })}
            className="p-1 rounded hover:bg-white/[0.05]"
            title="Novo arquivo"
            style={{ color: OC.sub }}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setRefresh((r) => r + 1)}
            className="p-1 rounded hover:bg-white/[0.05]"
            title="Atualizar"
            style={{ color: OC.sub }}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto oc-scroll py-1">
        {rootIds.length === 0 && (
          <p className="text-[11px] px-3 py-4" style={{ color: OC.dim }}>
            Nenhum arquivo ainda. Pede ao Orun AI para criar algo.
          </p>
        )}
        {rootIds.map((id) => renderNode(id, 0))}
      </div>
    </div>
  );
}
