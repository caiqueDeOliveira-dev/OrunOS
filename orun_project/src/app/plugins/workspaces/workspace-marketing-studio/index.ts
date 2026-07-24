import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const MarketingWorkspace = lazy(() =>
  import("./MarketingWorkspace").then((m) => ({ default: m.MarketingWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Marketing",
  name: "Marketing Studio",
  version: "1.0.0",
  description: "Campaign builder, content calendar, A/B test preview, and analytics dashboard",
  icon: "Megaphone",
  requirements: { minRamMB: 512, estimatedRAMMB: 80, features: [] },
  tabs: null,
  components: { workspace: MarketingWorkspace },
};

registerPlugin(plugin);
