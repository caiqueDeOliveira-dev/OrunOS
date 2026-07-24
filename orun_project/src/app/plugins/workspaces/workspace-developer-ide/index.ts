import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const DeveloperIDE = lazy(() =>
  import("./DeveloperIDE").then((m) => ({ default: m.DeveloperIDE }))
);

const plugin: WorkspacePlugin = {
  id: "Developer",
  name: "Developer IDE",
  version: "1.0.0",
  description: "Code editor with file explorer, terminal, and output panel",
  icon: "Code2",
  requirements: { minRamMB: 512, estimatedRAMMB: 80, features: [] },
  tabs: null,
  components: { workspace: DeveloperIDE },
};

registerPlugin(plugin);
