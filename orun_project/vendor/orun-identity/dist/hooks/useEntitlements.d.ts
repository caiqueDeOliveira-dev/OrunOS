import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Hook de conveniência para os apps decidirem paywalls sem instanciar o
 * resolver manualmente. Refaz a consulta sempre que tenantId muda (ex: troca
 * de tenant ativo, ou após checkout do Stripe completar e o app forçar refresh).
 */
export declare function useEntitlements(supabase: SupabaseClient, tenantId: string | null): {
    loading: boolean;
    error: Error | null;
    hasFeature: (featureKey: string) => boolean;
    getLimit: (featureKey: string, fallback: number) => number;
    /** Chamar após retorno do Stripe Checkout para forçar nova consulta. */
    refresh: () => void;
    plan: import("../core/EntitlementsResolver").Plan | null;
    subscription: import("..").Subscription | null;
    isActive: boolean;
    features: Record<string, unknown>;
};
//# sourceMappingURL=useEntitlements.d.ts.map