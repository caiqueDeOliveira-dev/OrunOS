import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const HomeWorkspace = lazy(() =>
  import("./HomeWorkspace").then((m) => ({ default: m.HomeWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "HomeIA",
  name: "Home IA",
  version: "1.1.0",
  description: "Casa inteligente: dispositivos, automacoes, cenas e controle por voz",
  icon: "Home",
  requirements: { minRamMB: 128, estimatedRAMMB: 64, features: [] },
  tabs: null,
  components: { workspace: HomeWorkspace },
};

registerPlugin(plugin);
