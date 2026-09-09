import { z } from "zod";

/**
 * @orun/telemetry - Event Schema
 *
 * Schema-first, seguindo o padrão do @orun/settings.
 * Todo evento tem um "envelope" comum + payload específico por tipo.
 */

// ---------------------------------------------------------------------------
// Envelope comum a todo evento
// ---------------------------------------------------------------------------

export const TelemetryEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  sessionId: z.string(),
  userId: z.string().optional(), // opcional: nem todo evento tem usuário identificado
  platform: z.enum(["desktop", "mobile", "tv", "kiosk", "homelab"]),
  appVersion: z.string(),
});

export type TelemetryEnvelope = z.infer<typeof TelemetryEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Payloads por tipo de evento
// ---------------------------------------------------------------------------

export const AgentInvokedPayloadSchema = z.object({
  type: z.literal("agent.invoked"),
  agentId: z.string(),
  agentName: z.string(),
  circleModule: z.string().optional(), // ex: "dev-code-review"
  skillsUsed: z.array(z.string()).default([]),
  inputTokens: z.number().int().nonnegative().optional(),
});

export const AgentResponseTimePayloadSchema = z.object({
  type: z.literal("agent.response_time"),
  agentId: z.string(),
  durationMs: z.number().nonnegative(),
  provider: z.string().optional(), // qual provider do ai-router respondeu
});

export const AgentErrorPayloadSchema = z.object({
  type: z.literal("agent.error"),
  agentId: z.string(),
  errorCode: z.string(),
  // stack é sempre sanitizado antes de chegar aqui - ver sanitize.ts
  sanitizedMessage: z.string(),
  boundaryTriggered: z.boolean().default(false),
});

/**
 * Evento crítico: resolve exatamente a classe de bug que gerou
 * workspace-juridico (resposta em texto sem ação registrada).
 */
export const AgentActionRegisteredPayloadSchema = z.object({
  type: z.literal("agent.action_registered"),
  agentId: z.string(),
  expectedAction: z.string(),
  actionRegistered: z.boolean(),
  responseModality: z.enum(["text_only", "action", "text_and_action"]),
});

export const McpCallPayloadSchema = z.object({
  type: z.literal("mcp.call"),
  mcpName: z.enum(["calendar", "gmail", "figma", "github"]),
  agentId: z.string(),
  success: z.boolean(),
  durationMs: z.number().nonnegative().optional(),
  errorCode: z.string().optional(),
});

export const UserSessionPayloadSchema = z.object({
  type: z.literal("user.session"),
  action: z.enum(["start", "end"]),
  durationMs: z.number().nonnegative().optional(), // presente só em "end"
});

export const TelemetryPayloadSchema = z.discriminatedUnion("type", [
  AgentInvokedPayloadSchema,
  AgentResponseTimePayloadSchema,
  AgentErrorPayloadSchema,
  AgentActionRegisteredPayloadSchema,
  McpCallPayloadSchema,
  UserSessionPayloadSchema,
]);

export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;
export type TelemetryEventType = TelemetryPayload["type"];

// ---------------------------------------------------------------------------
// Evento completo (envelope + payload)
// ---------------------------------------------------------------------------

export const TelemetryEventSchema = TelemetryEnvelopeSchema.and(
  TelemetryPayloadSchema
);

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

// ---------------------------------------------------------------------------
// Traits de identificação de usuário (nunca inclui PII sensível por padrão)
// ---------------------------------------------------------------------------

export const IdentifyTraitsSchema = z
  .object({
    plan: z.string().optional(),
    circleModulesEnabled: z.array(z.string()).optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean()]));

export type IdentifyTraits = z.infer<typeof IdentifyTraitsSchema>;
