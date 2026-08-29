import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const CreatorWorkspace = lazy(() =>
  import("./CreatorWorkspace").then((m) => ({ default: m.CreatorWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Creator_Audio",
  name: "Creator Studio",
  version: "1.1.0",
  description: "Multi-track audio mixer and video timeline editor with real-time visualization",
  icon: "Music",
  requirements: { minRamMB: 512, estimatedRAMMB: 96, features: ["web-audio"] },
  tabs: [
    { id: "audio", label: "Ãudio", icon: "Music" },
    { id: "video", label: "VÃ­deo", icon: "Film" },
  ],
  components: { workspace: CreatorWorkspace },
};

registerPlugin(plugin);
