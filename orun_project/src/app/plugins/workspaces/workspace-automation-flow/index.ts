import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const AutomationFlow = lazy(() =>
  import("./AutomationFlow").then((m) => ({ default: m.AutomationFlow }))
);

const plugin: WorkspacePlugin = {
  id: "Automation",
  name: "Automation Flow",
  version: "1.0.0",
  description: "Visual flow editor with nodes, connections, and execution log",
  icon: "Workflow",
  requirements: { minRamMB: 512, estimatedRAMMB: 80, features: [] },
  tabs: null,
  components: { workspace: AutomationFlow },
};

registerPlugin(plugin);
