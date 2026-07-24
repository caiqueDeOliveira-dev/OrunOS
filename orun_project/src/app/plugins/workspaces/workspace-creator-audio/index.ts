import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const CreatorWorkspace = lazy(() =>
  import("./CreatorWorkspace").then((m) => ({ default: m.CreatorWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Creator_Audio",
  name: "Creator Studio",
  version: "1.0.0",
  description: "Multi-track audio mixer and video timeline editor with real-time visualization",
  icon: "Music",
  requirements: { minRamMB: 512, estimatedRAMMB: 96, features: ["web-audio"] },
  tabs: [
    { id: "audio", label: "Áudio", icon: "Music" },
    { id: "video", label: "Vídeo", icon: "Film" },
  ],
  components: { workspace: CreatorWorkspace },
};

registerPlugin(plugin);
