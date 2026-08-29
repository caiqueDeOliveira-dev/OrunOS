import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const TelemetryDashboard = lazy(() =>
  import("./TelemetryDashboard").then((m) => ({ default: m.TelemetryDashboard }))
);

const plugin: WorkspacePlugin = {
  id: "Telemetry",
  name: "Telemetry Dashboard",
  version: "1.0.0",
  description: "Observabilidade dos agentes e MCPs via PostHog",
  icon: "Activity",
  requirements: { minRamMB: 128, estimatedRAMMB: 64, features: [] },
  tabs: null,
  components: { workspace: TelemetryDashboard },
};

registerPlugin(plugin);
