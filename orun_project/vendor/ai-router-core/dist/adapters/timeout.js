"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEOUT_MS = void 0;
exports.createTimeoutController = createTimeoutController;
/**
 * Combina um AbortSignal externo (se houver) com um timeout — usado por
 * todos os adapters pra garantir que nenhuma chamada fica pendurada pra
 * sempre se um provider travar a conexão sem responder nem dar erro.
 */
function createTimeoutController(timeoutMs, externalSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`Timeout após ${timeoutMs}ms sem resposta`)), timeoutMs);
    const onExternalAbort = () => controller.abort(externalSignal?.reason);
    if (externalSignal) {
        if (externalSignal.aborted)
            controller.abort(externalSignal.reason);
        else
            externalSignal.addEventListener("abort", onExternalAbort);
    }
    return {
        signal: controller.signal,
        dispose() {
            clearTimeout(timer);
            externalSignal?.removeEventListener("abort", onExternalAbort);
        },
    };
}
exports.DEFAULT_TIMEOUT_MS = 30_000;
//# sourceMappingURL=timeout.js.map