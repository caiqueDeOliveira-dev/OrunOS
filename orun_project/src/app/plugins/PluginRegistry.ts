// plugins/PluginRegistry.ts
//
// Central registry for workspace plugins.
// Plugins register themselves at import time; the host queries this registry
// to find out which plugins are available and which are enabled.

import type { WorkspacePlugin, PluginState } from "./types";
import { checkCompatibility, type CompatibilityResult } from "./lib/compatibility";

// ── Registry ────────────────────────────────────────────────────────────

const pluginMap = new Map<string, WorkspacePlugin>();

/** Register a workspace plugin. Called by each plugin's index.ts at import time. */
export function registerPlugin(plugin: WorkspacePlugin): void {
  if (pluginMap.has(plugin.id)) {
    console.warn(`[PluginRegistry] Plugin "${plugin.id}" is already registered — overwriting.`);
  }
  pluginMap.set(plugin.id, plugin);
}

/** Get a registered plugin by agent ID. */
export function getPlugin(agentId: string): WorkspacePlugin | undefined {
  return pluginMap.get(agentId);
}

/** Get all registered plugins. */
export function getAllPlugins(): WorkspacePlugin[] {
  return Array.from(pluginMap.values());
}

/** Check if a plugin is registered for the given agent. */
export function hasPlugin(agentId: string): boolean {
  return pluginMap.has(agentId);
}

// ── Plugin State (enabled/disabled per user preference) ─────────────────

const STORAGE_KEY = "orun-plugin-states";

function loadStates(): Record<string, PluginState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStates(states: Record<string, PluginState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {
    // localStorage may be full or unavailable
  }
}

/** Check if a plugin is enabled by the user. */
export function isPluginEnabled(pluginId: string): boolean {
  const states = loadStates();
  const state = states[pluginId];
  if (!state) {
    // Default: enabled if registered (first time)
    return true;
  }
  return state.enabled;
}

/** Enable or disable a plugin. */
export function setPluginEnabled(pluginId: string, enabled: boolean): void {
  const states = loadStates();
  states[pluginId] = {
    ...states[pluginId],
    id: pluginId,
    enabled,
    activeTab: states[pluginId]?.activeTab ?? null,
    settings: states[pluginId]?.settings ?? {},
  };
  saveStates(states);
}

/** Get the active tab for a plugin. */
export function getPluginActiveTab(pluginId: string): string | null {
  const states = loadStates();
  return states[pluginId]?.activeTab ?? null;
}

/** Set the active tab for a plugin. */
export function setPluginActiveTab(pluginId: string, tabId: string | null): void {
  const states = loadStates();
  const prev = states[pluginId] ?? { id: pluginId, enabled: true, activeTab: null, settings: {} };
  states[pluginId] = { ...prev, activeTab: tabId };
  saveStates(states);
}

/** Get plugin-specific settings. */
export function getPluginSettings(pluginId: string): Record<string, unknown> {
  const states = loadStates();
  return states[pluginId]?.settings ?? {};
}

/** Update plugin-specific settings. */
export function setPluginSettings(pluginId: string, settings: Record<string, unknown>): void {
  const states = loadStates();
  const prev = states[pluginId] ?? { id: pluginId, enabled: true, activeTab: null, settings: {} };
  states[pluginId] = { ...prev, settings: { ...prev.settings, ...settings } };
  saveStates(states);
}

// ── Compatibility ───────────────────────────────────────────────────────

const compatibilityCache = new Map<string, CompatibilityResult>();

/** Get compatibility result for a plugin (cached). */
export function getPluginCompatibility(pluginId: string): CompatibilityResult | undefined {
  const plugin = pluginMap.get(pluginId);
  if (!plugin) return undefined;

  const cached = compatibilityCache.get(pluginId);
  if (cached) return cached;

  const result = checkCompatibility(plugin.requirements);
  compatibilityCache.set(pluginId, result);
  return result;
}

/** Clear compatibility cache (e.g., after device changes). */
export function clearCompatibilityCache(): void {
  compatibilityCache.clear();
}

// ── Agent → Plugin Mapping ──────────────────────────────────────────────

/** Maps each agent name to its workspace plugin ID. */
const AGENT_PLUGIN_MAP: Record<string, string> = {
  System: "System",
  Health: "Health",
  Finance: "Finance",
  Developer: "Developer",
  Marketing: "Marketing",
  Designer: "Designer",
  Creator: "Creator_Audio",
  Teacher: "Teacher",
  Automation: "Automation",
  Automotive: "Automotive",
};

/** Get the workspace plugin ID for a given agent name. Returns undefined if no workspace exists. */
export function getPluginForAgent(agentName: string): string | undefined {
  return AGENT_PLUGIN_MAP[agentName];
}

/** Get the workspace plugin ID for a given agent name, or null if no workspace exists. */
export function getWorkspacePluginId(agentName: string): string | null {
  return AGENT_PLUGIN_MAP[agentName] ?? null;
}
