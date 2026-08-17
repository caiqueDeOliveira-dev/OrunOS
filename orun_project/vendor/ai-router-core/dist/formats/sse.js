"use strict";
/**
 * Codifica um objeto como um evento SSE (Server-Sent Events).
 * Suporta os dois estilos usados pelas APIs alvo:
 *  - OpenAI: só `data: <json>` + linha em branco
 *  - Anthropic: `event: <tipo>` + `data: <json>` + linha em branco
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseData = sseData;
exports.sseEvent = sseEvent;
exports.sseDone = sseDone;
function sseData(data) {
    return `data: ${JSON.stringify(data)}\n\n`;
}
function sseEvent(event, data) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
/** Marcador de fim de stream no formato OpenAI. */
function sseDone() {
    return "data: [DONE]\n\n";
}
//# sourceMappingURL=sse.js.map