import type { SupabaseClient } from '@supabase/supabase-js';
import type { Subscription } from '../types';
export interface Plan {
    id: string;
    key: string;
    name: string;
    stripePriceId: string | null;
    maxDevices: number;
}
export interface ResolvedEntitlements {
    plan: Plan | null;
    subscription: Subscription | null;
    /** true para status que devem liberar acesso: 'active' e 'trialing'. */
    isActive: boolean;
    features: Record<string, unknown>;
}
/**
 * Resolve o que um tenant tem direito a usar, combinando subscriptions +
 * plans + entitlements. Os apps consultam isto para decidir mostrar
 * paywall ou liberar uma feature — nunca hardcodam limites no client.
 *
 * Fail-safe: se não houver subscription ativa, retorna isActive = false e
 * features vazio — os apps devem tratar isso como "plano free/sem acesso",
 * nunca assumir acesso liberado por omissão.
 */
export declare class EntitlementsResolver {
    private readonly supabase;
    constructor(supabase: SupabaseClient);
    resolve(tenantId: string): Promise<ResolvedEntitlements>;
    /** Atalho para checagens booleanas simples, ex: hasFeature(resolved, 'ai_agents_unlimited'). */
    static hasFeature(resolved: ResolvedEntitlements, featureKey: string): boolean;
    /** Atalho para limites numéricos, ex: getLimit(resolved, 'iptv_streams_max', 1). */
    static getLimit(resolved: ResolvedEntitlements, featureKey: string, fallback: number): number;
}
//# sourceMappingURL=EntitlementsResolver.d.ts.map