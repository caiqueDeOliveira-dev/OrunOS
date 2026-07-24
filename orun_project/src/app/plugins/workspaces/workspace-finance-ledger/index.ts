import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const FinanceLedger = lazy(() =>
  import("./FinanceLedger").then((m) => ({ default: m.FinanceLedger }))
);

const plugin: WorkspacePlugin = {
  id: "Finance",
  name: "Finance Ledger",
  version: "1.0.0",
  description: "Personal finance dashboard with expense tracking, budgets, and investment monitoring",
  icon: "Wallet",
  requirements: { minRamMB: 512, estimatedRAMMB: 80, features: [] },
  tabs: null,
  components: { workspace: FinanceLedger },
};

registerPlugin(plugin);
