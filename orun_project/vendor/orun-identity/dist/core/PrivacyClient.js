"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyClient = void 0;
/**
 * Wrappers finos para as Edge Functions de LGPD (`export-user-data`,
 * `delete-account`). A lógica sensível — juntar dados de todas as tabelas,
 * decidir se pode apagar um owner de organização — vive só no servidor;
 * aqui é só a chamada e o tratamento de erro esperado.
 */
class PrivacyClient {
    constructor(supabase) {
        this.supabase = supabase;
    }
    /** Retorna o JSON completo com os dados do usuário autenticado (portabilidade, LGPD art. 18 V). */
    async exportUserData() {
        const { data, error } = await this.supabase.functions.invoke('export-user-data');
        if (error)
            throw error;
        return data;
    }
    /**
     * Solicita a exclusão da conta (direito ao esquecimento, LGPD art. 18 VI).
     * Pode retornar `blocked: true` se o usuário for o único owner de uma
     * organização — nesse caso a conta não foi apagada, e a UI deve orientar
     * a transferir titularidade primeiro.
     */
    async requestAccountDeletion() {
        const { data, error } = await this.supabase.functions.invoke('delete-account');
        if (error) {
            // supabase-js expõe o corpo de respostas non-2xx via error.context, quando disponível.
            const context = error.context;
            if (context?.json) {
                const body = (await context.json());
                if (body.error === 'sole_owner_of_organization') {
                    return {
                        blocked: true,
                        reason: 'sole_owner_of_organization',
                        message: body.message ?? 'Transfira a titularidade da organização antes de excluir sua conta.',
                        blockedTenants: body.blockedTenants ?? [],
                    };
                }
            }
            throw error;
        }
        void data;
        return { blocked: false };
    }
}
exports.PrivacyClient = PrivacyClient;
//# sourceMappingURL=PrivacyClient.js.map