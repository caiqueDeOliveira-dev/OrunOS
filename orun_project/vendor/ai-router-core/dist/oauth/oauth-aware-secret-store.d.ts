import type { ProviderId } from "../schema";
import type { ResolvedCredential } from "../adapters/types";
import type { IAiSecretStore } from "../store/interfaces";
import { OAuthFlowManager } from "./flow-manager";
/**
 * Implementação real de IAiSecretStore usada em produção:
 * - providers com authMethod "api-key" -> delega pro apiKeyStore (Electron
 *   safeStorage / expo-secure-store, injetado de fora)
 * - providers com authMethod "oauth"   -> pede token válido ao
 *   OAuthFlowManager, que renova sozinho se estiver expirando
 */
export declare class OAuthAwareSecretStore implements IAiSecretStore {
    private readonly apiKeyStore;
    private readonly oauthManager;
    constructor(apiKeyStore: IAiSecretStore, oauthManager: OAuthFlowManager);
    getCredential(providerId: ProviderId, accountLabel?: string): Promise<ResolvedCredential | null>;
    setCredential(providerId: ProviderId, credential: ResolvedCredential, accountLabel?: string): Promise<void>;
}
