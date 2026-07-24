// plugins/workspaces/workspace-system-console/index.ts
//
// System Console workspace plugin.
// Registers the System agent workspace with a terminal + resource monitor.

import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const SystemWorkspace = lazy(() =>
  import("./SystemWorkspace").then((m) => ({ default: m.SystemWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "System",
  name: "System Console",
  version: "1.0.0",
  description: "Terminal emulator + system resource monitor for full PC management",
  icon: "Settings",
  requirements: {
    minRamMB: 512,
    estimatedRAMMB: 128,
    features: ["clipboard"],
  },
  tabs: null, // Single workspace, no tabs
  components: {
    workspace: SystemWorkspace,
  },
  lifecycle: {
    onMount: () => {
      // Could ping system health on mount
    },
    onUnmount: () => {
      // Cleanup
    },
  },
};

registerPlugin(plugin);
