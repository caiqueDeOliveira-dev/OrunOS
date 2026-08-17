export interface CompressionResult {
    content: string;
    originalChars: number;
    compressedChars: number;
    kind: "diff" | "tree" | "grep" | "generic" | "unchanged";
}
export interface RtkOptions {
    genericMaxChars: number;
    minCharsToConsider: number;
}
/**
 * Detecta o "tipo" de conteúdo (diff/tree/grep/genérico) por heurística simples
 * e aplica a compressão adequada. Sempre idempotente e nunca corta informação
 * "no meio de uma palavra" de forma perigosa — só reduz volume de contexto
 * repetitivo, nunca o conteúdo que provavelmente importa (as próprias mudanças).
 */
export declare function compressToolOutput(content: string, options?: Partial<RtkOptions>): CompressionResult;
