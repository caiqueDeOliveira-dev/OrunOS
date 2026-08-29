// plugins/workspaces/workspace-orun-code/components/CodeEditor.tsx
import { useState, useRef, useCallback, useEffect } from "react";
import { Code2, X, CheckCircle, Edit3 } from "lucide-react";
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";
import { getLanguage, escapeHtml } from "../types";

export interface OpenTab {
  id: string;
  name: string;
  language: string;
  content: string;
  dirty?: boolean;
}

function highlight(code: string, lang: string): string {
  const kw = new Set([
    "import", "export", "from", "const", "let", "var", "function", "return", "if", "else",
    "for", "while", "async", "await", "class", "extends", "interface", "type", "enum",
    "try", "catch", "new", "this", "super", "true", "false", "null", "undefined",
  ]);
  let out = escapeHtml(code);
  out = out.replace(/([#a-zA-Z_][a-zA-Z0-9_]*)/g, (m) => {
    if (kw.has(m)) return `<span style="color:${OC.primary}">${m}</span>`;
    return m;
  });
  out = out.replace(/&quot;.*?&quot;|&#39;.*?&#39;|`.+?`/g, (m) => `<span style="color:${OC.success}">${m}</span>`);
  return out;
}

export function CodeEditor() {
  const openTabsRaw = useOrunCodeStore((s) => s.openTabs);
  const activeFileId = useOrunCodeStore((s) => s.activeFileId);
  const setState = useOrunCodeStore.setState;
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Listen for file-open events from the explorer
  useEffect(() => {
    const handler = (e: any) => {
      const d = e.detail;
      if (!d) return;
      setTabs((prev) => {
        const exists = prev.some((t) => t.id === d.id);
        const next = exists ? prev.map((t) => (t.id === d.id ? { ...t, content: d.content ?? t.content, language: d.language ?? t.language } : t)) : [...prev, { id: d.id, name: d.name, language: d.language, content: d.content || "" }];
        setState({ activeFileId: d.id });
        return next;
      });
      setEditing(false);
    };
    window.addEventListener("oruncode:open-file", handler);
    return () => window.removeEventListener("oruncode:open-file", handler);
  }, [setState]);

  const active = tabs.find((t) => t.id === activeFileId) || null;

  const closeTab = (id: string) => {
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeFileId === id) {
      setState({ activeFileId: next.length ? next[next.length - 1].id : null, openTabs: next.map((t) => t.id) });
    }
  };

  const selectTab = (id: string) => {
    setState({ activeFileId: id });
    setEditing(false);
  };

  const save = () => {
    if (!active) return;
    const content = draft;
    setTabs((prev) => prev.map((t) => (t.id === active.id ? { ...t, content, dirty: false } : t)));
    setEditing(false);
    window.dispatchEvent(new CustomEvent("oruncode:file-edited", { detail: { id: active.id, content } }));
  };

  const syncStoreTabs = useCallback(() => {
    setState({ openTabs: tabs.map((t) => t.id) });
  }, [tabs, setState]);

  useEffect(() => { syncStoreTabs(); }, [syncStoreTabs]);

  if (!active) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-3 py-2 border-b shrink-0" style={{ borderColor: OC.border, background: OC.card }}>
          <Code2 size={12} style={{ color: OC.dim }} />
          <span className="text-[9px] ml-2" style={{ color: OC.dim }}>Nenhum arquivo aberto</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-8">
            <Code2 size={40} style={{ color: OC.dim, opacity: 0.2 }} className="mx-auto mb-4" />
            <h2 className="text-sm font-semibold mb-2" style={{ fontFamily: "'Sora', sans-serif", color: OC.text }}>
              Orun Code
            </h2>
            <p className="text-[11px] leading-relaxed" style={{ color: OC.sub }}>
              Abra um arquivo no Explorer ou peça ao Orun AI para criar algo novo no mode Act.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayContent = editing ? draft : active.content;
  const lines = displayContent.split("\n");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b overflow-x-auto oc-scroll shrink-0" style={{ borderColor: OC.border, background: OC.card }}>
        {tabs.map((t) => {
          const isActive = t.id === activeFileId;
          return (
            <div
              key={t.id}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] cursor-pointer border-r shrink-0 group transition-colors"
              style={{
                borderColor: OC.border,
                background: isActive ? OC.bg : "transparent",
                color: isActive ? OC.text : OC.dim,
                borderBottom: isActive ? `2px solid ${OC.primary}` : "2px solid transparent",
              }}
              onClick={() => selectTab(t.id)}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: OC.info }} />
              <span className="max-w-[100px] truncate font-mono">{t.name}</span>
              {t.dirty && <span className="w-1.5 h-1.5 rounded-full" style={{ background: OC.primary }} />}
              <button onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.1]">
                <X size={10} />
              </button>
            </div>
          );
        })}
        <div className="flex-1" />
        {!editing ? (
          <button onClick={() => { setDraft(active.content); setEditing(true); }} className="p-1.5 mr-1 rounded hover:bg-white/[0.05]" style={{ color: OC.sub }} title="Editar">
            <Edit3 size={12} />
          </button>
        ) : (
          <div className="flex items-center mr-1 gap-1">
            <button onClick={save} className="p-1.5 rounded hover:bg-white/[0.05]" style={{ color: OC.success }} title="Salvar (Ctrl+S)">
              <CheckCircle size={13} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={editorRef}
        className="flex-1 overflow-auto font-mono text-[12px] leading-[1.6] outline-none oc-scroll"
        style={{ background: OC.bg }}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "s" && editing) { e.preventDefault(); save(); }
        }}
      >
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/[0.015]">
                <td className="text-right pr-4 pl-3 select-none text-[10px]" style={{ color: "rgba(255,255,255,0.12)", width: 44, fontFamily: OC.mono }}>{i + 1}</td>
                <td className="pr-4 whitespace-pre" style={{ fontFamily: OC.mono, color: OC.text }}>
                  {editing ? (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full bg-transparent outline-none resize-none overflow-hidden"
                      style={{ fontFamily: OC.mono, color: OC.text, fontSize: 12, lineHeight: 1.6, border: "none" }}
                      spellCheck={false}
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: highlight(line, active.language) }} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
