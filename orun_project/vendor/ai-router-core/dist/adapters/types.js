"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderCallError = void 0;
exports.isTransientServerStatus = isTransientServerStatus;
class ProviderCallError extends Error {
    providerId;
    statusCode;
    isRateLimit;
    isQuotaExhausted;
    isServerError;
    constructor(message, providerId, statusCode, isRateLimit = false, isQuotaExhausted = false, 
    /** 5xx (ou 408) — falha transitória do lado do provider, vale retry com backoff. */
    isServerError = false) {
        super(message);
        this.providerId = providerId;
        this.statusCode = statusCode;
        this.isRateLimit = isRateLimit;
        this.isQuotaExhausted = isQuotaExhausted;
        this.isServerError = isServerError;
        this.name = "ProviderCallError";
    }
}
exports.ProviderCallError = ProviderCallError;
/** true pra status HTTP que indicam falha momentânea do provider (não do request em si). */
function isTransientServerStatus(status) {
    return status === 408 || (status >= 500 && status < 600);
}
//# sourceMappingURL=types.js.map