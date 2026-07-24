// plugins/lib/compatibility.ts
//
// Device compatibility checking for workspace plugins.
// Verifies RAM, browser features, and estimated resource usage.

import type { PluginRequirements, CompatibilityResult } from "../types";

export type { CompatibilityResult } from "../types";

/** Detect available device RAM in MB (falls back to 4GB if API unavailable). */
function getDeviceRAMMB(): number {
  // navigator.deviceMemory is Chrome-only, returns GB as a number
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  if (deviceMemory && deviceMemory > 0) return deviceMemory * 1024;
  // Fallback: assume 4GB
  return 4096;
}

/** Estimate available RAM as ~60% of total (OS and other apps use the rest). */
function getAvailableRAMMB(): number {
  return Math.floor(getDeviceRAMMB() * 0.6);
}

/** Check if a browser feature is available. */
function hasFeature(feature: string): boolean {
  switch (feature) {
    case "web-audio":
      return typeof AudioContext !== "undefined" || typeof (window as unknown as Record<string, unknown>).webkitAudioContext !== "undefined";
    case "webgl":
      try {
        const canvas = document.createElement("canvas");
        return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"));
      } catch {
        return false;
      }
    case "webgl2":
      try {
        const canvas = document.createElement("canvas");
        return !!canvas.getContext("webgl2");
      } catch {
        return false;
      }
    case "offscreen-canvas":
      return typeof OffscreenCanvas !== "undefined";
    case "web-workers":
      return typeof Worker !== "undefined";
    case "shared-array-buffer":
      return typeof SharedArrayBuffer !== "undefined";
    case "media-devices":
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    case "clipboard":
      return navigator.clipboard !== undefined;
    case "file-system-access":
      return typeof (window as unknown as Record<string, unknown>).showOpenFilePicker === "function";
    default:
      return false;
  }
}

/**
 * Check if the user's device can run a plugin with the given requirements.
 *
 * - Errors: plugin CANNOT run (missing critical features or too little RAM)
 * - Warnings: plugin CAN run but may be slow or degraded
 */
export function checkCompatibility(requirements: PluginRequirements): CompatibilityResult {
  const deviceRAM = getDeviceRAMMB();
  const availableRAM = getAvailableRAMMB();
  const errors: string[] = [];
  const warnings: string[] = [];

  // RAM check
  if (requirements.minRamMB > availableRAM) {
    errors.push(
      `RAM insuficiente: precisa de ${requirements.minRamMB}MB, apenas ${availableRAM}MB disponível`
    );
  } else if (requirements.estimatedRAMMB > availableRAM * 0.8) {
    warnings.push(
      `RAM pode ser insuficiente: plugin usa ~${requirements.estimatedRAMMB}MB, ${availableRAM}MB disponível`
    );
  }

  // Feature checks
  for (const feature of requirements.features) {
    if (!hasFeature(feature)) {
      errors.push(`Recurso do navegador não disponível: ${feature}`);
    }
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    deviceRAM,
    availableRAM,
  };
}

/**
 * Returns a human-readable summary of device capabilities.
 */
export function getDeviceSummary(): {
  ramMB: number;
  features: Record<string, boolean>;
} {
  const features = ["web-audio", "webgl", "webgl2", "offscreen-canvas", "web-workers", "media-devices", "clipboard", "file-system-access"];
  const featureMap: Record<string, boolean> = {};
  for (const f of features) {
    featureMap[f] = hasFeature(f);
  }
  return {
    ramMB: getDeviceRAMMB(),
    features: featureMap,
  };
}
