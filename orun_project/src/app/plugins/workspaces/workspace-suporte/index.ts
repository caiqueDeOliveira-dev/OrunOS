import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const SuporteWorkspace = lazy(() =>
  import("./SuporteWorkspace").then((m) => ({ default: m.SuporteWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Suporte",
  name: "Suporte Tecnico",
  version: "2.0.0",
  description: "Central de suporte tecnico com registro de erros, bugs, sugestoes e melhorias do sistema",
  icon: "LifeBuoy",
  requirements: { minRamMB: 256, estimatedRAMMB: 60, features: [] },
  tabs: null,
  components: { workspace: SuporteWorkspace },
};

registerPlugin(plugin);
