import type { ProviderId } from "../schema";
import { type OAuthTokenSet } from "./config";
export interface PendingAuthorization {
    url: string;
    state: string;
    codeVerifier?: string;
}
export interface IOAuthTokenStore {
    getTokenSet(providerId: ProviderId, accountLabel?: string): Promise<OAuthTokenSet | null>;
    saveTokenSet(providerId: ProviderId, tokens: OAuthTokenSet, accountLabel?: string): Promise<void>;
}
/**
 * 1. buildAuthorizationUrl() -> abre no navegador/webview do sistema
 * 2. o app captura o redirect (deep link `orun://oauth/...`) com `code` + `state`
 * 3. exchangeCodeForToken() -> troca por access+refresh token, salva no store
 * 4. getValidAccessToken() -> chamado pelo router antes de cada request;
 *    se o token expira em <60s, faz refresh sozinho antes de devolver
 */
export declare class OAuthFlowManager {
    private readonly tokenStore;
    private pending;
    constructor(tokenStore: IOAuthTokenStore);
    buildAuthorizationUrl(providerId: ProviderId): Promise<PendingAuthorization>;
    exchangeCodeForToken(code: string, state: string, accountLabel?: string): Promise<OAuthTokenSet>;
    refreshAccessToken(providerId: ProviderId, accountLabel?: string): Promise<OAuthTokenSet>;
    /** Chamado pelo router antes de cada request — garante token válido, renovando se preciso. */
    getValidAccessToken(providerId: ProviderId, accountLabel?: string): Promise<string>;
}
