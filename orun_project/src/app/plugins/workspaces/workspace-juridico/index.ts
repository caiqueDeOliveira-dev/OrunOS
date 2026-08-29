import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin, PluginTab } from "../../types";

const JuridicoWorkspace = lazy(() =>
  import("./JuridicoWorkspace").then((m) => ({ default: m.JuridicoWorkspace }))
);

const tabs: PluginTab[] = [
  { id: "painel", label: "Painel", icon: "Scale" },
  { id: "evidencias", label: "Evidências", icon: "Camera" },
  { id: "casos", label: "Casos", icon: "Briefcase" },
  { id: "whatsapp", label: "WhatsApp", icon: "MessageSquare" },
];

const plugin: WorkspacePlugin = {
  id: "Juridico",
  name: "Escritorio Juridico",
  version: "2.1.0",
  description: "Escritorio de advocacia pessoal com catalogo de provas, gestao de casos e integracao WhatsApp",
  icon: "Scale",
  requirements: { minRamMB: 256, estimatedRAMMB: 60, features: [] },
  tabs,
  components: { workspace: JuridicoWorkspace },
};

registerPlugin(plugin);
