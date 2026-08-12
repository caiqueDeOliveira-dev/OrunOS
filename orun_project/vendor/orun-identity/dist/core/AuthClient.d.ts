import type { SupabaseClient } from '@supabase/supabase-js';
import type { ISecureTokenStore } from '../storage/ISecureTokenStore';
import type { AuthState, Membership, OAuthProvider, SignInParams, SignUpParams, Tenant } from '../types';
type Listener = (state: AuthState) => void;
export interface AuthClientConfig {
    supabase: SupabaseClient;
    tokenStore: ISecureTokenStore;
    /** Necessário no Desktop (service_role) e opcional no Mobile/TV (anon key delega ao host). */
    resolveTenantContext: (userId: string) => Promise<{
        activeTenant: Tenant;
        memberships: Membership[];
    }>;
}
export interface MFAEnrollResult {
    factorId: string;
    qrCode: string;
    secret: string;
}
export interface MFAFactor {
    id: string;
    friendlyName: string | null;
    status: 'verified' | 'unverified';
}
/**
 * Wrapper central de autenticação. Todos os apps instanciam um AuthClient
 * injetando sua própria implementação de ISecureTokenStore — a lógica de
 * sign in/up/out, OAuth, magic link, refresh e MFA vive aqui uma única vez.
 */
export declare class AuthClient {
    private readonly config;
    private state;
    private listeners;
    private readonly auditLogger;
    constructor(config: AuthClientConfig);
    getState(): AuthState;
    subscribe(listener: Listener): () => void;
    private setState;
    /**
     * Deve ser chamado uma vez na inicialização do app. Tenta restaurar sessão
     * a partir do token store local antes de decidir status = unauthenticated.
     */
    initialize(): Promise<void>;
    signUp(params: SignUpParams): Promise<void>;
    signIn(params: SignInParams): Promise<void>;
    signInWithOAuth(params: OAuthProvider): Promise<{
        url: string;
    }>;
    signInWithMagicLink(email: string, redirectTo?: string): Promise<void>;
    /** Chamado após o app receber o deep link de retorno do OAuth/magic link. */
    completeSessionFromUrl(url: string): Promise<void>;
    /** Envia e-mail com link de redefinição. Sempre retorna sucesso mesmo se o e-mail não existir (evita user enumeration). */
    resetPasswordForEmail(email: string, redirectTo?: string): Promise<void>;
    /**
     * Troca a senha do usuário autenticado (usado tanto no fluxo pós-reset,
     * com a sessão temporária do link de recuperação, quanto na troca
     * voluntária dentro do app). Recomendado: chamar `verifyPassword` antes
     * quando for troca voluntária, para confirmar posse da senha atual.
     */
    updatePassword(newPassword: string): Promise<void>;
    resendEmailVerification(email: string): Promise<void>;
    /**
     * Reautenticação leve para guardar ações críticas (troca de e-mail,
     * exclusão de conta, desativar MFA). Não altera a sessão atual — só
     * confirma que quem está pedindo a ação sabe a senha atual.
     */
    verifyPassword(password: string): Promise<boolean>;
    /** Executa a cerimônia WebAuthn de registro (browser/webview com suporte a navigator.credentials). */
    registerPasskey(): Promise<void>;
    /** Login sem senha via passkey — o próprio picker do navegador lida com qual conta. */
    signInWithPasskey(): Promise<void>;
    signOut(): Promise<void>;
    /**
     * Inicia o enrollment de um novo fator TOTP. O caller renderiza o
     * `qrCode` (SVG data URI) num app autenticador e chama
     * `verifyMFAEnrollment` com o código de 6 dígitos gerado.
     */
    enrollMFA(friendlyName?: string): Promise<MFAEnrollResult>;
    /** Confirma o enrollment com o primeiro código gerado pelo app autenticador. */
    verifyMFAEnrollment(factorId: string, code: string): Promise<void>;
    /**
     * Verifica o código TOTP durante o login (quando signIn() retornou
     * status = 'mfa_required'). Em caso de sucesso, hidrata o estado normal.
     */
    verifyMFAChallenge(factorId: string, code: string): Promise<void>;
    listMFAFactors(): Promise<MFAFactor[]>;
    unenrollMFA(factorId: string): Promise<void>;
    private persistAndHydrate;
    private hydrateFromSession;
    private clearLocalSession;
}
export {};
//# sourceMappingURL=AuthClient.d.ts.map