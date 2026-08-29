import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const CareerWorkspace = lazy(() =>
  import("./CareerWorkspace").then((m) => ({ default: m.CareerWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Career",
  name: "Carreiras",
  version: "1.1.0",
  description: "Busca de vagas, perfis de LinkedIn (CaÃ­que/Esposa) e acompanhamento de candidaturas",
  icon: "Briefcase",
  requirements: { minRamMB: 256, estimatedRAMMB: 48, features: [] },
  tabs: null,
  components: { workspace: CareerWorkspace },
};

registerPlugin(plugin);
