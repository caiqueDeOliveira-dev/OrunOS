import type { OAuthFlowManager } from "@orun/ai-router-core";
/**
 * Formato mínimo do `app` do Electron que este módulo precisa — descrito
 * por estrutura (duck typing) em vez de `import { app } from "electron"`,
 * assim este pacote não precisa do Electron como dependência real (ele já
 * roda em qualquer processo Node, inclusive nos testes deste monorepo).
 * No app de verdade, basta passar o `app` importado de "electron".
 */
export interface ElectronAppLike {
    on(event: "open-url", listener: (event: {
        preventDefault(): void;
    }, url: string) => void): void;
    setAsDefaultProtocolClient(protocol: string): boolean;
}
export interface RegisterDeepLinkOptions {
    /** protocolo do scheme, ex: "orun" pra URLs "orun://..." (default: "orun") */
    protocol?: string;
    onConnected?: (providerId: string) => void;
    onError?: (error: unknown) => void;
    /** URLs orun:// que não são callback OAuth (ex: deep links de outras features) — repassadas aqui em vez de ignoradas silenciosamente. */
    onOtherDeepLink?: (url: string) => void;
}
/**
 * Registra o handler de deep link OAuth no processo principal do Electron.
 * Chame isso uma vez, cedo no boot do app (antes de `app.whenReady()` já
 * é seguro, o Electron enfileira o evento `open-url` se disparar antes).
 *
 * ```ts
 * import { app } from "electron";
 * import { registerElectronOAuthDeepLink } from "@orun/ai-router-node";
 *
 * registerElectronOAuthDeepLink(app, oauthManager, {
 *   onConnected: (providerId) => mainWindow.webContents.send("ai-router:oauth-connected", providerId),
 *   onError: (err) => console.error("OAuth deep link falhou:", err),
 * });
 * ```
 */
export declare function registerElectronOAuthDeepLink(app: ElectronAppLike, oauthManager: OAuthFlowManager, options?: RegisterDeepLinkOptions): void;
