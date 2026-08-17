"use strict";
/**
 * PKCE (RFC 7636) usando apenas Web Crypto — disponível nativamente em
 * Electron (Node 20+) e em Expo via `expo-crypto`'s getRandomBytesAsync
 * + o `crypto.subtle` polyfill. Sem libs externas.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCodeVerifier = generateCodeVerifier;
exports.generateCodeChallenge = generateCodeChallenge;
exports.generateState = generateState;
function base64UrlEncode(bytes) {
    let binary = "";
    for (const b of bytes)
        binary += String.fromCharCode(b);
    const base64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateCodeVerifier() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
}
function generateState() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}
//# sourceMappingURL=pkce.js.map