"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebCryptoSecureTokenStore = void 0;
const IV_LENGTH_BYTES = 12;
class WebCryptoSecureTokenStore {
    constructor(backend, subtle = crypto.subtle) {
        this.backend = backend;
        this.subtle = subtle;
        this.cryptoKey = null;
    }
    /**
     * Deve ser chamado uma vez na inicialização do app, com uma chave derivada
     * de um segredo estável do dispositivo (ex: ID de hardware do Tizen, nunca
     * hardcoded). Sem isso, getItem/setItem lançam erro.
     */
    async initialize(rawKeyMaterial) {
        this.cryptoKey = await this.subtle.importKey('raw', rawKeyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }
    requireKey() {
        if (!this.cryptoKey) {
            throw new Error('[@orun/identity] WebCryptoSecureTokenStore não inicializado — chame initialize() primeiro.');
        }
        return this.cryptoKey;
    }
    async getItem(key) {
        const stored = await this.backend.read(key);
        if (!stored)
            return null;
        const iv = stored.slice(0, IV_LENGTH_BYTES);
        const ciphertext = stored.slice(IV_LENGTH_BYTES);
        const plainBuffer = await this.subtle.decrypt({ name: 'AES-GCM', iv }, this.requireKey(), ciphertext);
        return new TextDecoder().decode(plainBuffer);
    }
    async setItem(key, value) {
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
        const encoded = new TextEncoder().encode(value);
        const ciphertext = await this.subtle.encrypt({ name: 'AES-GCM', iv }, this.requireKey(), encoded);
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(ciphertext), iv.length);
        await this.backend.write(key, combined);
    }
    async removeItem(key) {
        await this.backend.delete(key);
    }
    async clear() {
        await this.backend.clearAll();
    }
}
exports.WebCryptoSecureTokenStore = WebCryptoSecureTokenStore;
//# sourceMappingURL=webcrypto.js.map