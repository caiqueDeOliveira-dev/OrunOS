import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const AssistenteTecnicoWorkspace = lazy(() =>
  import("./AssistenteTecnicoWorkspace").then((m) => ({ default: m.AssistenteTecnicoWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "AssistenteTecnico",
  name: "Assistencia Tecnica",
  version: "2.0.0",
  description: "Oficina profissional de consertos com gestao de estoque, pecas, ferramentas e ordens de servico",
  icon: "Wrench",
  requirements: { minRamMB: 256, estimatedRAMMB: 60, features: [] },
  tabs: null,
  components: { workspace: AssistenteTecnicoWorkspace },
};

registerPlugin(plugin);
