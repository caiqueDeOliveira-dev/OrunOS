import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const CreatorVideo = lazy(() =>
  import("./CreatorVideo").then((m) => ({ default: m.CreatorVideo }))
);

const plugin: WorkspacePlugin = {
  id: "Creator_Video",
  name: "Creator Video Timeline",
  version: "1.0.0",
  description: "Video editing timeline with tracks, keyframes, and preview",
  icon: "Film",
  requirements: { minRamMB: 512, estimatedRAMMB: 96, features: [] },
  tabs: null,
  components: { workspace: CreatorVideo },
};

registerPlugin(plugin);
