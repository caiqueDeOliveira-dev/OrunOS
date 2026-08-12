import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Eventos de auditoria padronizados. Manter esta lista como fonte única de
 * verdade evita strings soltas espalhadas pelos apps — todo evento novo
 * deve ser adicionado aqui primeiro.
 */
export type AuditEventType = 'login_success' | 'login_failed' | 'logout' | 'signup' | 'password_changed' | 'password_reset_requested' | 'email_verification_resent' | 'mfa_enrolled' | 'mfa_disabled' | 'mfa_challenge_failed' | 'passkey_enrolled' | 'passkey_removed' | 'session_revoked' | 'device_added' | 'device_revoked' | 'plan_changed' | 'data_export_requested' | 'account_deletion_requested';
export interface AuditLogEntry {
    tenantId?: string | null;
    userId?: string | null;
    eventType: AuditEventType;
    metadata?: Record<string, unknown>;
}
/**
 * Grava eventos de segurança na tabela `audit_log`. Falhas de escrita no
 * log NUNCA devem interromper o fluxo principal (ex: um erro ao gravar o
 * log de login não pode impedir o login) — por isso os métodos engolem
 * erro e só emitem um console.warn, ao invés de lançar.
 */
export declare class AuditLogger {
    private readonly supabase;
    constructor(supabase: SupabaseClient);
    log(entry: AuditLogEntry): Promise<void>;
}
//# sourceMappingURL=AuditLogger.d.ts.map