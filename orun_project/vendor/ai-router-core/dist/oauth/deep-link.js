"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOAuthCallbackUrl = parseOAuthCallbackUrl;
exports.handleOAuthDeepLink = handleOAuthDeepLink;
const schema_1 = require("../schema");
/**
 * Reconhece URLs no formato `orun://oauth/{providerId}/callback?code=...&state=...`
 * (o mesmo formato configurado em `redirectUri` no oauth/config.ts).
 * Retorna `null` se a URL não é um callback OAuth reconhecido — assim o
 * caller pode ignorar deep links de outra natureza sem tratar como erro.
 */
function parseOAuthCallbackUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return null;
    }
    if (parsed.protocol !== "orun:")
        return null;
    // host = "oauth", pathname = "/{providerId}/callback" (URL parsing de custom scheme varia por plataforma,
    // então checamos os dois formatos possíveis: orun://oauth/x/callback e orun:oauth/x/callback)
    const segments = `${parsed.hostname}${parsed.pathname}`.split("/").filter(Boolean);
    if (segments[0] !== "oauth" || segments[2] !== "callback")
        return null;
    const providerIdRaw = segments[1];
    const parsedProviderId = schema_1.ProviderIdSchema.safeParse(providerIdRaw);
    if (!parsedProviderId.success)
        return null;
    const code = parsed.searchParams.get("code");
    const state = parsed.searchParams.get("state");
    if (!code || !state)
        return null;
    return { providerId: parsedProviderId.data, code, state };
}
/**
 * Handler completo: parseia a URL e, se for um callback OAuth reconhecido,
 * troca o code pelo token via `oauthManager`. Retorna `null` (sem lançar
 * erro) se a URL não for um callback OAuth — só propaga erro se ERA um
 * callback válido mas a troca falhou (provider recusou, state expirado etc).
 */
async function handleOAuthDeepLink(url, oauthManager) {
    const params = parseOAuthCallbackUrl(url);
    if (!params)
        return null;
    await oauthManager.exchangeCodeForToken(params.code, params.state);
    return { providerId: params.providerId };
}
//# sourceMappingURL=deep-link.js.map