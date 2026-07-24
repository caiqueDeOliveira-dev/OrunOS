// plugins/types.ts
//
// Core type definitions for the Orun OS Workspace Plugin System.
// Every workspace plugin must implement this interface.

import type { ComponentType, LazyExoticComponent } from "react";

// ── Plugin Tab ──────────────────────────────────────────────────────────
// A workspace can have multiple tabs (e.g., Creator has Audio + Video).

export interface PluginTab {
  id: string;
  label: string;
  icon: string; // Lucide icon name
}

// ── Plugin Requirements ─────────────────────────────────────────────────
// Used to check if the user's device can run this plugin.

export interface PluginRequirements {
  /** Minimum RAM in MB required to run this plugin */
  minRamMB: number;
  /** Estimated RAM usage when running */
  estimatedRAMMB: number;
  /** Browser features required (e.g., "web-audio", "webgl", "offscreen-canvas") */
  features: string[];
}

// ── Plugin Components ───────────────────────────────────────────────────
// Lazy-loaded React components that make up the workspace UI.

export interface PluginComponents {
  /** Main workspace component (the editor/viewer) */
  workspace: LazyExoticComponent<ComponentType<WorkspaceProps>>;
  /** Optional toolbar component (rendered above the workspace) */
  toolbar?: LazyExoticComponent<ComponentType<ToolbarProps>>;
  /** Optional sidebar component (rendered to the left of workspace) */
  sidebar?: LazyExoticComponent<ComponentType<SidebarProps>>;
}

// ── Workspace Context ───────────────────────────────────────────────────
// Props passed to every workspace component by the PluginShell.

export interface WorkspaceProps {
  /** The plugin instance */
  plugin: WorkspacePlugin;
  /** Active tab ID (if plugin has tabs) */
  activeTab: string | null;
  /** Switch to a different tab */
  onTabChange: (tabId: string) => void;
  /** Send a message to the chat (as if the user typed it) */
  onSendMessage: (message: string) => void;
  /** Last tool result from the chat (for workspace to react to) */
  lastToolResult: { toolName: string; result: unknown } | null;
}

export interface ToolbarProps {
  plugin: WorkspacePlugin;
  activeTab: string | null;
  onTabChange: (tabId: string) => void;
}

export interface SidebarProps {
  plugin: WorkspacePlugin;
  activeTab: string | null;
}

// ── Plugin Lifecycle Events ─────────────────────────────────────────────

export interface PluginLifecycle {
  /** Called when the plugin workspace is mounted */
  onMount?: () => void;
  /** Called when the plugin workspace is unmounted */
  onUnmount?: () => void;
  /** Called when the user sends a chat message (optional interception) */
  onChatMessage?: (message: string) => void;
  /** Called when a tool result comes back from the AI */
  onToolResult?: (toolName: string, result: unknown) => void;
}

// ── Workspace Plugin (main interface) ───────────────────────────────────

export interface WorkspacePlugin {
  /** Unique identifier (matches agent name: "Developer", "Creator", etc.) */
  id: string;
  /** Display name */
  name: string;
  /** Semver version */
  version: string;
  /** Short description shown in settings */
  description: string;
  /** Lucide icon name */
  icon: string;
  /** Device requirements */
  requirements: PluginRequirements;
  /** Available tabs (null = single workspace, no tabs) */
  tabs: PluginTab[] | null;
  /** React components */
  components: PluginComponents;
  /** Lifecycle hooks */
  lifecycle?: PluginLifecycle;
}

// ── Plugin State (persisted per plugin) ─────────────────────────────────

export interface PluginState {
  /** Plugin ID */
  id: string;
  /** Whether the user has enabled this plugin */
  enabled: boolean;
  /** Which tab is active (if plugin has tabs) */
  activeTab: string | null;
  /** Plugin-specific settings (key-value) */
  settings: Record<string, unknown>;
}

// ── Plugin Manifest (for manifest.json files) ───────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  author: string;
  requirements: PluginRequirements;
  tabs: Array<{ id: string; label: string; icon: string }> | null;
  entryPoint: string;
  minOrunVersion: string;
}

// ── Compatibility Check Result ──────────────────────────────────────────

export interface CompatibilityResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  deviceRAM: number;
  availableRAM: number;
}
