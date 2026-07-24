import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const HealthWorkspace = lazy(() =>
  import("./HealthWorkspace").then((m) => ({ default: m.HealthWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Health",
  name: "Health Dashboard",
  version: "1.0.0",
  description: "Interactive health dashboard with nutrition tracking, workout plans, and metric monitoring",
  icon: "Heart",
  requirements: { minRamMB: 512, estimatedRAMMB: 96, features: [] },
  tabs: null,
  components: { workspace: HealthWorkspace },
};

registerPlugin(plugin);
