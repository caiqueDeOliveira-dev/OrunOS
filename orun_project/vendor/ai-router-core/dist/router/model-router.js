"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRouter = exports.ComboExhaustedError = void 0;
const registry_1 = require("../providers/registry");
const registry_2 = require("../adapters/registry");
const types_1 = require("../adapters/types");
const model_pricing_1 = require("../pricing/model-pricing");
const circuit_breaker_1 = require("../circuit-breaker/circuit-breaker");
const quota_tracker_1 = require("../quota/quota-tracker");
const account_rotator_1 = require("../accounts/account-rotator");
const apply_rtk_1 = require("../rtk/apply-rtk");
const rate_limiter_1 = require("../rate-limit/rate-limiter");
const validate_base_url_1 = require("../security/validate-base-url");
class ComboExhaustedError extends Error {
    comboId;
    attempts;
    constructor(comboId, attempts) {
        super(`Todos os steps do combo "${comboId}" falharam:\n` +
            attempts.map((a, i) => `  [${i}] ${a.providerId}/${a.model}: ${a.error}`).join("\n"));
        this.comboId = comboId;
        this.attempts = attempts;
        this.name = "ComboExhaustedError";
    }
}
exports.ComboExhaustedError = ComboExhaustedError;
class ModelRouter {
    comboStore;
    providerConfigStore;
    secretStore;
    skillStore;
    usageLogStore;
    circuitBreaker;
    quotaTracker;
    accountRotator;
    semanticCache;
    rateLimiter;
    constructor(comboStore, providerConfigStore, secretStore, skillStore, usageLogStore, opts) {
        this.comboStore = comboStore;
        this.providerConfigStore = providerConfigStore;
        this.secretStore = secretStore;
        this.skillStore = skillStore;
        this.usageLogStore = usageLogStore;
        this.circuitBreaker = opts?.circuitBreaker ?? new circuit_breaker_1.CircuitBreaker();
        this.quotaTracker = opts?.quotaTracker ?? new quota_tracker_1.QuotaTracker(usageLogStore);
        this.accountRotator = opts?.accountRotator ?? new account_rotator_1.AccountRotator();
        this.semanticCache = opts?.semanticCache ?? null;
        this.rateLimiter = opts?.rateLimiter ?? new rate_limiter_1.RateLimiter();
    }
    async complete(request) {
        const combo = await this.comboStore.getCombo(request.comboId);
        if (!combo)
            throw new Error(`Combo não encontrado: ${request.comboId}`);
        if (combo.kind !== "text") {
            throw new Error(`Combo "${request.comboId}" é do tipo "${combo.kind}", use completeMedia() para esse tipo.`);
        }
        let messages = await this.applySkill(combo, request.messages);
        if (combo.rtkEnabled) {
            messages = (0, apply_rtk_1.applyRtk)(messages).messages;
        }
        if (combo.cacheEnabled && this.semanticCache) {
            const cached = await this.semanticCache.lookup(combo.id, messages, combo.cacheSimilarityThreshold);
            if (cached) {
                const usage = {
                    timestamp: Date.now(),
                    comboId: combo.id,
                    stepIndex: -1,
                    providerId: cached.providerId,
                    model: cached.model,
                    promptTokens: 0,
                    completionTokens: 0,
                    latencyMs: 0,
                    success: true,
                    estimatedCostUsd: 0,
                    cacheHit: true,
                };
                await this.usageLogStore.record(usage);
                return { content: cached.responseContent, providerId: usage.providerId, model: usage.model, stepIndex: -1, usage };
            }
        }
        const attempts = [];
        for (let stepIndex = 0; stepIndex < combo.steps.length; stepIndex++) {
            const step = combo.steps[stepIndex];
            const result = await this.tryStep(combo, step, stepIndex, messages, request, attempts);
            if (result) {
                if (combo.cacheEnabled && this.semanticCache) {
                    await this.semanticCache.save(combo.id, messages, result.content, result.providerId, result.model);
                }
                return result;
            }
        }
        throw new ComboExhaustedError(combo.id, attempts);
    }
    /**
     * Igual a `complete()`, mas emite pedaços de texto conforme chegam
     * (quando o adapter do provider escolhido suporta streaming — hoje:
     * openai-compatible, anthropic-native, ollama-native, gemini-native).
     * Se o step atual não tiver streaming, cai pra `complete()` normal e
     * emite o conteúdo inteiro como um único chunk no final.
     *
     * IMPORTANTE — limitação conhecida: se um provider falhar DEPOIS de já
     * ter emitido alguns chunks, o router cai pro próximo step do combo (like
     * sempre), mas o texto parcial já emitido não pode ser "desfeito". Antes
     * de tentar um novo step após uma falha, emitimos um chunk com
     * `restarting: true` — trate isso na UI como sinal pra descartar o texto
     * acumulado até então e recomeçar limpo.
     */
    async completeStream(request, onChunk) {
        const combo = await this.comboStore.getCombo(request.comboId);
        if (!combo)
            throw new Error(`Combo não encontrado: ${request.comboId}`);
        if (combo.kind !== "text") {
            throw new Error(`Combo "${request.comboId}" é do tipo "${combo.kind}", use completeMedia() para esse tipo.`);
        }
        let messages = await this.applySkill(combo, request.messages);
        if (combo.rtkEnabled)
            messages = (0, apply_rtk_1.applyRtk)(messages).messages;
        if (combo.cacheEnabled && this.semanticCache) {
            const cached = await this.semanticCache.lookup(combo.id, messages, combo.cacheSimilarityThreshold);
            if (cached) {
                onChunk({ deltaText: cached.responseContent, done: false, stepIndex: -1, providerId: cached.providerId });
                onChunk({ deltaText: "", done: true, stepIndex: -1, providerId: cached.providerId });
                const usage = {
                    timestamp: Date.now(),
                    comboId: combo.id,
                    stepIndex: -1,
                    providerId: cached.providerId,
                    model: cached.model,
                    promptTokens: 0,
                    completionTokens: 0,
                    latencyMs: 0,
                    success: true,
                    estimatedCostUsd: 0,
                    cacheHit: true,
                };
                await this.usageLogStore.record(usage);
                return { content: cached.responseContent, providerId: usage.providerId, model: usage.model, stepIndex: -1, usage };
            }
        }
        const attempts = [];
        for (let stepIndex = 0; stepIndex < combo.steps.length; stepIndex++) {
            const step = combo.steps[stepIndex];
            if (stepIndex > 0) {
                onChunk({ deltaText: "", done: false, stepIndex, providerId: step.providerId, restarting: true });
            }
            const result = await this.tryStep(combo, step, stepIndex, messages, request, attempts, (chunk) => onChunk({ ...chunk, stepIndex, providerId: step.providerId }));
            if (result) {
                onChunk({ deltaText: "", done: true, stepIndex, providerId: step.providerId });
                if (combo.cacheEnabled && this.semanticCache) {
                    await this.semanticCache.save(combo.id, messages, result.content, result.providerId, result.model);
                }
                return result;
            }
        }
        throw new ComboExhaustedError(combo.id, attempts);
    }
    /** Status de quota exposto pra UI (dashboard) consultar sem passar por uma chamada de verdade. */
    async getQuotaStatus(providerId, accountLabel) {
        return this.quotaTracker.getStatus(providerId, accountLabel);
    }
    getCircuitState(providerId, accountLabel) {
        return this.circuitBreaker.getState(providerId, accountLabel);
    }
    getAllCircuitStates() {
        return this.circuitBreaker.getStates();
    }
    async applySkill(combo, messages) {
        if (!combo.skillId)
            return messages;
        const skill = await this.skillStore.getSkill(combo.skillId);
        if (!skill)
            return messages;
        const styleSuffix = skill.promptStyle === "caveman"
            ? "\n\nResponda de forma extremamente direta e enxuta, sem rodeios, sem explicações desnecessárias."
            : skill.promptStyle === "ponytail"
                ? "\n\nSeja proativo, sugira melhorias além do que foi pedido quando fizer sentido."
                : "";
        const systemContent = `${skill.systemPrompt}${styleSuffix}`;
        const hasSystem = messages.some((m) => m.role === "system");
        if (hasSystem) {
            return messages.map((m) => (m.role === "system" ? { ...m, content: `${m.content}\n\n${systemContent}` } : m));
        }
        return [{ role: "system", content: systemContent }, ...messages];
    }
    async tryStep(combo, step, stepIndex, messages, request, attempts, onChunk) {
        const providerDef = (0, registry_1.getProvider)(step.providerId);
        // resolve QUAL conta usar: explícita no step > rotator entre contas habilitadas > config única
        let config = step.accountLabel ? await this.providerConfigStore.getConfig(step.providerId, step.accountLabel) : null;
        if (!step.accountLabel) {
            const allConfigs = await this.providerConfigStore.listConfigs();
            const accountsForProvider = allConfigs.filter((c) => c.providerId === step.providerId && c.enabled);
            if (accountsForProvider.length > 0) {
                // exaustão por conta: descarta contas em cooldown de 429/quota
                // (não bate de novo na conta que acabou de estourar quota).
                const isExhausted = typeof this.accountRotator.isExhausted === "function" ? this.accountRotator.isExhausted.bind(this.accountRotator) : null;
                const available = isExhausted
                    ? accountsForProvider.filter((c) => !isExhausted(step.providerId, c.accountLabel ?? "default"))
                    : accountsForProvider;
                if (available.length === 0) {
                    attempts.push({ providerId: step.providerId, model: step.model, error: "todas as contas exaustas (cooldown de quota)" });
                    return null;
                }
                config = await this.accountRotator.pickAccount(step.providerId, available, accountsForProvider[0]?.rotationMode ?? "priority");
            }
            else {
                config = await this.providerConfigStore.getConfig(step.providerId);
            }
        }
        const accountLabel = step.accountLabel ?? config?.accountLabel ?? "default";
        if (typeof this.accountRotator.isExhausted === "function" && this.accountRotator.isExhausted(step.providerId, accountLabel)) {
            attempts.push({ providerId: step.providerId, model: step.model, error: "conta exausta (cooldown de quota)" });
            return null;
        }
        // quota-aware: se o tracker sabe que a quota desta conta está em 0
        // (header real ou janela conhecida), não desperdiça a chamada — cai direto
        // pro próximo step do combo. Opt-out por step: `quotaAware: false`.
        if (step.quotaAware !== false && this.quotaTracker && typeof this.quotaTracker.getStatus === "function") {
            try {
                const quota = await this.quotaTracker.getStatus(step.providerId, accountLabel);
                if (quota.source !== "unknown" && quota.limit !== null && quota.remaining === 0) {
                    attempts.push({ providerId: step.providerId, model: step.model, error: "quota esgotada (sem chamada à API)" });
                    return null;
                }
            }
            catch {
                // tracker falhou (ex.: janela desconhecida) — deixa a chamada acontecer
            }
        }
        if (config && !config.enabled) {
            attempts.push({ providerId: step.providerId, model: step.model, error: "provider desabilitado nas configs" });
            return null;
        }
        if (this.circuitBreaker.isOpen(step.providerId, accountLabel)) {
            attempts.push({
                providerId: step.providerId,
                model: step.model,
                error: `circuito aberto (falhas recentes demais) — pulando até cooldown`,
            });
            return null;
        }
        const credential = providerDef.authMethod === "none" ? {} : await this.secretStore.getCredential(step.providerId, accountLabel);
        if (providerDef.authMethod !== "none" && !credential) {
            attempts.push({ providerId: step.providerId, model: step.model, error: "sem credencial configurada" });
            return null;
        }
        const baseUrl = config?.customBaseUrl ?? providerDef.baseUrl;
        if (!baseUrl) {
            attempts.push({ providerId: step.providerId, model: step.model, error: "baseUrl não definida" });
            return null;
        }
        if (!(0, validate_base_url_1.isSafeBaseUrl)(baseUrl)) {
            attempts.push({ providerId: step.providerId, model: step.model, error: validate_base_url_1.UNSAFE_BASE_URL_ERROR });
            return null;
        }
        const models = step.models && step.models.length ? step.models : step.model ? [step.model] : [];
        if (models.length === 0) {
            attempts.push({ providerId: step.providerId, model: "<sem modelo>", error: "step sem modelo definido" });
            return null;
        }
        const isExhausted = typeof this.accountRotator.isExhausted === "function" ? this.accountRotator.isExhausted.bind(this.accountRotator) : null;
        const release = await this.rateLimiter.acquire(step.providerId, accountLabel);
        try {
            for (const model of models) {
                // Se um modelo anterior deste provider estourou quota (rate-limit),
                // a conta entra em cooldown: nao adianta tentar outro modelo do MESMO
                // provider (mesma conta/token) - pula pro proximo step (outro provider).
                if (isExhausted && isExhausted(step.providerId, accountLabel)) {
                    break;
                }
                const perModelStep = { ...step, model, models: undefined };
                const result = await this.callAdapterWithRetry(combo, perModelStep, stepIndex, messages, request, attempts, baseUrl, credential, accountLabel, providerDef, onChunk);
                if (result) {
                    return result;
                }
            }
            return null;
        }
        finally {
            release();
        }
    }
    async callAdapterWithRetry(combo, step, stepIndex, messages, request, attempts, baseUrl, credential, accountLabel, providerDef, onChunk) {
        const adapter = (0, registry_2.getAdapter)(providerDef.wireFormat);
        const startedAt = Date.now();
        let lastError;
        for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
            try {
                const callOpts = {
                    baseUrl,
                    model: step.model,
                    credential: credential ?? {},
                    maxTokens: request.maxTokens,
                    temperature: request.temperature,
                    tools: request.tools,
                    tool_choice: request.tool_choice,
                    proxyPool: request.proxyPool,
                };
                const raw = onChunk && adapter.completeStream
                    ? await adapter.completeStream(messages, callOpts, onChunk)
                    : await adapter.complete(messages, callOpts);
                if (raw.responseHeaders)
                    this.quotaTracker.ingestHeaders(step.providerId, accountLabel, raw.responseHeaders);
                this.circuitBreaker.recordSuccess(step.providerId, accountLabel);
                const usage = {
                    timestamp: startedAt,
                    comboId: combo.id,
                    stepIndex,
                    providerId: step.providerId,
                    model: step.model,
                    promptTokens: raw.promptTokens,
                    completionTokens: raw.completionTokens,
                    latencyMs: Date.now() - startedAt,
                    success: true,
                    estimatedCostUsd: providerDef.tier === "free" ? 0 : (0, model_pricing_1.estimateCostUsd)(step.providerId, step.model, raw.promptTokens, raw.completionTokens),
                    cacheHit: false,
                };
                await this.usageLogStore.record(usage);
                return {
                    content: raw.content,
                    providerId: step.providerId,
                    model: step.model,
                    stepIndex,
                    usage,
                    ...(raw.toolCalls && raw.toolCalls.length > 0 ? { tool_calls: raw.toolCalls } : {}),
                };
            }
            catch (err) {
                lastError = err;
                const isRateLimit = err instanceof types_1.ProviderCallError && err.isRateLimit;
                const isServerError = err instanceof types_1.ProviderCallError && err.isServerError;
                if (isRateLimit && typeof this.accountRotator.markExhausted === "function") {
                    // quota exaurida: pausa SÓ esta conta por um cooldown (default 60s),
                    // deixa as demais contas/providers do combo seguirem normalmente.
                    this.accountRotator.markExhausted(step.providerId, accountLabel, { cooldownMs: step.exhaustionCooldownMs });
                }
                if (!(isRateLimit || isServerError) || attempt === step.maxRetries)
                    break;
                const backoffMs = 500 * (attempt + 1) + Math.random() * 250; // jitter evita "thundering herd" se vários agentes retentarem juntos
                await sleep(backoffMs);
            }
        }
        this.circuitBreaker.recordFailure(step.providerId, accountLabel);
        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        attempts.push({ providerId: step.providerId, model: step.model, error: errorMessage });
        await this.usageLogStore.record({
            timestamp: startedAt,
            comboId: combo.id,
            stepIndex,
            providerId: step.providerId,
            model: step.model,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: Date.now() - startedAt,
            success: false,
            errorCode: lastError instanceof types_1.ProviderCallError ? String(lastError.statusCode) : "unknown",
            estimatedCostUsd: 0,
            cacheHit: false,
        });
        return null;
    }
}
exports.ModelRouter = ModelRouter;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=model-router.js.map