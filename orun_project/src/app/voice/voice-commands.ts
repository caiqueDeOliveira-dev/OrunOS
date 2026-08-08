/**
 * Voice command detection — matches spoken text against predefined commands
 * and returns structured results. Supports PT/EN/ES.
 */
export type VoiceCommandAction =
  | "stop"
  | "repeat"
  | "send_whatsapp"
  | "save"
  | "cancel"
  | "clear"
  | "help"
  | "open";

export interface VoiceCommand {
  id: string;
  patterns: RegExp[];
  action: VoiceCommandAction;
}

export type OpenTarget =
  | "settings"
  | "agents"
  | "telegram"
  | "whatsapp"
  | "spotify"
  | "calendar"
  | "email"
  | "memory"
  | "files"
  | "projects"
  | "planner"
  | "agentHub"
  | "analytics";

/** Keywords (PT/EN) that map a spoken phrase to an app/panel destination. */
export const OPEN_TARGET_KEYWORDS: Record<OpenTarget, string[]> = {
  settings: ["configurações", "configuracoes", "config", "ajustes", "preferências", "preferencias", "settings"],
  agents: ["agentes", "assistentes", "agents"],
  telegram: ["telegram"],
  whatsapp: ["whatsapp", "zap"],
  spotify: ["spotify", "música", "musica", "tocar música", "tocar musica"],
  calendar: ["calendário", "calendario", "agenda"],
  email: ["email", "e-mail", "e-mail", "correio"],
  memory: ["memória", "memoria", "lembranças", "lembrancas"],
  files: ["arquivos", "arquivo", "pastas", "pasta"],
  projects: ["projetos", "workspaces", "workspace"],
  planner: ["planner", "planejador", "planejar", "tarefas", "plano"],
  agentHub: ["agent hub", "agente hub", "hub de agentes", "central de agentes", "central de agentes"],
  analytics: ["analytics", "análises", "analises", "dashboard", "métricas", "metricas", "relatório", "relatorio"],
};

/**
 * Extract which app/panel the user wants to open from the spoken text.
 * Looks for the first keyword that appears after an "open" verb.
 */
export function extractOpenTarget(text: string): OpenTarget | null {
  const normalized = text.toLowerCase().replace(/[^a-zà-ÿç\s]/g, " ").trim();
  for (const target of Object.keys(OPEN_TARGET_KEYWORDS) as OpenTarget[]) {
    for (const keyword of OPEN_TARGET_KEYWORDS[target]) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(normalized)) return target;
    }
  }
  return null;
}

const COMMANDS: VoiceCommand[] = [
  {
    id: "stop",
    patterns: [
      /\b(pare|para|parar|stop|halt|cancelar|cancel|fechar|shut up)\b/i,
    ],
    action: "stop",
  },
  {
    id: "repeat",
    patterns: [
      /\b(repetir|repete|repeat|say again|falar de novo|mais uma vez|once more)\b/i,
    ],
    action: "repeat",
  },
  {
    id: "send_whatsapp",
    patterns: [
      /\b(enviar? (pro|para|pro) whatsapp|mandar (pro|para|pro) whatsapp|send (to )?whatsapp|whatsapp)\b/i,
    ],
    action: "send_whatsapp",
  },
  {
    id: "save",
    patterns: [
      /\b(salvar|guardar|save|gravar|guardar isso|salvar isso)\b/i,
    ],
    action: "save",
  },
  {
    id: "cancel",
    patterns: [
      /\b(cancelar|esquece|never mind|forget it|não precisa|deixa pra lá|deixa)\b/i,
    ],
    action: "cancel",
  },
  {
    id: "clear",
    patterns: [
      /\b(limpar|clear|apagar|delete all|nova conversa|new chat)\b/i,
    ],
    action: "clear",
  },
  {
    id: "help",
    patterns: [
      /\b(ajuda|help|comandos|commands|o que (você|vc) faz|what can you do)\b/i,
    ],
    action: "help",
  },
  {
    id: "open",
    patterns: [
      /\b(abrir|abra|abre o|abre a|abre|open)\b/i,
    ],
    action: "open",
  },
];

export interface CommandMatch {
  command: VoiceCommand;
  match: string;
  confidence: number;
  /** Full normalized transcript the command was detected on. */
  text: string;
}

/**
 * Check if spoken text contains a voice command.
 * Returns null if no command detected, or the best match.
 */
export function detectVoiceCommand(text: string): CommandMatch | null {
  const normalized = text.toLowerCase().trim();
  let bestMatch: CommandMatch | null = null;

  for (const cmd of COMMANDS) {
    for (const pattern of cmd.patterns) {
      const match = normalized.match(pattern);
      if (match) {
        // Confidence: longer match = higher confidence
        const confidence = Math.min(match[0].length / normalized.length, 1);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { command: cmd, match: match[0], confidence, text: normalized };
        }
      }
    }
  }

  // Only return if confidence is reasonable (> 15% of the message)
  if (bestMatch && bestMatch.confidence > 0.15) return bestMatch;
  return null;
}

/**
 * Strip command text from a transcript, keeping only the natural language part.
 */
export function stripCommand(text: string, match: CommandMatch): string {
  return text.replace(match.match, "").trim();
}
