"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentAgent = instrumentAgent;
const node_crypto_1 = require("node:crypto");
const telemetry_core_1 = require("@orun/telemetry-core");
/**
 * Envolve um handler de agente. Uso típico no registro do agente:
 *
 *   const handler = instrumentAgent(
 *     { telemetry, agentId: "code-review", agentName: "Code Review", circleModule: "dev-code-review" },
 *     async (input) => {
 *       const result = await runCodeReview(input);
 *       return { data: result, expectedAction: "post_review_comment", actionRegistered: result.commentPosted };
 *     }
 *   );
 */
function instrumentAgent(options, handler) {
    const { telemetry, agentId, agentName, circleModule } = options;
    return async (input) => {
        const invocationId = (0, node_crypto_1.randomUUID)();
        const startedAt = Date.now();
        await telemetry.track({
            type: "agent.invoked",
            agentId,
            agentName,
            circleModule,
            skillsUsed: [],
        });
        try {
            const result = await handler(input);
            const durationMs = Date.now() - startedAt;
            await telemetry.track({
                type: "agent.response_time",
                agentId,
                durationMs,
                provider: result.provider,
            });
            if (result.expectedAction) {
                await telemetry.track({
                    type: "agent.action_registered",
                    agentId,
                    expectedAction: result.expectedAction,
                    actionRegistered: result.actionRegistered ?? false,
                    responseModality: result.actionRegistered
                        ? "text_and_action"
                        : "text_only",
                });
            }
            return result.data;
        }
        catch (error) {
            const { errorCode, sanitizedMessage } = (0, telemetry_core_1.sanitizeError)(error);
            const boundaryTriggered = isBoundaryError(error);
            await telemetry.track({
                type: "agent.error",
                agentId,
                errorCode,
                sanitizedMessage,
                boundaryTriggered,
            });
            throw error; // instrumentação nunca engole o erro original
        }
        finally {
            void invocationId; // reservado para correlação futura (trace id)
        }
    };
}
/**
 * Heurística simples para flagar erros de boundary (o tipo de erro que
 * caracterizava o bug do AssistenteTecnico). Detecta pelo nome do erro
 * ou por uma flag explícita `isBoundaryError` no objeto de erro.
 */
function isBoundaryError(error) {
    if (error instanceof Error) {
        if (/boundary/i.test(error.name))
            return true;
        if ("isBoundaryError" in error &&
            error.isBoundaryError === true) {
            return true;
        }
    }
    return false;
}
