import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const DesignerWorkspace = lazy(() =>
  import("./DesignerWorkspace").then((m) => ({ default: m.DesignerWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Designer",
  name: "Designer Image",
  version: "1.0.0",
  description: "Layer-based image editor with canvas, shapes, text, filters, and export",
  icon: "Palette",
  requirements: { minRamMB: 512, estimatedRAMMB: 96, features: [] },
  tabs: null,
  components: { workspace: DesignerWorkspace },
};

registerPlugin(plugin);
