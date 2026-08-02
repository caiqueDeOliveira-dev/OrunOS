import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const DeveloperIDE = lazy(() =>
  import("./DeveloperIDE").then((m) => ({ default: m.DeveloperIDE }))
);

const plugin: WorkspacePlugin = {
  id: "Developer",
  name: "Developer",
  version: "1.1.0",
  description: "Professional IDE com explorer, editor, terminal, busca, git, análise de segurança — Senior Cybersecurity Engineering Workspace",
  icon: "Shield",
  requirements: { minRamMB: 512, estimatedRAMMB: 128, features: [] },
  tabs: null,
  components: { workspace: DeveloperIDE },
};

registerPlugin(plugin);
