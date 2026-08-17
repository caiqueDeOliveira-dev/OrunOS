"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRtk = applyRtk;
const compressor_1 = require("./compressor");
/**
 * Comprime o conteúdo de mensagens `role: "tool"` (resultado de git diff,
 * grep, ls/tree etc que o agente injetou na conversa) — mensagens de
 * user/assistant/system nunca são tocadas, porque normalmente são texto
 * que o próprio humano ou modelo escreveu, não output bruto de ferramenta.
 */
function applyRtk(messages) {
    let messagesCompressed = 0;
    let charsBefore = 0;
    let charsAfter = 0;
    const compressed = messages.map((m) => {
        if (m.role !== "tool")
            return m;
        const result = (0, compressor_1.compressToolOutput)(m.content);
        charsBefore += result.originalChars;
        charsAfter += result.compressedChars;
        if (result.kind !== "unchanged")
            messagesCompressed += 1;
        return { ...m, content: result.content };
    });
    return { messages: compressed, stats: { messagesCompressed, charsBefore, charsAfter } };
}
//# sourceMappingURL=apply-rtk.js.map