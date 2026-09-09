import { useEffect, useRef } from "react";
import {
  Excalidraw,
  exportToBlob,
  exportToSvg,
  getNonDeletedElements,
  loadFromBlob,
  restore,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Eraser, FileJson, FileUp, Image as ImageIcon, MessageSquare, Shapes } from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { usePersonalization } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { getPluginSettings, setPluginSettings } from "../../PluginRegistry";
import { P, PremiumRoot } from "../premium";

const STORE_KEY = "Whiteboard";
const SAVE_DELAY = 600;

type StoredScene = {
  elements: readonly ExcalidrawElement[];
  appState: Record<string, unknown>;
  files: BinaryFiles;
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function WhiteboardWorkspace({ onSendMessage }: WorkspaceProps) {
  const { userName, avatarInitials } = usePersonalization();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const sceneRef = useRef<{ elements: ExcalidrawElement[]; appState: Record<string, unknown>; files: Record<string, unknown> }>({
    elements: [],
    appState: {},
    files: {},
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStoredScene = () => {
    try {
      const raw = getPluginSettings(STORE_KEY).scene as string | undefined;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredScene;
      const restored = restore({ elements: parsed.elements, appState: parsed.appState }, null, null);
      return { ...restored, files: parsed.files, scrollToContent: true };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = () => {
    const { elements, appState, files } = sceneRef.current;
    const active = getNonDeletedElements(elements);
    const json = serializeAsJSON(active, appState as never, files as never, "local");
    setPluginSettings(STORE_KEY, { scene: json, updatedAt: Date.now() });
  };

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, SAVE_DELAY);
  };

  const clearAll = () => {
    if (!apiRef.current) return;
    if (window.confirm("Limpar o quadro? Isso apaga todos os elementos.")) {
      apiRef.current.resetScene();
    }
  };

  const exportPng = async () => {
    const { elements, appState, files } = sceneRef.current;
    const blob = await exportToBlob({
      elements: getNonDeletedElements(elements),
      appState: appState as never,
      files: files as never,
      mimeType: "image/png",
      exportBackground: true,
      exportPadding: 16,
    });
    downloadBlob(blob, `whiteboard-${stamp()}.png`);
  };

  const exportSvg = async () => {
    const { elements, appState, files } = sceneRef.current;
    const svg = await exportToSvg({
      elements: getNonDeletedElements(elements),
      appState: appState as never,
      files: files as never,
      exportBackground: true,
    });
    const markup = new XMLSerializer().serializeToString(svg);
    downloadBlob(new Blob([markup], { type: "image/svg+xml" }), `whiteboard-${stamp()}.svg`);
  };

  const exportJson = () => {
    const { elements, appState, files } = sceneRef.current;
    const json = serializeAsJSON(elements, appState as never, files as never, "local");
    downloadBlob(new Blob([json], { type: "application/vnd.excalidraw+json" }), `whiteboard-${stamp()}.excalidraw`);
  };

  const importJson = async (file: File) => {
    try {
      const { elements, appState, files } = await loadFromBlob(file, null, null);
      const fileEntries = Object.values(files ?? {});
      if (fileEntries.length > 0 && apiRef.current) {
        apiRef.current.addFiles(fileEntries);
      }
      apiRef.current?.updateScene({ elements, appState });
    } catch {
      window.alert("Não foi possível importar este arquivo de whiteboard.");
    }
  };

  const sendToAI = () => {
    const { elements } = sceneRef.current;
    const count = getNonDeletedElements(elements).length;
    const summary =
      count === 0
        ? "meu quadro Whiteboard está vazio."
        : `meu quadro Whiteboard tem ${count} elementos.\n\nJSON do quadro:\n${serializeAsJSON(getNonDeletedElements(elements), sceneRef.current.appState as never, sceneRef.current.files as never, "local")}`;
    onSendMessage(summary);
  };

  const toolbarButton = "w-8 h-8 rounded-lg flex items-center justify-center transition-all";

  return (
    <PremiumRoot>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: P.border }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-1" style={{ background: P.card2 }}>
          <Shapes size={14} style={{ color: P.accent }} />
        </div>
        <span className="ws-label mr-3" style={{ color: P.text }}>Whiteboard · {userName}</span>

        <button
          className={toolbarButton}
          title="Enviar para a IA"
          onClick={sendToAI}
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: P.primary }}
        >
          <MessageSquare size={13} />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: P.border }} />

        <button className={toolbarButton} title="Exportar PNG" onClick={exportPng} style={{ color: P.sub }}>
          <ImageIcon size={13} />
        </button>
        <button className={toolbarButton} title="Exportar SVG" onClick={exportSvg} style={{ color: P.sub }}>
          <FileJson size={13} />
        </button>
        <button className={toolbarButton} title="Exportar .excalidraw (JSON)" onClick={exportJson} style={{ color: P.sub }}>
          <Eraser size={13} />
        </button>

        <label className={`${toolbarButton} cursor-pointer`} title="Importar arquivo .excalidraw" style={{ color: P.sub }}>
          <FileUp size={13} />
          <input
            type="file"
            accept=".excalidraw,.json,application/json,application/vnd.excalidraw+json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </label>

        <div className="flex-1" />

        <span className="ws-small hidden sm:inline" style={{ color: P.sub }}>Ctrl+Z desfaz · Ctrl+Y refaz</span>
        <button
          className={`${toolbarButton} ml-2`}
          title="Limpar quadro"
          onClick={clearAll}
          style={{ color: P.error }}
        >
          <Eraser size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <Excalidraw
          name="Whiteboard"
          langCode="pt-br"
          theme="dark"
          initialData={loadStoredScene}
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
          onChange={(elements, appState, files) => {
            sceneRef.current = { elements: [...elements], appState: { ...appState }, files: { ...files } };
            scheduleSave();
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveAsImage: false,
              saveToActiveFile: false,
              clearCanvas: false,
            },
          }}
        />
      </div>

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Descrever quadro à IA" />
    </PremiumRoot>
  );
}