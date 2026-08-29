import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const ShieldSecretsPanel = lazy(() =>
  import("./ShieldSecretsPanel").then((m) => ({ default: m.ShieldSecretsPanel }))
);

const plugin: WorkspacePlugin = {
  id: "ShieldSecrets",
  name: "Shield Secrets",
  version: "1.0.0",
  description: "Detecção de vazamento de credenciais via Gitleaks",
  icon: "KeyRound",
  requirements: { minRamMB: 128, estimatedRAMMB: 64, features: [] },
  tabs: null,
  components: { workspace: ShieldSecretsPanel },
};

registerPlugin(plugin);
