import type { ProviderId } from "../schema";
export interface QuotaWindowDef {
    windowMs: number;
    /** limite em requests OU tokens — o que for mais representativo pro provider */
    metric: "requests" | "tokens";
    limit: number;
    notes?: string;
}
/**
 * Janelas conhecidas publicamente (aproximadas — cada provider pode mudar
 * sem aviso, e alguns dependem do tier de conta). Onde não há dado confiável
 * documentado, deixamos de fora — o QuotaTracker então só reporta "used"
 * sem "remaining"/"resetAt", em vez de inventar um número.
 */
export declare const QUOTA_WINDOW_DEFS: Partial<Record<ProviderId, QuotaWindowDef>>;
export declare function getQuotaWindowDef(providerId: ProviderId): QuotaWindowDef | null;
