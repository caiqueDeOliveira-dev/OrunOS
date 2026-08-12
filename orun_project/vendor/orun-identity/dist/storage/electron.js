"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronSecureTokenStore = void 0;
class ElectronSecureTokenStore {
    constructor(safeStorage, backend) {
        this.safeStorage = safeStorage;
        this.backend = backend;
        if (!this.safeStorage.isEncryptionAvailable()) {
            // Fail fast — não silenciar. Melhor o app avisar o usuário do que
            // gravar tokens sem criptografia real.
            throw new Error('[@orun/identity] safeStorage encryption indisponível nesta plataforma/SO.');
        }
    }
    async getItem(key) {
        const encrypted = await this.backend.read(key);
        if (!encrypted)
            return null;
        return this.safeStorage.decryptString(encrypted);
    }
    async setItem(key, value) {
        const encrypted = this.safeStorage.encryptString(value);
        await this.backend.write(key, encrypted);
    }
    async removeItem(key) {
        await this.backend.delete(key);
    }
    async clear() {
        await this.backend.clearAll();
    }
}
exports.ElectronSecureTokenStore = ElectronSecureTokenStore;
//# sourceMappingURL=electron.js.map