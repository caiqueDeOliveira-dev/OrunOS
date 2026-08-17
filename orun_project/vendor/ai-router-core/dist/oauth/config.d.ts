import type { ProviderId } from "../schema";
export interface OAuthProviderConfig {
    providerId: ProviderId;
    authorizeUrl: string;
    tokenUrl: string;
    clientId: string;
    scopes: string[];
    redirectUri: string;
    usesPkce: boolean;
}
export interface OAuthTokenSet {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    scope?: string;
}
/**
 * Config por provider OAuth. Os client IDs abaixo são placeholders —
 * cada ferramenta (Claude Code, Cursor, etc) tem seu próprio client_id
 * público de app desktop; você troca aqui quando for integrar de verdade.
 * O que importa pro fluxo genérico é a FORMA (PKCE, endpoints, escopos).
 */
export declare const OAUTH_PROVIDER_CONFIGS: Partial<Record<ProviderId, OAuthProviderConfig>>;
export declare function getOAuthConfig(providerId: ProviderId): OAuthProviderConfig;
