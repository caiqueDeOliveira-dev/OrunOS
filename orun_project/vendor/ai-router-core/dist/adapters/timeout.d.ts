export interface TimeoutController {
    signal: AbortSignal;
    dispose(): void;
}
/**
 * Combina um AbortSignal externo (se houver) com um timeout — usado por
 * todos os adapters pra garantir que nenhuma chamada fica pendurada pra
 * sempre se um provider travar a conexão sem responder nem dar erro.
 */
export declare function createTimeoutController(timeoutMs: number, externalSignal?: AbortSignal): TimeoutController;
export declare const DEFAULT_TIMEOUT_MS = 30000;
