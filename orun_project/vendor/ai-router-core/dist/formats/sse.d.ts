/**
 * Codifica um objeto como um evento SSE (Server-Sent Events).
 * Suporta os dois estilos usados pelas APIs alvo:
 *  - OpenAI: só `data: <json>` + linha em branco
 *  - Anthropic: `event: <tipo>` + `data: <json>` + linha em branco
 */
export declare function sseData(data: unknown): string;
export declare function sseEvent(event: string, data: unknown): string;
/** Marcador de fim de stream no formato OpenAI. */
export declare function sseDone(): string;
