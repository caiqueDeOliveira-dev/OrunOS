// plugins/lib/logger.ts
//
// Structured logger for workspace plugins.
// Every log entry is prefixed with the plugin ID for easy filtering.

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  pluginId: string;
  event: string;
  data?: unknown;
  error?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = "debug";

function formatEntry(entry: LogEntry): string {
  const prefix = `[plugin:${entry.pluginId}]`;
  const ts = entry.timestamp;
  if (entry.error) {
    return `${ts} [${entry.level.toUpperCase()}] ${prefix} ${entry.event} — ${entry.error}`;
  }
  return `${ts} [${entry.level.toUpperCase()}] ${prefix} ${entry.event}`;
}

function emit(level: LogLevel, pluginId: string, event: string, data?: unknown, error?: string) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    pluginId,
    event,
    data,
    error,
  };

  const msg = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(msg, data ?? "");
      break;
    case "warn":
      console.warn(msg, data ?? "");
      break;
    case "debug":
      console.debug(msg, data ?? "");
      break;
    default:
      console.log(msg, data ?? "");
  }
}

export interface PluginLogger {
  debug: (event: string, data?: unknown) => void;
  info: (event: string, data?: unknown) => void;
  warn: (event: string, data?: unknown) => void;
  error: (event: string, data?: unknown) => void;
}

/**
 * Creates a scoped logger for a specific plugin.
 *
 * @example
 * const log = createPluginLogger("creator-audio");
 * log.info("track:volume-change", { trackId: "vocal", from: 0.7, to: 0.8 });
 * log.warn("web-audio", "AudioContext suspended by browser policy");
 * log.error("render", "Failed to decode audio buffer", { url, error });
 */
export function createPluginLogger(pluginId: string): PluginLogger {
  return {
    debug: (event: string, data?: unknown) => emit("debug", pluginId, event, data),
    info: (event: string, data?: unknown) => emit("info", pluginId, event, data),
    warn: (event: string, data?: unknown) => emit("warn", pluginId, event, data),
    error: (event: string, data?: unknown) => emit("error", pluginId, event, data),
  };
}

/** Set minimum log level for all plugin loggers. */
export function setPluginLogLevel(level: LogLevel) {
  minLevel = level;
}
