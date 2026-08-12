"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPasswordPwned = checkPasswordPwned;
async function sha1Hex(text, subtle) {
    const encoded = new TextEncoder().encode(text);
    const digest = await subtle.digest('SHA-1', encoded);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}
/**
 * Fail-open por design: se a API estiver fora do ar, retorna checkFailed=true
 * e isPwned=false — nunca bloquear um cadastro/troca de senha só porque o
 * serviço de terceiro está indisponível.
 */
async function checkPasswordPwned(password, subtle = crypto.subtle, fetchImpl = fetch) {
    try {
        const hash = await sha1Hex(password, subtle);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);
        const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) {
            return { isPwned: false, occurrences: 0, checkFailed: true };
        }
        const body = await response.text();
        const match = body
            .split('\n')
            .map((line) => line.trim().split(':'))
            .find(([lineSuffix]) => lineSuffix === suffix);
        if (!match) {
            return { isPwned: false, occurrences: 0, checkFailed: false };
        }
        return { isPwned: true, occurrences: Number(match[1] ?? 0), checkFailed: false };
    }
    catch {
        return { isPwned: false, occurrences: 0, checkFailed: true };
    }
}
//# sourceMappingURL=passwordSecurity.js.map