import type { ISecureTokenStore } from '../storage/ISecureTokenStore';
import type { LicenseValidationResult } from '../types';
export interface LicenseManagerConfig {
    tokenStore: ISecureTokenStore;
    /**
     * Chave pública (formato SPKI PEM) usada para verificar a assinatura
     * localmente, sem rede. Não é segredo — pode ser embutida no bundle do
     * app. A chave privada correspondente só existe na Edge Function
     * `issue-license` (Supabase secret).
     */
    publicKeyPem: string;
    /** Dias de tolerância offline após expiresAt antes de degradar o app. Default: 3. */
    gracePeriodDays?: number;
    /**
     * Função que chama a Edge Function `issue-license` para renovar o token.
     * Deve retornar o JWT assinado em texto puro. Lançar erro se offline —
     * o LicenseManager trata isso como "sem rede" e cai no grace period.
     */
    fetchFreshLicense: () => Promise<string>;
}
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
export declare class LicenseManager {
    private readonly config;
    private publicKey;
    constructor(config: LicenseManagerConfig);
    private getPublicKey;
    /** Verifica um JWT específico (assinatura + expiração), sem tocar em rede. */
    verify(token: string): Promise<LicenseValidationResult>;
    private mapPayload;
    private extractPayloadFromExpiredError;
    /** Lê o token cacheado localmente e valida sem rede. Uso: boot do app. */
    validateCached(): Promise<LicenseValidationResult>;
    /**
     * Tenta renovar a licença via rede. Em caso de falha (offline), não
     * lança — retorna o resultado da validação do token cacheado (que pode
     * cair em grace_period). Chamar isto periodicamente, não só no boot.
     */
    refresh(): Promise<LicenseValidationResult>;
    clear(): Promise<void>;
}
//# sourceMappingURL=LicenseManager.d.ts.map