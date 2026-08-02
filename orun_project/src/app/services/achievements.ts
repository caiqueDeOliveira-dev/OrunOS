interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  secret?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: number | null;
  progress: number;
  secret: boolean;
}

interface AchievementState {
  unlocked: boolean;
  unlockedAt: number | null;
  progress: number;
}

type AchievementMap = Record<string, AchievementState>;

const STORAGE_KEY = "orun-achievements";

const DEFINITIONS: AchievementDefinition[] = [
  { id: "first_message", name: "First Steps", description: "Send your first message", icon: "💬" },
  { id: "ten_messages", name: "Chatter", description: "Send 10 messages", icon: "🗣️" },
  { id: "hundred_messages", name: "Talkative", description: "Send 100 messages", icon: "📢" },
  { id: "all_agents", name: "Explorer", description: "Use every agent", icon: "🧭" },
  { id: "first_export", name: "Archivist", description: "Export a conversation", icon: "📦" },
  { id: "focus_mode", name: "Deep Work", description: "Enter focus mode 5 times", icon: "🎯" },
  { id: "konami", name: "Cheater", description: "Activate the Konami code", icon: "🕹️", secret: true },
  { id: "schedule_theme", name: "Time Keeper", description: "Use schedule theme for a day", icon: "⏰" },
  { id: "all_eggs", name: "Egg Hunter", description: "Find all easter eggs", icon: "🥚", secret: true },
];

function getState(): AchievementMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setState(state: AchievementMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDefaultState(): AchievementState {
  return { unlocked: false, unlockedAt: null, progress: 0 };
}

function notify(id: string): void {
  const def = DEFINITIONS.find(d => d.id === id);
  if (def) {
    console.log(`🏆 Achievement unlocked: ${def.icon} ${def.name} — ${def.description}`);
  }
}

export function unlock(id: string): void {
  const state = getState();
  const current = state[id] ?? getDefaultState();
  if (current.unlocked) return;
  state[id] = { ...current, unlocked: true, unlockedAt: Date.now(), progress: 100 };
  setState(state);
  notify(id);
}

export function progress(id: string, value: number): void {
  const state = getState();
  const current = state[id] ?? getDefaultState();
  if (current.unlocked) return;
  const clamped = Math.min(100, Math.max(0, value));
  state[id] = { ...current, progress: clamped };
  if (clamped >= 100) {
    state[id].unlocked = true;
    state[id].unlockedAt = Date.now();
    notify(id);
  }
  setState(state);
}

export function getAll(): Achievement[] {
  const state = getState();
  return DEFINITIONS.map(def => {
    const s = state[def.id] ?? getDefaultState();
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      secret: def.secret ?? false,
      unlocked: s.unlocked,
      unlockedAt: s.unlockedAt,
      progress: s.progress,
    };
  });
}

export function getUnlocked(): Achievement[] {
  return getAll().filter(a => a.unlocked);
}

export function getStats(): { unlocked: number; total: number; percentage: number } {
  const all = getAll();
  const unlocked = all.filter(a => a.unlocked).length;
  return {
    unlocked,
    total: all.length,
    percentage: Math.round((unlocked / all.length) * 100),
  };
}
