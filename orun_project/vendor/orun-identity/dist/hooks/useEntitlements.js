"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEntitlements = useEntitlements;
const react_1 = require("react");
const EntitlementsResolver_1 = require("../core/EntitlementsResolver");
const EMPTY = {
    plan: null,
    subscription: null,
    isActive: false,
    features: {},
};
/**
 * Hook de conveniência para os apps decidirem paywalls sem instanciar o
 * resolver manualmente. Refaz a consulta sempre que tenantId muda (ex: troca
 * de tenant ativo, ou após checkout do Stripe completar e o app forçar refresh).
 */
function useEntitlements(supabase, tenantId) {
    const [resolved, setResolved] = (0, react_1.useState)(EMPTY);
    const [loading, setLoading] = (0, react_1.useState)(Boolean(tenantId));
    const [error, setError] = (0, react_1.useState)(null);
    const [refreshKey, setRefreshKey] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (!tenantId) {
            setResolved(EMPTY);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        const resolver = new EntitlementsResolver_1.EntitlementsResolver(supabase);
        resolver
            .resolve(tenantId)
            .then((result) => {
            if (!cancelled)
                setResolved(result);
        })
            .catch((err) => {
            if (!cancelled)
                setError(err instanceof Error ? err : new Error(String(err)));
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [supabase, tenantId, refreshKey]);
    return {
        ...resolved,
        loading,
        error,
        hasFeature: (featureKey) => EntitlementsResolver_1.EntitlementsResolver.hasFeature(resolved, featureKey),
        getLimit: (featureKey, fallback) => EntitlementsResolver_1.EntitlementsResolver.getLimit(resolved, featureKey, fallback),
        /** Chamar após retorno do Stripe Checkout para forçar nova consulta. */
        refresh: () => setRefreshKey((k) => k + 1),
    };
}
//# sourceMappingURL=useEntitlements.js.map