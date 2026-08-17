"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthFlowManager = void 0;
const config_1 = require("./config");
const pkce_1 = require("./pkce");
/**
 * 1. buildAuthorizationUrl() -> abre no navegador/webview do sistema
 * 2. o app captura o redirect (deep link `orun://oauth/...`) com `code` + `state`
 * 3. exchangeCodeForToken() -> troca por access+refresh token, salva no store
 * 4. getValidAccessToken() -> chamado pelo router antes de cada request;
 *    se o token expira em <60s, faz refresh sozinho antes de devolver
 */
class OAuthFlowManager {
    tokenStore;
    pending = new Map();
    constructor(tokenStore) {
        this.tokenStore = tokenStore;
    }
    async buildAuthorizationUrl(providerId) {
        const config = (0, config_1.getOAuthConfig)(providerId);
        const state = (0, pkce_1.generateState)();
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: "code",
            scope: config.scopes.join(" "),
            state,
        });
        let codeVerifier;
        if (config.usesPkce) {
            codeVerifier = (0, pkce_1.generateCodeVerifier)();
            const challenge = await (0, pkce_1.generateCodeChallenge)(codeVerifier);
            params.set("code_challenge", challenge);
            params.set("code_challenge_method", "S256");
        }
        this.pending.set(state, { providerId, codeVerifier });
        return { url: `${config.authorizeUrl}?${params.toString()}`, state, codeVerifier };
    }
    async exchangeCodeForToken(code, state, accountLabel) {
        const pending = this.pending.get(state);
        if (!pending)
            throw new Error("State OAuth desconhecido ou expirado — reinicie o login.");
        this.pending.delete(state);
        const config = (0, config_1.getOAuthConfig)(pending.providerId);
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirectUri,
            client_id: config.clientId,
        });
        if (pending.codeVerifier)
            body.set("code_verifier", pending.codeVerifier);
        const res = await fetch(config.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            body: body.toString(),
        });
        if (!res.ok) {
            throw new Error(`Falha ao trocar code por token (${pending.providerId}): HTTP ${res.status}`);
        }
        const data = (await res.json());
        const tokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
            scope: data.scope,
        };
        await this.tokenStore.saveTokenSet(pending.providerId, tokens, accountLabel);
        return tokens;
    }
    async refreshAccessToken(providerId, accountLabel) {
        const current = await this.tokenStore.getTokenSet(providerId, accountLabel);
        if (!current?.refreshToken) {
            throw new Error(`Sem refresh_token salvo pra "${providerId}" — é preciso fazer login novamente.`);
        }
        const config = (0, config_1.getOAuthConfig)(providerId);
        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: current.refreshToken,
            client_id: config.clientId,
        });
        const res = await fetch(config.tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            body: body.toString(),
        });
        if (!res.ok) {
            throw new Error(`Falha ao renovar token (${providerId}): HTTP ${res.status} — pode ser necessário logar de novo.`);
        }
        const data = (await res.json());
        const refreshed = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? current.refreshToken, // alguns providers não rotacionam o refresh_token
            expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
        };
        await this.tokenStore.saveTokenSet(providerId, refreshed, accountLabel);
        return refreshed;
    }
    /** Chamado pelo router antes de cada request — garante token válido, renovando se preciso. */
    async getValidAccessToken(providerId, accountLabel) {
        const current = await this.tokenStore.getTokenSet(providerId, accountLabel);
        if (!current)
            throw new Error(`Provider "${providerId}" não está autenticado — faça login primeiro.`);
        const expiresInMs = current.expiresAt - Date.now();
        if (expiresInMs > 60_000)
            return current.accessToken; // ainda válido por mais de 60s
        const refreshed = await this.refreshAccessToken(providerId, accountLabel);
        return refreshed.accessToken;
    }
}
exports.OAuthFlowManager = OAuthFlowManager;
//# sourceMappingURL=flow-manager.js.map