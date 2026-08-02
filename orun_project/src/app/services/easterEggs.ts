interface EggDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  secrets: string[];
}

export interface Egg {
  id: string;
  name: string;
  description: string;
  icon: string;
  discovered: boolean;
  secret: string;
}

const STORAGE_KEY = "orun-easter-eggs";

const EGGS: EggDefinition[] = [
  { id: "coffee", name: "Coffee Break", description: "Ask for a coffee", icon: "☕", secrets: ["quero um café", "give me coffee"] },
  { id: "hal", name: "HAL 9000", description: "Open the pod bay doors", icon: "🖥️", secrets: ["open the pod bay doors"] },
  { id: "42", name: "Deep Thought", description: "The answer to life, the universe and everything", icon: "🔢", secrets: ["answer to everything"] },
  { id: "konami", name: "Konami Code", description: "The legendary cheat code", icon: "🎮", secrets: ["konami code"] },
  { id: "matrix", name: "Red Pill", description: "How deep does the rabbit hole go?", icon: "💊", secrets: ["red pill"] },
];

function getStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStored(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function checkEasterEgg(text: string): string | null {
  const lower = text.toLowerCase().trim();
  const discovered = getStored();

  for (const egg of EGGS) {
    if (egg.secrets.some((s) => lower.includes(s))) {
      if (!discovered.includes(egg.id)) {
        discovered.push(egg.id);
        setStored(discovered);
      }
      return egg.id;
    }
  }
  return null;
}

export function getDiscovered(): string[] {
  return getStored();
}

export function getAll(): Egg[] {
  const discovered = getStored();
  return EGGS.map((egg) => ({
    id: egg.id,
    name: egg.name,
    description: egg.description,
    icon: egg.icon,
    secret: egg.secrets[0],
    discovered: discovered.includes(egg.id),
  }));
}
