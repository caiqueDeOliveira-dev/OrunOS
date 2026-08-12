/**
 * Verifica se uma senha aparece em vazamentos conhecidos, usando o modelo
 * k-anonymity da API pública do Have I Been Pwned: só os 5 primeiros
 * caracteres do hash SHA-1 são enviados, nunca a senha nem o hash completo.
 * https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export interface PwnedCheckResult {
    isPwned: boolean;
    /** Quantas vezes essa senha apareceu em vazamentos conhecidos. 0 se não encontrada ou se a checagem falhou. */
    occurrences: number;
    /** true se a checagem não pôde ser completada (ex: sem rede) — não bloquear o usuário nesse caso. */
    checkFailed: boolean;
}
/**
 * Fail-open por design: se a API estiver fora do ar, retorna checkFailed=true
 * e isPwned=false — nunca bloquear um cadastro/troca de senha só porque o
 * serviço de terceiro está indisponível.
 */
export declare function checkPasswordPwned(password: string, subtle?: SubtleCrypto, fetchImpl?: typeof fetch): Promise<PwnedCheckResult>;
//# sourceMappingURL=passwordSecurity.d.ts.map