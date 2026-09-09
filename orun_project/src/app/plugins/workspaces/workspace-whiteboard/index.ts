import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const WhiteboardWorkspace = lazy(() =>
  import("./WhiteboardWorkspace").then((m) => ({ default: m.WhiteboardWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Whiteboard",
  name: "Whiteboard",
  version: "1.0.0",
  description: "Quadro branco infinito para brainstorm visual, diagramas e ideias (Excalidraw)",
  icon: "PenTool",
  requirements: { minRamMB: 256, estimatedRAMMB: 90, features: [] },
  tabs: null,
  components: { workspace: WhiteboardWorkspace },
};

registerPlugin(plugin);