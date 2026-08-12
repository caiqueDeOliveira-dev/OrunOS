import type { AuthClient } from '../core/AuthClient';
import type { AuthState } from '../types';
/**
 * Hook compartilhado entre Mobile (Expo/React Native) e qualquer superfície
 * web (ex: futura Orun Casa Kiosk) que rode o AuthClient no próprio processo
 * — diferente do Desktop, onde o AuthClient vive no main process e o
 * renderer consome via IPC (ver useAuthBridge nos exemplos do README).
 *
 * Uso:
 *   const authClient = useMemo(() => new AuthClient({ ... }), []);
 *   const { state, signIn, signOut } = useAuth(authClient);
 */
export declare function useAuth(client: AuthClient): {
    state: AuthState;
    signIn: (params: import("../types").SignInParams) => Promise<void>;
    signUp: (params: import("../types").SignUpParams) => Promise<void>;
    signInWithOAuth: (params: import("../types").OAuthProvider) => Promise<{
        url: string;
    }>;
    signInWithMagicLink: (email: string, redirectTo?: string) => Promise<void>;
    completeSessionFromUrl: (url: string) => Promise<void>;
    signOut: () => Promise<void>;
};
/**
 * Variante para o Desktop: em vez de um AuthClient local, recebe funções que
 * fazem a ponte IPC com o main process (onde o AuthClient real roda).
 * O shape retornado é idêntico ao de useAuth() para os componentes de UI
 * poderem ser compartilhados entre Desktop e Mobile sem reescrever telas.
 */
export interface AuthBridge {
    getState(): Promise<AuthState>;
    onStateChanged(cb: (state: AuthState) => void): () => void;
    signIn(params: {
        email: string;
        password: string;
        captchaToken?: string;
    }): Promise<void>;
    signUp(params: {
        email: string;
        password: string;
        displayName?: string;
        captchaToken?: string;
    }): Promise<void>;
    signOut(): Promise<void>;
}
export declare function useAuthBridge(bridge: AuthBridge): {
    state: AuthState;
    signIn: (params: {
        email: string;
        password: string;
        captchaToken?: string;
    }) => Promise<void>;
    signUp: (params: {
        email: string;
        password: string;
        displayName?: string;
        captchaToken?: string;
    }) => Promise<void>;
    signOut: () => Promise<void>;
};
//# sourceMappingURL=useAuth.d.ts.map