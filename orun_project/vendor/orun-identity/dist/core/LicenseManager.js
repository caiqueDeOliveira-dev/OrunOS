"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseManager = void 0;
const jose_1 = require("jose");
const ISecureTokenStore_1 = require("../storage/ISecureTokenStore");
const DEFAULT_GRACE_PERIOD_DAYS = 3;
/**
 * Gerencia o ciclo de vida da licença offline no Desktop/TV: cacheia o JWT
 * localmente, valida a assinatura sem depender de rede, e aplica grace
 * period quando o token expirou mas o app não conseguiu revalidar online.
 *
 * Uso típico no boot do app:
 *   const result = await licenseManager.validateCached();
 *   if (result.status === 'expired' || result.status === 'invalid_signature') {
 *     // bloquear ou forçar novo login
 *   }
 *   if (result.status === 'grace_period') {
 *     // mostrar aviso discreto, mas deixar usar
 *   }
 */
class LicenseManager {
    constructor(config) {
        this.config = config;
        this.publicKey = null;
    }
    async getPublicKey() {
        if (!this.publicKey) {
            this.publicKey = await (0, jose_1.importSPKI)(this.config.publicKeyPem, 'RS256');
        }
        return this.publicKey;
    }
    /** Verifica um JWT específico (assinatura + expiração), sem tocar em rede. */
    async verify(token) {
        let payload;
        try {
            const publicKey = await this.getPublicKey();
            const { payload: raw } = await (0, jose_1.jwtVerify)(token, publicKey, { algorithms: ['RS256'] });
            payload = this.mapPayload(raw);
        }
        catch (err) {
            // jose valida a assinatura primeiro e só depois a expiração — um JWT
            // expirado mas assinado corretamente chega aqui como JWTExpired,
            // ainda carregando o payload já verificado (err.payload). Só um erro
            // de assinatura de fato (ou token malformado) deve virar invalid_signature.
            const claims = this.extractPayloadFromExpiredError(err);
            if (!claims)
                return { status: 'invalid_signature', payload: null };
            payload = claims;
        }
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (nowSeconds <= payload.expiresAt) {
            return { status: 'valid', payload };
        }
        const graceDays = this.config.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
        const graceDeadline = payload.expiresAt + graceDays * 86400;
        if (nowSeconds <= graceDeadline) {
            const graceDaysRemaining = Math.ceil((graceDeadline - nowSeconds) / 86400);
            return { status: 'grace_period', payload, graceDaysRemaining };
        }
        return { status: 'expired', payload };
    }
    mapPayload(raw) {
        return {
            tenantId: raw.tenantId,
            deviceId: raw.deviceId,
            planKey: raw.planKey,
            features: raw.features ?? {},
            issuedAt: raw.iat,
            expiresAt: raw.exp,
        };
    }
    extractPayloadFromExpiredError(err) {
        if (err &&
            typeof err === 'object' &&
            'code' in err &&
            err.code === 'ERR_JWT_EXPIRED' &&
            'payload' in err) {
            return this.mapPayload(err.payload);
        }
        return null;
    }
    /** Lê o token cacheado localmente e valida sem rede. Uso: boot do app. */
    async validateCached() {
        const cached = await this.config.tokenStore.getItem(ISecureTokenStore_1.TOKEN_STORE_KEYS.LICENSE_TOKEN);
        if (!cached)
            return { status: 'missing', payload: null };
        return this.verify(cached);
    }
    /**
     * Tenta renovar a licença via rede. Em caso de falha (offline), não
     * lança — retorna o resultado da validação do token cacheado (que pode
     * cair em grace_period). Chamar isto periodicamente, não só no boot.
     */
    async refresh() {
        try {
            const freshToken = await this.config.fetchFreshLicense();
            await this.config.tokenStore.setItem(ISecureTokenStore_1.TOKEN_STORE_KEYS.LICENSE_TOKEN, freshToken);
            return this.verify(freshToken);
        }
        catch {
            // Sem rede ou servidor indisponível — cai no que já está em cache.
            return this.validateCached();
        }
    }
    async clear() {
        await this.config.tokenStore.removeItem(ISecureTokenStore_1.TOKEN_STORE_KEYS.LICENSE_TOKEN);
        this.publicKey = null;
    }
}
exports.LicenseManager = LicenseManager;
//# sourceMappingURL=LicenseManager.js.map