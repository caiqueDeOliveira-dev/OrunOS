import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const AutomotiveGarage = lazy(() =>
  import("./AutomotiveGarage").then((m) => ({ default: m.AutomotiveGarage }))
);

const plugin: WorkspacePlugin = {
  id: "Automotive",
  name: "Automotive Garage",
  version: "1.0.0",
  description: "Consultor automotivo completo - diagnostico, servicos, gastos e pecas",
  icon: "Car",
  requirements: { minRamMB: 512, estimatedRAMMB: 80, features: [] },
  tabs: null,
  components: { workspace: AutomotiveGarage },
};

registerPlugin(plugin);
