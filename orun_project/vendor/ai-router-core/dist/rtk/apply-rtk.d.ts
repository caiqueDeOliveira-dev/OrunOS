import type { RouterMessage } from "../schema";
export interface RtkApplyStats {
    messagesCompressed: number;
    charsBefore: number;
    charsAfter: number;
}
/**
 * Comprime o conteúdo de mensagens `role: "tool"` (resultado de git diff,
 * grep, ls/tree etc que o agente injetou na conversa) — mensagens de
 * user/assistant/system nunca são tocadas, porque normalmente são texto
 * que o próprio humano ou modelo escreveu, não output bruto de ferramenta.
 */
export declare function applyRtk(messages: RouterMessage[]): {
    messages: RouterMessage[];
    stats: RtkApplyStats;
};
