import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const OrunFinance = lazy(() =>
  import("./OrunFinance").then((m) => ({ default: m.OrunFinance }))
);

const plugin: WorkspacePlugin = {
  id: "FinanceReal",
  name: "Finance Real",
  version: "2.0.0",
  description: "Orun Finance — controle total: saúde financeira, transações, orçamento, metas, investimentos, simulador e análise com IA. Backend Actual Budget, provider-agnostic.",
  icon: "Wallet",
  requirements: { minRamMB: 256, estimatedRAMMB: 96, features: [] },
  tabs: null,
  components: { workspace: OrunFinance },
};

registerPlugin(plugin);
