import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "orun-personalization";
const WORKSPACE_NOTES_KEY = "orun-workspace-notes";
const WORKSPACE_GOALS_KEY = "orun-workspace-goals";
const WORKSPACE_STATS_KEY = "orun-workspace-stats";

interface PersonalizationData {
  userName: string;
  avatarInitials: string;
}

interface WorkspaceNotes {
  [workspaceId: string]: string;
}

interface WorkspaceGoals {
  [workspaceId: string]: { label: string; target: number; current: number }[];
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const DEFAULT_DATA: PersonalizationData = {
  userName: "Caiqu",
  avatarInitials: "DC",
};

export function usePersonalization() {
  const [data, setData] = useState<PersonalizationData>(() =>
    load(STORAGE_KEY, DEFAULT_DATA)
  );

  const greeting = getGreeting();

  const updateName = useCallback((name: string) => {
    const updated = { ...load(STORAGE_KEY, DEFAULT_DATA), userName: name, avatarInitials: name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() };
    setData(updated);
    save(STORAGE_KEY, updated);
  }, []);

  return { ...data, greeting, updateName };
}

export function useWorkspaceNotes(workspaceId: string) {
  const [notes, setNotes] = useState<string>(() => {
    const all = load<WorkspaceNotes>(WORKSPACE_NOTES_KEY, {});
    return all[workspaceId] || "";
  });

  const updateNotes = useCallback((text: string) => {
    setNotes(text);
    const all = load<WorkspaceNotes>(WORKSPACE_NOTES_KEY, {});
    all[workspaceId] = text;
    save(WORKSPACE_NOTES_KEY, all);
  }, [workspaceId]);

  return { notes, updateNotes };
}

export function useWorkspaceGoals(workspaceId: string) {
  const [goals, setGoals] = useState<{ label: string; target: number; current: number }[]>(() => {
    const all = load<WorkspaceGoals>(WORKSPACE_GOALS_KEY, {});
    return all[workspaceId] || [];
  });

  const updateGoals = useCallback((newGoals: { label: string; target: number; current: number }[]) => {
    setGoals(newGoals);
    const all = load<WorkspaceGoals>(WORKSPACE_GOALS_KEY, {});
    all[workspaceId] = newGoals;
    save(WORKSPACE_GOALS_KEY, all);
  }, [workspaceId]);

  const incrementGoal = useCallback((index: number) => {
    setGoals(prev => {
      const updated = prev.map((g, i) => i === index ? { ...g, current: Math.min(g.current + 1, g.target) } : g);
      const all = load<WorkspaceGoals>(WORKSPACE_GOALS_KEY, {});
      all[workspaceId] = updated;
      save(WORKSPACE_GOALS_KEY, all);
      return updated;
    });
  }, [workspaceId]);

  return { goals, updateGoals, incrementGoal };
}

export function useWorkspaceStats(workspaceId: string) {
  const [stats, setStats] = useState<Record<string, number>>(() => {
    const all = load<Record<string, Record<string, number>>>(WORKSPACE_STATS_KEY, {});
    return all[workspaceId] || {};
  });

  const logAction = useCallback((action: string) => {
    setStats(prev => {
      const updated = { ...prev, [action]: (prev[action] || 0) + 1 };
      const all = load<Record<string, Record<string, number>>>(WORKSPACE_STATS_KEY, {});
      all[workspaceId] = updated;
      save(WORKSPACE_STATS_KEY, all);
      return updated;
    });
  }, [workspaceId]);

  return { stats, logAction };
}
