"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerElectronOAuthDeepLink = registerElectronOAuthDeepLink;
const ai_router_core_1 = require("@orun/ai-router-core");
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
function registerElectronOAuthDeepLink(app, oauthManager, options = {}) {
    const protocol = options.protocol ?? "orun";
    app.setAsDefaultProtocolClient(protocol);
    app.on("open-url", (event, url) => {
        event.preventDefault();
        (0, ai_router_core_1.handleOAuthDeepLink)(url, oauthManager)
            .then((result) => {
            if (result) {
                options.onConnected?.(result.providerId);
            }
            else {
                options.onOtherDeepLink?.(url);
            }
        })
            .catch((err) => {
            options.onError?.(err);
        });
    });
}
//# sourceMappingURL=electron-deep-link.js.map