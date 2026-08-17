"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaTracker = exports.InMemoryQuotaHeaderCache = void 0;
exports.parseRateLimitHeaders = parseRateLimitHeaders;
const quota_window_defs_1 = require("./quota-window-defs");
/**
 * Parseia os headers mais comuns entre providers OpenAI-compatible e
 * Anthropic. Cada provider usa nomes ligeiramente diferentes; cobrimos os
 * mais frequentes e ignoramos silenciosamente o que não bater.
 */
function parseRateLimitHeaders(headers) {
    const remainingRaw = headers.get("x-ratelimit-remaining-requests") ??
        headers.get("x-ratelimit-remaining") ??
        headers.get("anthropic-ratelimit-requests-remaining");
    const limitRaw = headers.get("x-ratelimit-limit-requests") ??
        headers.get("x-ratelimit-limit") ??
        headers.get("anthropic-ratelimit-requests-limit");
    const resetRaw = headers.get("x-ratelimit-reset-requests") ??
        headers.get("x-ratelimit-reset") ??
        headers.get("anthropic-ratelimit-requests-reset");
    if (!remainingRaw && !limitRaw)
        return null;
    const info = {};
    if (remainingRaw)
        info.remaining = Number(remainingRaw);
    if (limitRaw)
        info.limit = Number(limitRaw);
    if (resetRaw) {
        // pode vir como epoch seconds, ISO 8601, ou duração tipo "6s" (Anthropic)
        const asNumber = Number(resetRaw);
        if (!Number.isNaN(asNumber)) {
            info.resetAt = asNumber > 10_000_000_000 ? asNumber : Date.now() + asNumber * 1000;
        }
        else {
            const durationMatch = /^(\d+)s$/.exec(resetRaw);
            if (durationMatch)
                info.resetAt = Date.now() + Number(durationMatch[1]) * 1000;
            else {
                const parsed = Date.parse(resetRaw);
                if (!Number.isNaN(parsed))
                    info.resetAt = parsed;
            }
        }
    }
    return info;
}
/** Cache em memória — headers só valem enquanto o processo está de pé, não precisa persistir. */
class InMemoryQuotaHeaderCache {
    cache = new Map();
    key(providerId, accountLabel) {
        return `${providerId}:${accountLabel}`;
    }
    set(providerId, accountLabel, info) {
        this.cache.set(this.key(providerId, accountLabel), info);
    }
    get(providerId, accountLabel) {
        return this.cache.get(this.key(providerId, accountLabel)) ?? null;
    }
}
exports.InMemoryQuotaHeaderCache = InMemoryQuotaHeaderCache;
class QuotaTracker {
    usageLogStore;
    headerCache;
    constructor(usageLogStore, headerCache = new InMemoryQuotaHeaderCache()) {
        this.usageLogStore = usageLogStore;
        this.headerCache = headerCache;
    }
    ingestHeaders(providerId, accountLabel, headers) {
        const info = parseRateLimitHeaders(headers);
        if (info)
            this.headerCache.set(providerId, accountLabel, info);
    }
    async getStatus(providerId, accountLabel = "default") {
        // 1. prioridade máxima: header real do último response (mais preciso que qualquer estimativa)
        const header = this.headerCache.get(providerId, accountLabel);
        if (header && header.remaining !== undefined) {
            return {
                providerId,
                accountLabel,
                usedInWindow: header.limit !== undefined ? header.limit - header.remaining : 0,
                limit: header.limit ?? null,
                remaining: header.remaining,
                resetAt: header.resetAt ?? null,
                source: "header",
            };
        }
        // 2. fallback: contagem local a partir do usage log, contra a janela conhecida estaticamente
        const windowDef = (0, quota_window_defs_1.getQuotaWindowDef)(providerId);
        if (windowDef) {
            const recent = await this.usageLogStore.listRecent(undefined, 500);
            const cutoff = Date.now() - windowDef.windowMs;
            const usedInWindow = recent.filter((e) => e.providerId === providerId && e.timestamp >= cutoff && e.success).length;
            const oldestInWindow = recent
                .filter((e) => e.providerId === providerId && e.timestamp >= cutoff)
                .sort((a, b) => a.timestamp - b.timestamp)[0];
            return {
                providerId,
                accountLabel,
                usedInWindow,
                limit: windowDef.limit,
                remaining: Math.max(0, windowDef.limit - usedInWindow),
                resetAt: oldestInWindow ? oldestInWindow.timestamp + windowDef.windowMs : null,
                source: "local-count",
            };
        }
        // 3. sem header e sem janela conhecida — não inventamos número
        return {
            providerId,
            accountLabel,
            usedInWindow: 0,
            limit: null,
            remaining: null,
            resetAt: null,
            source: "unknown",
        };
    }
}
exports.QuotaTracker = QuotaTracker;
//# sourceMappingURL=quota-tracker.js.map