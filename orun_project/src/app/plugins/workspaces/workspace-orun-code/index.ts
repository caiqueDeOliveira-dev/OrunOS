import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const OrunCode = lazy(() => import("./OrunCode").then((m) => ({ default: m.OrunCode })));

const plugin: WorkspacePlugin = {
  id: "OrunCode",
  name: "Orun Code",
  version: "0.2.0",
  description: "Ambiente de engenharia de software inteligente do Orun OS — IDE profissional com Orun AI, Agent Center e edição real de arquivos (herdado do Developer).",
  icon: "Code",
  requirements: { minRamMB: 512, estimatedRAMMB: 160, features: [] },
  tabs: null,
  components: { workspace: OrunCode },
};

registerPlugin(plugin);
