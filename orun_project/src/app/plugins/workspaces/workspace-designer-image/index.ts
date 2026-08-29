import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const DesignerWorkspace = lazy(() =>
  import("./DesignerWorkspace").then((m) => ({ default: m.DesignerWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Designer",
  name: "Designer Studio",
  version: "1.2.0",
  description: "Canvas para criar artes, Figma para UI/UX design, editor de imagens com filtros, e modelagem 3D com Three.js — Creative Suite completo",
  icon: "Palette",
  requirements: { minRamMB: 1024, estimatedRAMMB: 256, features: ["webgl", "web-audio"] },
  tabs: [
    { id: "canvas", label: "Canvas", icon: "Image" },
    { id: "figma", label: "Figma", icon: "Layout" },
    { id: "edit", label: "Editar", icon: "Sliders" },
    { id: "3d", label: "3D", icon: "Box" },
  ],
  components: { workspace: DesignerWorkspace },
};

registerPlugin(plugin);
