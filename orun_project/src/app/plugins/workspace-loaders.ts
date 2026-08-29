// plugins/workspace-loaders.ts
//
// Lazy loaders for every bundled workspace plugin. Importing a module triggers
// its registerPlugin() call, so awaiting this list guarantees the registry is
// fully populated. Dynamic imports are cached by the bundler — calling a
// loader again after it resolved is an immediate no-op.

export const WORKSPACE_PLUGIN_LOADERS = [
  () => import("./workspaces/workspace-system-console"),
  () => import("./workspaces/workspace-health-dashboard"),
  () => import("./workspaces/workspace-teacher-whiteboard"),
  () => import("./workspaces/workspace-marketing-studio"),
  () => import("./workspaces/workspace-automation-flow"),
  () => import("./workspaces/workspace-designer-image"),
  () => import("./workspaces/workspace-creator-audio"),
  () => import("./workspaces/workspace-creator-video"),
  () => import("./workspaces/workspace-automotive-garage"),
  () => import("./workspaces/workspace-juridico"),
  () => import("./workspaces/workspace-assistente-tecnico"),
  () => import("./workspaces/workspace-personal-assistant"),
  () => import("./workspaces/workspace-home-ia"),
  () => import("./workspaces/workspace-cyber-security"),
  () => import("./workspaces/workspace-group-feed"),
  () => import("./workspaces/workspace-career"),
  () => import("./workspaces/workspace-telemetry-dashboard"),
  () => import("./workspaces/workspace-shield-secrets"),
  () => import("./workspaces/workspace-finance-real"),
  () => import("./workspaces/workspace-orun-music"),
  () => import("./workspaces/workspace-suporte"),
  () => import("./workspaces/workspace-orun-code"),
];
