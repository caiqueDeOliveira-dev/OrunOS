"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAUTH_PROVIDER_CONFIGS = void 0;
exports.getOAuthConfig = getOAuthConfig;
/**
 * Config por provider OAuth. Os client IDs abaixo são placeholders —
 * cada ferramenta (Claude Code, Cursor, etc) tem seu próprio client_id
 * público de app desktop; você troca aqui quando for integrar de verdade.
 * O que importa pro fluxo genérico é a FORMA (PKCE, endpoints, escopos).
 */
exports.OAUTH_PROVIDER_CONFIGS = {
    "claude-code": {
        providerId: "claude-code",
        authorizeUrl: "https://claude.ai/oauth/authorize",
        tokenUrl: "https://claude.ai/oauth/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["org:create_api_key", "user:profile", "user:inference"],
        redirectUri: "orun://oauth/claude-code/callback",
        usesPkce: true,
    },
    codex: {
        providerId: "codex",
        authorizeUrl: "https://auth.openai.com/oauth/authorize",
        tokenUrl: "https://auth.openai.com/oauth/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["openid", "profile", "offline_access"],
        redirectUri: "orun://oauth/codex/callback",
        usesPkce: true,
    },
    "github-copilot": {
        providerId: "github-copilot",
        authorizeUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["read:user", "copilot"],
        redirectUri: "orun://oauth/github-copilot/callback",
        usesPkce: false, // GitHub classic OAuth não usa PKCE por padrão
    },
    cursor: {
        providerId: "cursor",
        authorizeUrl: "https://cursor.sh/oauth/authorize",
        tokenUrl: "https://cursor.sh/oauth/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["inference"],
        redirectUri: "orun://oauth/cursor/callback",
        usesPkce: true,
    },
    kiro: {
        providerId: "kiro",
        authorizeUrl: "https://kiro.dev/oauth/authorize",
        tokenUrl: "https://kiro.dev/oauth/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["inference"],
        redirectUri: "orun://oauth/kiro/callback",
        usesPkce: true,
    },
    "vertex-ai": {
        providerId: "vertex-ai",
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        redirectUri: "orun://oauth/vertex-ai/callback",
        usesPkce: true,
    },
    antigravity: {
        providerId: "antigravity",
        authorizeUrl: "https://antigravity.dev/oauth/authorize",
        tokenUrl: "https://antigravity.dev/oauth/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["inference"],
        redirectUri: "orun://oauth/antigravity/callback",
        usesPkce: true,
    },
    kimchi: {
        providerId: "kimchi",
        authorizeUrl: "https://kimchi.ai/oauth/authorize",
        tokenUrl: "https://kimchi.ai/oauth/token",
        clientId: "REPLACE_WITH_REAL_CLIENT_ID",
        scopes: ["inference"],
        redirectUri: "orun://oauth/kimchi/callback",
        usesPkce: true,
    },
};
function getOAuthConfig(providerId) {
    const config = exports.OAUTH_PROVIDER_CONFIGS[providerId];
    if (!config)
        throw new Error(`Provider "${providerId}" não tem fluxo OAuth configurado`);
    return config;
}
//# sourceMappingURL=config.js.map