/**
 * Lê um Response com body streamável e produz linhas de texto uma a uma —
 * serve tanto pra SSE (`data: {...}`) quanto NDJSON (Ollama, uma linha =
 * um JSON), já que ambos são "delimitado por quebra de linha" no fundo.
 */
export declare function readStreamLines(response: Response): AsyncGenerator<string>;
