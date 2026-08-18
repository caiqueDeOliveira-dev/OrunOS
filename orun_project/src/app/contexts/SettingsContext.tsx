// src/app/contexts/SettingsContext.tsx
// React context + hooks para o @orun/settings bridge (schema validado).
// Compativel com o preload do Electron (window.orun.settings.schema*).

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type SettingsPath = string;

interface SettingsContextValue {
  /** Busca um valor por dot-path (ex: "core.theme") */
  get: <T = unknown>(path: SettingsPath) => Promise<T | undefined>;
  /** Define um valor por dot-path */
  set: <T = unknown>(path: SettingsPath, value: T) => Promise<boolean>;
  /** Busca todas as settings */
  getAll: () => Promise<Record<string, unknown> | null>;
  /** Reseta uma path (ou todas se vazio) para o default */
  reset: (path?: SettingsPath) => Promise<boolean>;
  /** Retorna o scope de uma path ("account" | "device") */
  getScope: (path: SettingsPath) => Promise<string | null>;
  /** Retorna todas as paths account-scoped */
  getAccountPaths: () => Promise<string[]>;
  /** Estado completo das settings (cache local, atualizado via subscribe) */
  settings: Record<string, unknown> | null;
  /** True enquanto o provider esta carregando as settings iniciais */
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Carrega todas as settings na montagem
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const all = await window.orun.settings.schemaGetAll();
        if (mountedRef.current && all) {
          setSettings(all as Record<string, unknown>);
        }
      } catch (err) {
        console.warn("[SettingsProvider] Falha ao carregar settings:", err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, []);

  const get = useCallback(async <T = unknown>(path: SettingsPath): Promise<T | undefined> => {
    return window.orun.settings.schemaGet<T>(path);
  }, []);

  const set = useCallback(async <T = unknown>(path: SettingsPath, value: T): Promise<boolean> => {
    const ok = await window.orun.settings.schemaSet(path, value);
    if (ok) {
      // Atualiza o cache local imediatamente
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        const parts = path.split(".");
        let cur: Record<string, unknown> = next;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (typeof cur[part] !== "object" || cur[part] === null) cur[part] = {};
          cur = cur[part] as Record<string, unknown>;
        }
        cur[parts[parts.length - 1]] = value;
        return next;
      });
    }
    return ok;
  }, []);

  const getAll = useCallback(async () => {
    return window.orun.settings.schemaGetAll();
  }, []);

  const reset = useCallback(async (path?: SettingsPath): Promise<boolean> => {
    const ok = await window.orun.settings.schemaReset(path);
    if (ok) {
      // Recarrega tudo apos reset
      const all = await window.orun.settings.schemaGetAll();
      if (all) setSettings(all as Record<string, unknown>);
    }
    return ok;
  }, []);

  const getScope = useCallback(async (path: SettingsPath): Promise<string | null> => {
    return window.orun.settings.schemaScope(path);
  }, []);

  const getAccountPaths = useCallback(async (): Promise<string[]> => {
    return window.orun.settings.schemaAccountPaths();
  }, []);

  const value: SettingsContextValue = {
    get,
    set,
    getAll,
    reset,
    getScope,
    getAccountPaths,
    settings,
    loading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Hook para ler/escrever uma setting especifica por dot-path.
 * Retorna { value, setValue, loading, error }.
 *
 * Exemplo:
 *   const { value: theme, setValue: setTheme } = useSetting<string>("core.theme");
 */
export function useSetting<T = unknown>(path: SettingsPath) {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSetting deve ser usado dentro de <SettingsProvider>");

  const [value, setValue] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Carrega o valor inicial
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const val = await ctx.get<T>(path);
        if (mountedRef.current) {
          setValue(val);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    })();
    return () => { mountedRef.current = false; };
  }, [path, ctx.get]);

  // Escuta mudanças no cache do provider
  useEffect(() => {
    if (!ctx.settings) return;
    const parts = path.split(".");
    let cur: unknown = ctx.settings;
    for (const part of parts) {
      if (cur == null || typeof cur !== "object") { cur = undefined; break; }
      cur = (cur as Record<string, unknown>)[part];
    }
    setValue(cur as T | undefined);
  }, [ctx.settings, path]);

  const updateValue = useCallback(async (newValue: T) => {
    try {
      setError(null);
      await ctx.set(path, newValue);
      // setValue ja acontece via efeito acima (ctx.settings muda)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [path, ctx.set]);

  return { value, setValue: updateValue, loading, error };
}

/**
 * Hook para resetar uma setting para o default.
 * Retorna uma funcao memoizada que, ao chamada, reseta a path.
 */
export function useResetSetting(path: SettingsPath) {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useResetSetting deve ser usado dentro de <SettingsProvider>");

  return useCallback(() => ctx.reset(path), [ctx.reset, path]);
}
