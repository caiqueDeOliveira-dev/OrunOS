/**
 * Voice command detection — matches spoken text against predefined commands
 * and returns structured results. Supports PT/EN/ES.
 */
export interface VoiceCommand {
  id: string;
  patterns: RegExp[];
  action: "stop" | "repeat" | "send_whatsapp" | "save" | "cancel" | "clear" | "help";
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
];

export interface CommandMatch {
  command: VoiceCommand;
  match: string;
  confidence: number;
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
          bestMatch = { command: cmd, match: match[0], confidence };
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
