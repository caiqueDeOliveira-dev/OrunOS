"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRegistry = void 0;
/**
 * Gerencia o registro de dispositivos/sessões ativas por tenant — a base
 * tanto para a tela "dispositivos conectados" quanto para o enforcement de
 * limite de devices por plano (ver plans.max_devices no schema).
 */
class SessionRegistry {
    constructor(supabase) {
        this.supabase = supabase;
    }
    /**
     * Registra (ou atualiza last_seen_at de) o dispositivo atual. `fingerprint`
     * deve ser estável entre reinícios do app na mesma máquina/instalação.
     */
    async registerDevice(params) {
        const { data, error } = await this.supabase
            .from('user_devices')
            .upsert({
            tenant_id: params.tenantId,
            user_id: params.userId,
            platform: params.platform,
            name: params.name,
            fingerprint: params.fingerprint,
            last_seen_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,fingerprint' })
            .select('*')
            .single();
        if (error)
            throw error;
        return this.mapDevice(data);
    }
    async listActiveDevices(tenantId) {
        const { data, error } = await this.supabase
            .from('user_devices')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('revoked_at', null)
            .order('last_seen_at', { ascending: false });
        if (error)
            throw error;
        return data.map(this.mapDevice);
    }
    /** Revoga um device remotamente — a sessão correspondente deve ser invalidada no próximo refresh. */
    async revokeDevice(deviceId) {
        const { error } = await this.supabase
            .from('user_devices')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', deviceId);
        if (error)
            throw error;
        await this.supabase
            .from('sessions')
            .update({ revoked_at: new Date().toISOString() })
            .eq('device_id', deviceId)
            .is('revoked_at', null);
    }
    mapDevice(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            platform: row.platform,
            name: row.name,
            fingerprint: row.fingerprint,
            lastSeenAt: row.last_seen_at,
            revokedAt: row.revoked_at ?? null,
            createdAt: row.created_at,
        };
    }
}
exports.SessionRegistry = SessionRegistry;
//# sourceMappingURL=SessionRegistry.js.map