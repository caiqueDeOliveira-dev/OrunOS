"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
/**
 * Grava eventos de segurança na tabela `audit_log`. Falhas de escrita no
 * log NUNCA devem interromper o fluxo principal (ex: um erro ao gravar o
 * log de login não pode impedir o login) — por isso os métodos engolem
 * erro e só emitem um console.warn, ao invés de lançar.
 */
class AuditLogger {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async log(entry) {
        const { error } = await this.supabase.from('audit_log').insert({
            tenant_id: entry.tenantId ?? null,
            user_id: entry.userId ?? null,
            event_type: entry.eventType,
            metadata: entry.metadata ?? {},
        });
        if (error) {
            // Log de auditoria é best-effort — não deve derrubar o fluxo do usuário.
            console.warn('[@orun/identity] falha ao gravar audit_log:', error.message);
        }
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=AuditLogger.js.map