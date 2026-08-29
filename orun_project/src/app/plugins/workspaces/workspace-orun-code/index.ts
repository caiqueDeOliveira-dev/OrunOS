import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const OrunCode = lazy(() => import("./OrunCode").then((m) => ({ default: m.OrunCode })));

const plugin: WorkspacePlugin = {
  id: "OrunCode",
  name: "Orun Code",
  version: "0.3.0",
  description: "Ambiente de engenharia de software inteligente do Orun OS — IDE profissional com Orun AI, Agent Center, edição real de arquivos e GitHub Control Center (Fases 1-2).",
  icon: "Code",
  requirements: { minRamMB: 512, estimatedRAMMB: 160, features: [] },
  tabs: null,
  components: { workspace: OrunCode },
};

registerPlugin(plugin);
