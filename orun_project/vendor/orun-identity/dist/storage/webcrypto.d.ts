import type { ISecureTokenStore } from './ISecureTokenStore';
/**
 * Implementação para Tizen (OrunTV), usando Web Crypto (AES-GCM) já que a
 * plataforma não expõe um keychain nativo como Electron/Expo.
 *
 * A chave de criptografia é derivada uma vez e mantida em memória; os bytes
 * cifrados são persistidos em IndexedDB (via `backend`) para sobreviver a
 * reinícios do app.
 */
export interface KeyValueBackend {
    read(key: string): Promise<Uint8Array | null>;
    write(key: string, value: Uint8Array): Promise<void>;
    delete(key: string): Promise<void>;
    clearAll(): Promise<void>;
}
export declare class WebCryptoSecureTokenStore implements ISecureTokenStore {
    private readonly backend;
    private readonly subtle;
    private cryptoKey;
    constructor(backend: KeyValueBackend, subtle?: SubtleCrypto);
    /**
     * Deve ser chamado uma vez na inicialização do app, com uma chave derivada
     * de um segredo estável do dispositivo (ex: ID de hardware do Tizen, nunca
     * hardcoded). Sem isso, getItem/setItem lançam erro.
     */
    initialize(rawKeyMaterial: Uint8Array): Promise<void>;
    private requireKey;
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=webcrypto.d.ts.map