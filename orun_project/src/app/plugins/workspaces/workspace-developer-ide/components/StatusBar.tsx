import { useIDEStore } from "../developer-store";
import { formatBytes, getLanguage } from "../developer-types";
import { Files, GitBranch, AlertTriangle, Shield } from "lucide-react";

export function StatusBar() {
  const files = useIDEStore((s) => s.files);
  const activeFileId = useIDEStore((s) => s.activeFileId);
  const activeFile = activeFileId ? files[activeFileId] : null;
  const gitStatus = useIDEStore((s) => s.gitStatus);
  const sidebarVisible = useIDEStore((s) => s.sidebarVisible);
  const showMinimap = useIDEStore((s) => s.showMinimap);
  const cursorLine = useIDEStore((s) => s.cursorLine);
  const cursorCol = useIDEStore((s) => s.cursorCol);

  const lineCount = activeFile?.content ? activeFile.content.split("\n").length : 0;
  const byteCount = activeFile?.content ? new Blob([activeFile.content]).size : 0;
  const lang = activeFile?.language || getLanguage(activeFile?.name || "") || "Plain Text";
  const branch = gitStatus?.branch || "main";

  return (
    <div className="flex items-center justify-between px-3 py-[3px] border-t text-[10px] shrink-0 select-none"
      style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--muted-foreground)" }}>
      <div className="flex items-center gap-3">
        <button onClick={() => useIDEStore.setState({ sidebarVisible: !sidebarVisible })}
          className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors">
          <Files size={10} />
          <span>{sidebarVisible ? "Hide" : "Show"} Sidebar</span>
        </button>
        <span className="flex items-center gap-1">
          <GitBranch size={10} />
          <span>{branch}</span>
        </span>
        {activeFile && (
          <span className="flex items-center gap-1">
            <AlertTriangle size={10} style={{ color: "#F59E0B" }} />
            <span>0 problems</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => useIDEStore.setState({ showMinimap: !showMinimap })}
          className="hover:text-[var(--foreground)] transition-colors">
          {showMinimap ? "Minimap" : ""}
        </button>
        <span className="hover:text-[var(--foreground)] transition-colors cursor-default">
          {lang}
        </span>
        {activeFile && (
          <>
            <span className="hover:text-[var(--foreground)] transition-colors cursor-default">
              Ln {cursorLine}, Col {cursorCol}
            </span>
            <span className="hover:text-[var(--foreground)] transition-colors cursor-default">
              {lineCount} lines ({formatBytes(byteCount)})
            </span>
          </>
        )}
        <span className="flex items-center gap-1" style={{ color: "#22C55E" }}>
          <Shield size={10} />
          <span>Secured</span>
        </span>
      </div>
    </div>
  );
}
