export interface ModelPricing {
    /** USD por 1.000 tokens de entrada (prompt) */
    inputPer1k: number;
    /** USD por 1.000 tokens de saída (completion) */
    outputPer1k: number;
}
export declare function estimateCostUsd(providerId: string, model: string, promptTokens: number, completionTokens: number): number;
/** true se o preço vem de um número específico do modelo (não do fallback genérico). */
export declare function hasKnownPricing(providerId: string, model: string): boolean;
