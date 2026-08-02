import { useState, useCallback, useRef, useEffect } from "react";
import { useIDEStore } from "../developer-store";
import { highlightSyntax } from "../developer-types";
import { FileIcon } from "./FileIcon";
import { Code2, Edit3, CheckCircle, X } from "lucide-react";

export function CodeEditor() {
  const files = useIDEStore((s) => s.files);
  const activeFileId = useIDEStore((s) => s.activeFileId);
  const openTabs = useIDEStore((s) => s.openTabs);
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const closeTab = useCallback((id: string) => {
    useIDEStore.setState((s) => {
      const newTabs = s.openTabs.filter((t) => t !== id);
      return {
        openTabs: newTabs,
        activeFileId: s.activeFileId === id ? (newTabs[0] || null) : s.activeFileId,
      };
    });
  }, []);

  const activeFile = activeFileId ? files[activeFileId] : null;
  const isEditing = editingFile === activeFileId;
  const displayContent = isEditing && editingContent[activeFileId || ""] !== undefined
    ? editingContent[activeFileId || ""]
    : activeFile?.content || "";
  const lines = displayContent.split("\n");

  const startEditing = useCallback(() => {
    if (activeFileId) {
      setEditingContent((prev) => ({ ...prev, [activeFileId]: files[activeFileId]?.content || "" }));
      setEditingFile(activeFileId);
    }
  }, [activeFileId, files]);

  const saveContent = useCallback(() => {
    if (editingFile && editingContent[editingFile] !== undefined) {
      const newContent = editingContent[editingFile];
      useIDEStore.setState((s) => ({
        files: { ...s.files, [editingFile]: { ...s.files[editingFile], content: newContent } },
      }));
      try {
        window.dispatchEvent(new CustomEvent("developer:file-edited", { detail: { fileId: editingFile, content: newContent } }));
      } catch {}
      setEditingFile(null);
    }
  }, [editingFile, editingContent, files]);

  const handleContentChange = useCallback((newContent: string) => {
    if (activeFileId) {
      setEditingContent((prev) => ({ ...prev, [activeFileId]: newContent }));
    }
  }, [activeFileId]);

  useEffect(() => {
    if (activeFileId && editingFile !== activeFileId) {
      setEditingContent((prev) => {
        if (prev[activeFileId] === undefined && activeFile) {
          return { ...prev, [activeFileId]: activeFile.content || "" };
        }
        return prev;
      });
    }
  }, [activeFileId, activeFile, editingFile]);

  const trackCursor = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      const text = sel.anchorNode?.textContent || "";
      const before = text.slice(0, sel.anchorOffset);
      const col = before.length + 1;
      let line = 0;
      if (sel.anchorNode && editorRef.current) {
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.previousSibling) {
            node = node.previousSibling;
            let s: Node | null = node;
            while (s) {
              if (s.textContent) {
                line += s.textContent.split("\n").length - 1;
              }
              s = s.previousSibling;
            }
          } else {
            node = node.parentNode;
          }
        }
        const allText = editorRef.current.textContent || "";
        const upToCursor = allText.slice(0, sel.anchorOffset + (() => {
          let pos = 0;
          let n: Node | null = sel.anchorNode;
          while (n && n !== editorRef.current) {
            let sib: Node | null = n.previousSibling;
            while (sib) {
              pos += (sib.textContent || "").length;
              sib = sib.previousSibling;
            }
            n = n.parentNode;
          }
          return pos;
        })());
        line = upToCursor.split("\n").length;
      }
      useIDEStore.setState({ cursorLine: Math.max(1, line), cursorCol: Math.max(1, col) });
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveContent();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "p") {
      e.preventDefault();
      useIDEStore.setState({ activeSidebarTab: "search" });
    }
    if (e.key === "Escape" && editingFile) {
      setEditingFile(null);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      useIDEStore.setState({ isCreatingFile: true, creatingInFolder: "root", creatingIsFolder: false, newFileName: "" });
    }
  }, [saveContent, editingFile]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b overflow-x-auto scrollbar-hide shrink-0" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center flex-1 overflow-x-auto scrollbar-hide">
          {openTabs.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Code2 size={12} style={{ color: "var(--muted-foreground)" }} />
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>No files open</span>
            </div>
          )}
          {openTabs.map((tabId) => {
            const f = files[tabId];
            if (!f) return null;
            const isActive = tabId === activeFileId;
            return (
              <div
                key={tabId}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] cursor-pointer border-r shrink-0 group transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: isActive ? "var(--background)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  borderBottom: isActive ? "2px solid #C00018" : "2px solid transparent",
                }}
                onClick={() => useIDEStore.setState({ activeFileId: tabId })}
              >
                <span className="text-[10px]"><FileIcon name={f.name} size={12} /></span>
                <span className="max-w-[100px] truncate">{f.name}</span>
                {isEditing && editingFile === tabId && (
                  <span className="w-2 h-2 rounded-full" style={{ background: "#C00018" }} />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tabId); }}
                  className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.1] transition-all"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0">
          {activeFile && (
            <>
              <button onClick={startEditing} className="p-1 rounded hover:bg-white/[0.05]" title="Edit (click to edit)" style={{ color: isEditing ? "#C00018" : "var(--muted-foreground)" }}>
                <Edit3 size={11} />
              </button>
              {isEditing && (
                <button onClick={saveContent} className="p-1 rounded hover:bg-white/[0.05]" title="Save (Ctrl+S)" style={{ color: "#22C55E" }}>
                  <CheckCircle size={11} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div
        ref={editorRef}
        className="flex-1 overflow-auto font-mono text-[12px] leading-[1.6] outline-none"
        style={{ background: "var(--background)" }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseUp={trackCursor}
        onKeyUp={trackCursor}
      >
        {activeFile ? (
          <table className="w-full">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-white/[0.015]">
                  <td
                    className="text-right pr-4 pl-3 select-none text-[10px]"
                    style={{ color: "rgba(255,255,255,0.12)", width: 44, fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {i + 1}
                  </td>
                  <td
                    className="pr-4 whitespace-pre"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}
                    data-line={i}
                  >
                    {isEditing && editingFile === activeFileId ? (
                      <textarea
                        value={displayContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="w-full bg-transparent outline-none resize-none overflow-hidden"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)", fontSize: 12, lineHeight: 1.6, minHeight: lines.length * 19.2, height: "100%", border: "none" }}
                        spellCheck={false}
                      />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line, activeFile.language) }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-8">
              <Code2 size={40} style={{ color: "var(--muted-foreground)", opacity: 0.15 }} className="mx-auto mb-4" />
              <h2 className="text-sm font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                Cybersecurity Engineering Workspace
              </h2>
              <p className="text-[11px] mb-4" style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                Select a file from the explorer or ask the AI agent to create something new.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
