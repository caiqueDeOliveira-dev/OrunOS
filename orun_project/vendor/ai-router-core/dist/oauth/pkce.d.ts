/**
 * PKCE (RFC 7636) usando apenas Web Crypto — disponível nativamente em
 * Electron (Node 20+) e em Expo via `expo-crypto`'s getRandomBytesAsync
 * + o `crypto.subtle` polyfill. Sem libs externas.
 */
export declare function generateCodeVerifier(): string;
export declare function generateCodeChallenge(verifier: string): Promise<string>;
export declare function generateState(): string;
