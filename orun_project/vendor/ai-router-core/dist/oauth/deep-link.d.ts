import { type ProviderId } from "../schema";
import type { OAuthFlowManager } from "./flow-manager";
export interface OAuthCallbackParams {
    providerId: ProviderId;
    code: string;
    state: string;
}
/**
 * Reconhece URLs no formato `orun://oauth/{providerId}/callback?code=...&state=...`
 * (o mesmo formato configurado em `redirectUri` no oauth/config.ts).
 * Retorna `null` se a URL não é um callback OAuth reconhecido — assim o
 * caller pode ignorar deep links de outra natureza sem tratar como erro.
 */
export declare function parseOAuthCallbackUrl(url: string): OAuthCallbackParams | null;
/**
 * Handler completo: parseia a URL e, se for um callback OAuth reconhecido,
 * troca o code pelo token via `oauthManager`. Retorna `null` (sem lançar
 * erro) se a URL não for um callback OAuth — só propaga erro se ERA um
 * callback válido mas a troca falhou (provider recusou, state expirado etc).
 */
export declare function handleOAuthDeepLink(url: string, oauthManager: OAuthFlowManager): Promise<{
    providerId: ProviderId;
} | null>;
