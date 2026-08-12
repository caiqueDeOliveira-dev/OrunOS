import type { SupabaseClient } from '@supabase/supabase-js';
import type { Device, DevicePlatform } from '../types';
/**
 * Gerencia o registro de dispositivos/sessões ativas por tenant — a base
 * tanto para a tela "dispositivos conectados" quanto para o enforcement de
 * limite de devices por plano (ver plans.max_devices no schema).
 */
export declare class SessionRegistry {
    private readonly supabase;
    constructor(supabase: SupabaseClient);
    /**
     * Registra (ou atualiza last_seen_at de) o dispositivo atual. `fingerprint`
     * deve ser estável entre reinícios do app na mesma máquina/instalação.
     */
    registerDevice(params: {
        tenantId: string;
        userId: string;
        platform: DevicePlatform;
        name: string;
        fingerprint: string;
    }): Promise<Device>;
    listActiveDevices(tenantId: string): Promise<Device[]>;
    /** Revoga um device remotamente — a sessão correspondente deve ser invalidada no próximo refresh. */
    revokeDevice(deviceId: string): Promise<void>;
    private mapDevice;
}
//# sourceMappingURL=SessionRegistry.d.ts.map