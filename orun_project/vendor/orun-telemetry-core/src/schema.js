"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifyTraitsSchema = exports.TelemetryEventSchema = exports.TelemetryPayloadSchema = exports.UserSessionPayloadSchema = exports.McpCallPayloadSchema = exports.AgentActionRegisteredPayloadSchema = exports.AgentErrorPayloadSchema = exports.AgentResponseTimePayloadSchema = exports.AgentInvokedPayloadSchema = exports.TelemetryEnvelopeSchema = void 0;
const zod_1 = require("zod");
/**
 * @orun/telemetry - Event Schema
 *
 * Schema-first, seguindo o padrão do @orun/settings.
 * Todo evento tem um "envelope" comum + payload específico por tipo.
 */
// ---------------------------------------------------------------------------
// Envelope comum a todo evento
// ---------------------------------------------------------------------------
exports.TelemetryEnvelopeSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    sessionId: zod_1.z.string(),
    userId: zod_1.z.string().optional(), // opcional: nem todo evento tem usuário identificado
    platform: zod_1.z.enum(["desktop", "mobile", "tv", "kiosk", "homelab"]),
    appVersion: zod_1.z.string(),
});
// ---------------------------------------------------------------------------
// Payloads por tipo de evento
// ---------------------------------------------------------------------------
exports.AgentInvokedPayloadSchema = zod_1.z.object({
    type: zod_1.z.literal("agent.invoked"),
    agentId: zod_1.z.string(),
    agentName: zod_1.z.string(),
    circleModule: zod_1.z.string().optional(), // ex: "dev-code-review"
    skillsUsed: zod_1.z.array(zod_1.z.string()).default([]),
    inputTokens: zod_1.z.number().int().nonnegative().optional(),
});
exports.AgentResponseTimePayloadSchema = zod_1.z.object({
    type: zod_1.z.literal("agent.response_time"),
    agentId: zod_1.z.string(),
    durationMs: zod_1.z.number().nonnegative(),
    provider: zod_1.z.string().optional(), // qual provider do ai-router respondeu
});
exports.AgentErrorPayloadSchema = zod_1.z.object({
    type: zod_1.z.literal("agent.error"),
    agentId: zod_1.z.string(),
    errorCode: zod_1.z.string(),
    // stack é sempre sanitizado antes de chegar aqui - ver sanitize.ts
    sanitizedMessage: zod_1.z.string(),
    boundaryTriggered: zod_1.z.boolean().default(false),
});
/**
 * Evento crítico: resolve exatamente a classe de bug que gerou
 * workspace-juridico (resposta em texto sem ação registrada).
 */
exports.AgentActionRegisteredPayloadSchema = zod_1.z.object({
    type: zod_1.z.literal("agent.action_registered"),
    agentId: zod_1.z.string(),
    expectedAction: zod_1.z.string(),
    actionRegistered: zod_1.z.boolean(),
    responseModality: zod_1.z.enum(["text_only", "action", "text_and_action"]),
});
exports.McpCallPayloadSchema = zod_1.z.object({
    type: zod_1.z.literal("mcp.call"),
    mcpName: zod_1.z.enum(["calendar", "gmail", "figma", "github"]),
    agentId: zod_1.z.string(),
    success: zod_1.z.boolean(),
    durationMs: zod_1.z.number().nonnegative().optional(),
    errorCode: zod_1.z.string().optional(),
});
exports.UserSessionPayloadSchema = zod_1.z.object({
    type: zod_1.z.literal("user.session"),
    action: zod_1.z.enum(["start", "end"]),
    durationMs: zod_1.z.number().nonnegative().optional(), // presente só em "end"
});
exports.TelemetryPayloadSchema = zod_1.z.discriminatedUnion("type", [
    exports.AgentInvokedPayloadSchema,
    exports.AgentResponseTimePayloadSchema,
    exports.AgentErrorPayloadSchema,
    exports.AgentActionRegisteredPayloadSchema,
    exports.McpCallPayloadSchema,
    exports.UserSessionPayloadSchema,
]);
// ---------------------------------------------------------------------------
// Evento completo (envelope + payload)
// ---------------------------------------------------------------------------
exports.TelemetryEventSchema = exports.TelemetryEnvelopeSchema.and(exports.TelemetryPayloadSchema);
// ---------------------------------------------------------------------------
// Traits de identificação de usuário (nunca inclui PII sensível por padrão)
// ---------------------------------------------------------------------------
exports.IdentifyTraitsSchema = zod_1.z
    .object({
    plan: zod_1.z.string().optional(),
    circleModulesEnabled: zod_1.z.array(zod_1.z.string()).optional(),
})
    .catchall(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()]));
