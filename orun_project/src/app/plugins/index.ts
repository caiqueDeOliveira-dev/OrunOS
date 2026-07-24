// plugins/index.ts
//
// Public API for the Orun OS Workspace Plugin System.
// Import everything from here.

// Types
export type {
  WorkspacePlugin,
  PluginTab,
  PluginRequirements,
  PluginComponents,
  PluginLifecycle,
  WorkspaceProps,
  ToolbarProps,
  SidebarProps,
  PluginState,
  PluginManifest,
  CompatibilityResult,
} from "./types";

// Registry
export {
  registerPlugin,
  getPlugin,
  getAllPlugins,
  hasPlugin,
  isPluginEnabled,
  setPluginEnabled,
  getPluginActiveTab,
  setPluginActiveTab,
  getPluginSettings,
  setPluginSettings,
  getPluginCompatibility,
  clearCompatibilityCache,
  getPluginForAgent,
  getWorkspacePluginId,
} from "./PluginRegistry";

// Components
export { PluginHost } from "./PluginHost";
export { PluginShell } from "./PluginShell";
export { PluginErrorBoundary } from "./PluginErrorBoundary";
export { PluginSettings } from "./PluginSettings";

// Utilities
export { createPluginLogger, setPluginLogLevel } from "./lib/logger";
export { checkCompatibility, getDeviceSummary } from "./lib/compatibility";
export { createStore } from "./lib/store";
export { initKeyboardShortcuts, useWorkspaceShortcuts } from "./lib/keyboard-shortcuts";
