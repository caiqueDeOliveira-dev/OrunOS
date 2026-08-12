import type { SupabaseClient } from '@supabase/supabase-js';
export interface AccountDeletionBlockedResult {
    blocked: true;
    reason: 'sole_owner_of_organization';
    message: string;
    blockedTenants: string[];
}
export type AccountDeletionResult = {
    blocked: false;
} | AccountDeletionBlockedResult;
/**
 * Wrappers finos para as Edge Functions de LGPD (`export-user-data`,
 * `delete-account`). A lógica sensível — juntar dados de todas as tabelas,
 * decidir se pode apagar um owner de organização — vive só no servidor;
 * aqui é só a chamada e o tratamento de erro esperado.
 */
export declare class PrivacyClient {
    private readonly supabase;
    constructor(supabase: SupabaseClient);
    /** Retorna o JSON completo com os dados do usuário autenticado (portabilidade, LGPD art. 18 V). */
    exportUserData(): Promise<Record<string, unknown>>;
    /**
     * Solicita a exclusão da conta (direito ao esquecimento, LGPD art. 18 VI).
     * Pode retornar `blocked: true` se o usuário for o único owner de uma
     * organização — nesse caso a conta não foi apagada, e a UI deve orientar
     * a transferir titularidade primeiro.
     */
    requestAccountDeletion(): Promise<AccountDeletionResult>;
}
//# sourceMappingURL=PrivacyClient.d.ts.map