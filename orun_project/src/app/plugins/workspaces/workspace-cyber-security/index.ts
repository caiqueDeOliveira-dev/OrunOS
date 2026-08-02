import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const SecurityWorkspace = lazy(() =>
  import("./SecurityWorkspace").then((m) => ({ default: m.SecurityWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "CyberSecurity",
  name: "Cyber Security",
  version: "1.0.0",
  description: "Auditoria de seguranca: scan local, vulnerabilidades e recomendacoes",
  icon: "Shield",
  requirements: { minRamMB: 128, estimatedRAMMB: 64, features: [] },
  tabs: null,
  components: { workspace: SecurityWorkspace },
};

registerPlugin(plugin);
