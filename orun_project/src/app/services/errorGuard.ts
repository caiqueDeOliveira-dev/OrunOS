const STORAGE_KEY = "orun-error-guard";

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  type: "error" | "bug" | "suggestion" | "improvement";
  title: string;
  description: string;
  stack?: string;
  componentStack?: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  resolution?: string;
}

export interface SuggestionEntry {
  id: string;
  timestamp: string;
  type: "suggestion" | "improvement";
  title: string;
  description: string;
  implemented: boolean;
}

interface ErrorGuardData {
  errors: ErrorLogEntry[];
  suggestions: SuggestionEntry[];
}

function load(): ErrorGuardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* localStorage unavailable */ }
  return { errors: [], suggestions: [] };
}

function save(data: ErrorGuardData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* localStorage unavailable */ }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const ErrorGuard = {
  logError(error: Error, componentStack?: string, metadata?: Record<string, unknown>): ErrorLogEntry {
    const data = load();
    const entry: ErrorLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: "error",
      title: error.message || "Erro desconhecido",
      description: error.message || "Nenhuma descrição disponível",
      stack: error.stack,
      componentStack,
      metadata,
      resolved: false,
    };
    data.errors.push(entry);
    save(data);
    console.warn("[ErrorGuard] Erro registrado:", entry.title);
    return entry;
  },

  logBug(title: string, description: string, metadata?: Record<string, unknown>): ErrorLogEntry {
    const data = load();
    const entry: ErrorLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: "bug",
      title,
      description,
      metadata,
      resolved: false,
    };
    data.errors.push(entry);
    save(data);
    return entry;
  },

  addSuggestion(title: string, description: string): SuggestionEntry {
    const data = load();
    const entry: SuggestionEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: "suggestion",
      title,
      description,
      implemented: false,
    };
    data.suggestions.push(entry);
    save(data);
    return entry;
  },

  markResolved(id: string, resolution?: string): void {
    const data = load();
    const error = data.errors.find((e) => e.id === id);
    if (error) {
      error.resolved = true;
      error.resolution = resolution || "Marcado como resolvido";
      save(data);
    }
  },

  markImplemented(id: string): void {
    const data = load();
    const suggestion = data.suggestions.find((s) => s.id === id);
    if (suggestion) {
      suggestion.implemented = true;
      save(data);
    }
  },

  getAll(): ErrorGuardData {
    return load();
  },

  getErrors(): ErrorLogEntry[] {
    return load().errors;
  },

  getSuggestions(): SuggestionEntry[] {
    return load().suggestions;
  },

  clear(): void {
    save({ errors: [], suggestions: [] });
  },

  exportJSON(): string {
    return JSON.stringify(load(), null, 2);
  },

  getStats() {
    const data = load();
    return {
      totalErrors: data.errors.length,
      resolvedErrors: data.errors.filter((e) => e.resolved).length,
      totalSuggestions: data.suggestions.length,
      implementedSuggestions: data.suggestions.filter((s) => s.implemented).length,
    };
  },
};
