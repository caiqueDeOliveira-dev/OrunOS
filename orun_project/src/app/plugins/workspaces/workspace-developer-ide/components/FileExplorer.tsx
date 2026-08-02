import { useState, useCallback, useRef, useEffect } from "react";
import { useIDEStore } from "../developer-store";
import { getLanguage } from "../developer-types";
import { FileIcon } from "./FileIcon";
import {
  Files, X, Plus, File, Folder, FolderOpen,
  ChevronRight, ChevronDown, Trash2, Edit3, ExternalLink,
} from "lucide-react";

export function FileExplorer() {
  const files = useIDEStore((s) => s.files);
  const rootIds = useIDEStore((s) => s.rootIds);
  const activeFileId = useIDEStore((s) => s.activeFileId);
  const contextMenu = useIDEStore((s) => s.contextMenu);
  const isCreatingFile = useIDEStore((s) => s.isCreatingFile);
  const creatingInFolder = useIDEStore((s) => s.creatingInFolder);
  const creatingIsFolder = useIDEStore((s) => s.creatingIsFolder);
  const newFileName = useIDEStore((s) => s.newFileName);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isCreatingFile && inputRef.current) inputRef.current.focus(); }, [isCreatingFile]);

  const loadChildren = useCallback(async (folderId: string) => {
    const node = useIDEStore.getState().files[folderId];
    if (!node || node.type !== "folder" || !node.path) return;
    try {
      const entries = await (window as any).orun?.developer?.listFiles?.(node.path);
      if (!entries || entries.error) return;
      useIDEStore.setState((s) => {
        const newFiles = { ...s.files };
        const childIds: string[] = [];
        for (const entry of entries) {
          const id = `${folderId}_${entry.name}`;
          childIds.push(id);
          if (entry.isDirectory) {
            newFiles[id] = { id, name: entry.name, type: "folder", path: entry.path, children: [] as string[], expanded: false };
          } else {
            newFiles[id] = { id, name: entry.name, type: "file", path: entry.path, language: getLanguage(entry.name) };
          }
        }
        newFiles[folderId] = { ...newFiles[folderId], children: childIds };
        return { files: newFiles };
      });
    } catch {}
  }, []);

  const toggleFolder = useCallback((id: string) => {
    const node = useIDEStore.getState().files[id];
    if (!node || node.type !== "folder") return;
    const willExpand = !node.expanded;
    useIDEStore.setState((s) => ({
      files: { ...s.files, [id]: { ...s.files[id], expanded: willExpand } },
    }));
    if (willExpand && (!node.children || node.children.length === 0)) {
      loadChildren(id);
    }
  }, [loadChildren]);

  const openFile = useCallback((id: string) => {
    useIDEStore.setState((s) => ({
      activeFileId: id,
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
    }));
  }, []);

  const refreshFiles = useCallback(async () => {
    try {
      const wsPath = await (window as any).orun?.developer?.getWorkspace?.();
      if (!wsPath) return;
      const newFiles: Record<string, any> = {};
      const newRootIds: string[] = [];
      async function readDirRecursive(dirPath: string, parentId: string) {
        const entries = await (window as any).orun?.developer?.listFiles?.(dirPath);
        if (!entries || entries.error) return;
        for (const entry of entries) {
          const id = `${parentId}_${entry.name}`;
          if (entry.isDirectory) {
            newFiles[id] = { id, name: entry.name, type: "folder", path: entry.path, children: [] as string[], expanded: true };
            if (parentId === "root") newRootIds.push(id);
            const parent = newFiles[parentId];
            if (parent?.children) parent.children.push(id);
            await readDirRecursive(entry.path, id);
          } else {
            newFiles[id] = { id, name: entry.name, type: "file", path: entry.path, language: getLanguage(entry.name) };
            if (parentId === "root") newRootIds.push(id);
            const parent = newFiles[parentId];
            if (parent?.children) parent.children.push(id);
          }
        }
      }
      await readDirRecursive(wsPath, "root");
      const oldState = useIDEStore.getState();
      for (const [id, node] of Object.entries(newFiles)) {
        if (node.type === "file") {
          const oldFile = oldState.files[id];
          if (oldFile?.content) {
            newFiles[id] = { ...newFiles[id], content: oldFile.content };
          } else {
            try {
              const result = await (window as any).orun?.developer["read-file"]?.({ filePath: node.path });
              if (result?.content) newFiles[id] = { ...newFiles[id], content: result.content };
            } catch {}
          }
        }
      }
      useIDEStore.setState({ files: newFiles, rootIds: newRootIds });
    } catch (err) {
      console.warn("[FileExplorer] refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("developer:refresh-explorer", refreshFiles);
    return () => window.removeEventListener("developer:refresh-explorer", refreshFiles);
  }, [refreshFiles]);

  useEffect(() => {
    const handle = () => { setTimeout(() => window.dispatchEvent(new CustomEvent("developer:refresh-explorer")), 300); };
    window.addEventListener("developer:file-written", handle);
    return () => window.removeEventListener("developer:file-written", handle);
  }, []);

  const handleImportFolder = useCallback(async () => {
    try {
      const result = await (window as any).orun?.shell?.openDirectory?.();
      if (!result || result.canceled || !result.path) return;
      const dirPath = result.path;
      await (window as any).orun?.developer?.setWorkspace?.(dirPath);
      const newFiles: Record<string, any> = {};
      const newRootIds: string[] = [];
      async function readDirRecursive(dirPath: string, parentId: string) {
        const entries = await (window as any).orun?.developer?.listFiles?.(dirPath);
        if (!entries || entries.error) return;
        for (const entry of entries) {
          const id = `${parentId}_${entry.name}`;
          if (entry.isDirectory) {
            newFiles[id] = { id, name: entry.name, type: "folder", children: [] as string[], expanded: true };
            if (parentId === "root") newRootIds.push(id);
            const parent = newFiles[parentId];
            if (parent?.children) parent.children.push(id);
            await readDirRecursive(entry.path, id);
          } else {
            let content = "";
            try {
              const result = await (window as any).orun?.developer["read-file"]?.({ filePath: entry.path });
              if (result?.content) content = result.content;
            } catch {}
            newFiles[id] = { id, name: entry.name, type: "file", content, path: entry.path, language: getLanguage(entry.name) };
            if (parentId === "root") newRootIds.push(id);
            const parent = newFiles[parentId];
            if (parent?.children) parent.children.push(id);
          }
        }
      }
      const dirName = dirPath.split(/[/\\]/).pop() || dirPath;
      await readDirRecursive(dirPath, "root");
      const rootFolderId = `root_${dirName}`;
      newFiles[rootFolderId] = { id: rootFolderId, name: dirName, type: "folder", children: newRootIds, expanded: true };
      useIDEStore.setState({ files: newFiles, rootIds: [rootFolderId] });
    } catch (e) {}
  }, []);

  const startCreatingFile = useCallback((folderId: string, isFolder: boolean) => {
    useIDEStore.setState({ isCreatingFile: true, creatingInFolder: folderId, creatingIsFolder: isFolder, newFileName: "" });
  }, []);

  const confirmCreateFile = useCallback(() => {
    const s = useIDEStore.getState();
    const name = s.newFileName.trim();
    if (!name) { useIDEStore.setState({ isCreatingFile: false }); return; }
    const id = `${s.creatingInFolder}_${name}`;
    useIDEStore.setState((st) => {
      const newFiles: Record<string, any> = { ...st.files };
      if (s.creatingIsFolder) {
        newFiles[id] = { id, name, type: "folder", children: [] as string[], expanded: true };
      } else {
        newFiles[id] = { id, name, type: "file", content: "", language: getLanguage(name) };
      }
      const parent = newFiles[s.creatingInFolder];
      if (parent && parent.type === "folder" && parent.children && !parent.children.includes(id)) {
        parent.children.push(id);
      }
      const result: any = { files: newFiles, isCreatingFile: false };
      if (!s.creatingIsFolder) {
        result.activeFileId = id;
        result.openTabs = st.openTabs.includes(id) ? st.openTabs : [...st.openTabs, id];
      }
      return result;
    });
    setTimeout(() => window.dispatchEvent(new CustomEvent("developer:refresh-explorer")), 100);
  }, []);

  const deleteNode = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    useIDEStore.setState((s) => {
      const newFiles = { ...s.files };
      const toDelete = new Set<string>();
      function collectDescendants(nodeId: string) {
        toDelete.add(nodeId);
        const node = newFiles[nodeId];
        if (node?.type === "folder" && node.children) {
          node.children.forEach(collectDescendants);
        }
      }
      collectDescendants(id);
      toDelete.forEach((did) => delete newFiles[did]);

      const removeFromParent = (children: string[] | undefined) => (children || []).filter((c) => !toDelete.has(c));
      for (const [fid, node] of Object.entries(newFiles)) {
        if (node.type === "folder") {
          newFiles[fid] = { ...node, children: removeFromParent(node.children) };
        }
      }

      const newTabs = s.openTabs.filter((t) => !toDelete.has(t));
      const newRootIds = s.rootIds.filter((r) => !toDelete.has(r));

      return {
        files: newFiles,
        rootIds: newRootIds,
        openTabs: newTabs,
        activeFileId: toDelete.has(s.activeFileId || "") ? (newTabs[0] || null) : s.activeFileId,
      };
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    useIDEStore.setState({ contextMenu: { x: e.clientX, y: e.clientY, fileId } });
  }, []);

  useEffect(() => {
    const close = () => useIDEStore.setState({ contextMenu: null });
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const startRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const confirmRename = useCallback(() => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    const newName = renameValue.trim();
    useIDEStore.setState((s) => {
      const node = s.files[renamingId];
      if (!node) return {};
      const ext = newName.split(".").pop() || "";
      const lang = getLanguage(newName);
      const newFiles = {
        ...s.files,
        [renamingId]: { ...node, name: newName, language: node.type === "file" ? lang : node.language },
      };
      return { files: newFiles };
    });
    setRenamingId(null);
  }, [renamingId, renameValue]);

  const renderNode = (id: string, depth: number) => {
    const node = files[id];
    if (!node) return null;
    const isRenaming = renamingId === id;
    const isCreatingHere = isCreatingFile && creatingInFolder === id;

    if (node.type === "folder") {
      return (
        <div key={id}>
          <div
            className="flex items-center gap-1 py-1 px-2 text-[11px] cursor-pointer select-none group hover:bg-white/[0.03] transition-colors"
            style={{ paddingLeft: depth * 16 + 8, color: "var(--muted-foreground)" }}
            onClick={() => toggleFolder(id)}
            onContextMenu={(e) => handleContextMenu(e, id)}
          >
            <span className="text-[8px] w-3 shrink-0">{node.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}</span>
            <span className="text-[11px] shrink-0">{node.expanded ? "📂" : "📁"}</span>
            <span className="truncate flex-1" style={{ color: "var(--foreground)" }}>{node.name}</span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); startCreatingFile(id, false); }} className="p-0.5 rounded hover:bg-white/[0.05]" title="New File"><File size={10} /></button>
              <button onClick={(e) => { e.stopPropagation(); startCreatingFile(id, true); }} className="p-0.5 rounded hover:bg-white/[0.05]" title="New Folder"><Folder size={10} /></button>
              <button onClick={(e) => { e.stopPropagation(); deleteNode(id, e); }} className="p-0.5 rounded hover:bg-white/[0.05]" title="Delete"><Trash2 size={10} /></button>
            </div>
          </div>
          {node.expanded && (
            <div>
              {isCreatingHere && (
                <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: (depth + 1) * 16 + 22 }}>
                  <span className="text-[10px]">{creatingIsFolder ? "📁" : <FileIcon name={newFileName || "file"} size={12} />}</span>
                  <input
                    ref={inputRef}
                    value={newFileName}
                    onChange={(e) => useIDEStore.setState({ newFileName: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmCreateFile(); if (e.key === "Escape") useIDEStore.setState({ isCreatingFile: false }); }}
                    className="flex-1 bg-transparent text-[11px] outline-none border-b"
                    style={{ color: "var(--foreground)", borderColor: "#C00018" }}
                    placeholder={creatingIsFolder ? "folder-name" : "file.ext"}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              {node.children?.map((childId) => renderNode(childId, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeFileId === id;
    return (
      <div key={id}>
        {isRenaming ? (
          <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: depth * 16 + 22 }}>
            <span className="text-[10px]"><FileIcon name={node.name} size={12} /></span>
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenamingId(null); }}
              className="flex-1 bg-transparent text-[11px] outline-none border-b"
              style={{ color: "var(--foreground)", borderColor: "#C00018" }}
              onClick={(e) => e.stopPropagation()}
              onBlur={confirmRename}
            />
          </div>
        ) : (
          <div
            className="flex items-center gap-1.5 py-1 px-2 text-[11px] cursor-pointer select-none group transition-colors"
            style={{
              paddingLeft: depth * 16 + 22,
              color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
              background: isActive ? "rgba(192,0,24,0.08)" : "transparent",
              borderRight: isActive ? "2px solid #C00018" : "2px solid transparent",
            }}
            onClick={() => openFile(id)}
            onContextMenu={(e) => handleContextMenu(e, id)}
          >
            <span className="text-[10px] shrink-0"><FileIcon name={node.name} size={12} /></span>
            <span className="truncate flex-1">{node.name}</span>
            <button
              onClick={(e) => deleteNode(id, e)}
              className="hidden group-hover:block p-0.5 rounded hover:bg-white/[0.05]"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => startCreatingFile(rootIds[0] || "root", false)} className="p-1 rounded hover:bg-white/[0.05]" title="New File"><Plus size={12} /></button>
          <button onClick={() => startCreatingFile(rootIds[0] || "root", true)} className="p-1 rounded hover:bg-white/[0.05]" title="New Folder"><Folder size={12} /></button>
          <button onClick={refreshFiles} className="p-1 rounded hover:bg-white/[0.05]" title="Refresh"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></button>
          <button onClick={handleImportFolder} className="p-1 rounded hover:bg-white/[0.05]" title="Open Folder"><ExternalLink size={12} /></button>
        </div>
      </div>
      {isCreatingFile && creatingInFolder === "root" && (
        <div className="flex items-center gap-1 px-3 py-1">
                  <span className="text-[10px]">{creatingIsFolder ? "📁" : <FileIcon name={newFileName || "file"} size={12} />}</span>
          <input
            ref={inputRef}
            value={newFileName}
            onChange={(e) => useIDEStore.setState({ newFileName: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") confirmCreateFile(); if (e.key === "Escape") useIDEStore.setState({ isCreatingFile: false }); }}
            className="flex-1 bg-transparent text-[11px] outline-none border-b"
            style={{ color: "var(--foreground)", borderColor: "#C00018" }}
            placeholder="file.ts"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-1">
        {rootIds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(192,0,24,0.08)" }}>
              <FolderOpen size={24} style={{ color: "#C00018", opacity: 0.6 }} />
            </div>
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>No folder open</p>
            <button onClick={handleImportFolder}
              className="px-4 py-2 rounded-lg text-[10px] font-medium transition-all hover:scale-[1.02]"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              Open Folder
            </button>
          </div>
        ) : (
          rootIds.map((id) => renderNode(id, 0))
        )}
      </div>
      {contextMenu && (
        <div
          className="fixed z-50 w-40 py-1 rounded-lg border shadow-xl"
          style={{ top: contextMenu.y, left: contextMenu.x, background: "var(--card)", borderColor: "var(--border)" }}
          onClick={() => useIDEStore.setState({ contextMenu: null })}
        >
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.05]"
            onClick={() => { startRename(contextMenu.fileId, files[contextMenu.fileId]?.name || ""); }}>
            <Edit3 size={12} /> Rename
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.05]"
            onClick={(e) => { const me = e as unknown as React.MouseEvent; deleteNode(contextMenu.fileId, me); }}>
            <Trash2 size={12} /> Delete
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.05]"
            onClick={() => { startCreatingFile(contextMenu.fileId, false); }}>
            <File size={12} /> New File
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.05]"
            onClick={() => { startCreatingFile(contextMenu.fileId, true); }}>
            <Folder size={12} /> New Folder
          </button>
        </div>
      )}
    </div>
  );
}
