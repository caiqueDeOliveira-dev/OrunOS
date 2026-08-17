"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthAwareSecretStore = void 0;
const registry_1 = require("../providers/registry");
/**
 * Implementação real de IAiSecretStore usada em produção:
 * - providers com authMethod "api-key" -> delega pro apiKeyStore (Electron
 *   safeStorage / expo-secure-store, injetado de fora)
 * - providers com authMethod "oauth"   -> pede token válido ao
 *   OAuthFlowManager, que renova sozinho se estiver expirando
 */
class OAuthAwareSecretStore {
    apiKeyStore;
    oauthManager;
    constructor(apiKeyStore, oauthManager) {
        this.apiKeyStore = apiKeyStore;
        this.oauthManager = oauthManager;
    }
    async getCredential(providerId, accountLabel) {
        const providerDef = (0, registry_1.getProvider)(providerId);
        if (providerDef.authMethod === "oauth") {
            try {
                const accessToken = await this.oauthManager.getValidAccessToken(providerId, accountLabel);
                return { oauthAccessToken: accessToken };
            }
            catch {
                return null; // não autenticado — o router trata como step indisponível e cai pro próximo
            }
        }
        if (providerDef.authMethod === "none")
            return {};
        return this.apiKeyStore.getCredential(providerId, accountLabel);
    }
    async setCredential(providerId, credential, accountLabel) {
        const providerDef = (0, registry_1.getProvider)(providerId);
        if (providerDef.authMethod === "oauth") {
            throw new Error(`Provider "${providerId}" usa OAuth — use OAuthFlowManager.exchangeCodeForToken(), não setCredential().`);
        }
        return this.apiKeyStore.setCredential(providerId, credential, accountLabel);
    }
}
exports.OAuthAwareSecretStore = OAuthAwareSecretStore;
//# sourceMappingURL=oauth-aware-secret-store.js.map