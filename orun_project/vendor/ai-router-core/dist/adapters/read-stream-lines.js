"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStreamLines = readStreamLines;
/**
 * Lê um Response com body streamável e produz linhas de texto uma a uma —
 * serve tanto pra SSE (`data: {...}`) quanto NDJSON (Ollama, uma linha =
 * um JSON), já que ambos são "delimitado por quebra de linha" no fundo.
 */
async function* readStreamLines(response) {
    const reader = response.body?.getReader();
    if (!reader)
        throw new Error("Response sem body — não é possível fazer streaming.");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line)
                yield line;
        }
    }
    const rest = buffer.trim();
    if (rest)
        yield rest;
}
//# sourceMappingURL=read-stream-lines.js.map