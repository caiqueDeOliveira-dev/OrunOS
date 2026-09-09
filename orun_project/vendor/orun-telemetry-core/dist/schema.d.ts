import { z } from "zod";
/**
 * @orun/telemetry - Event Schema
 *
 * Schema-first, seguindo o padrão do @orun/settings.
 * Todo evento tem um "envelope" comum + payload específico por tipo.
 */
export declare const TelemetryEnvelopeSchema: z.ZodObject<{
    eventId: z.ZodString;
    timestamp: z.ZodString;
    sessionId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    platform: z.ZodEnum<{
        desktop: "desktop";
        mobile: "mobile";
        tv: "tv";
        kiosk: "kiosk";
        homelab: "homelab";
    }>;
    appVersion: z.ZodString;
}, z.core.$strip>;
export type TelemetryEnvelope = z.infer<typeof TelemetryEnvelopeSchema>;
export declare const AgentInvokedPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"agent.invoked">;
    agentId: z.ZodString;
    agentName: z.ZodString;
    circleModule: z.ZodOptional<z.ZodString>;
    skillsUsed: z.ZodDefault<z.ZodArray<z.ZodString>>;
    inputTokens: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const AgentResponseTimePayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"agent.response_time">;
    agentId: z.ZodString;
    durationMs: z.ZodNumber;
    provider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AgentErrorPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"agent.error">;
    agentId: z.ZodString;
    errorCode: z.ZodString;
    sanitizedMessage: z.ZodString;
    boundaryTriggered: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Evento crítico: resolve exatamente a classe de bug que gerou
 * workspace-juridico (resposta em texto sem ação registrada).
 */
export declare const AgentActionRegisteredPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"agent.action_registered">;
    agentId: z.ZodString;
    expectedAction: z.ZodString;
    actionRegistered: z.ZodBoolean;
    responseModality: z.ZodEnum<{
        text_only: "text_only";
        action: "action";
        text_and_action: "text_and_action";
    }>;
}, z.core.$strip>;
export declare const McpCallPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"mcp.call">;
    mcpName: z.ZodEnum<{
        calendar: "calendar";
        gmail: "gmail";
        figma: "figma";
        github: "github";
    }>;
    agentId: z.ZodString;
    success: z.ZodBoolean;
    durationMs: z.ZodOptional<z.ZodNumber>;
    errorCode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const UserSessionPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"user.session">;
    action: z.ZodEnum<{
        start: "start";
        end: "end";
    }>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const TelemetryPayloadSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"agent.invoked">;
    agentId: z.ZodString;
    agentName: z.ZodString;
    circleModule: z.ZodOptional<z.ZodString>;
    skillsUsed: z.ZodDefault<z.ZodArray<z.ZodString>>;
    inputTokens: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"agent.response_time">;
    agentId: z.ZodString;
    durationMs: z.ZodNumber;
    provider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"agent.error">;
    agentId: z.ZodString;
    errorCode: z.ZodString;
    sanitizedMessage: z.ZodString;
    boundaryTriggered: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"agent.action_registered">;
    agentId: z.ZodString;
    expectedAction: z.ZodString;
    actionRegistered: z.ZodBoolean;
    responseModality: z.ZodEnum<{
        text_only: "text_only";
        action: "action";
        text_and_action: "text_and_action";
    }>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"mcp.call">;
    mcpName: z.ZodEnum<{
        calendar: "calendar";
        gmail: "gmail";
        figma: "figma";
        github: "github";
    }>;
    agentId: z.ZodString;
    success: z.ZodBoolean;
    durationMs: z.ZodOptional<z.ZodNumber>;
    errorCode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"user.session">;
    action: z.ZodEnum<{
        start: "start";
        end: "end";
    }>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "type">;
export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;
export type TelemetryEventType = TelemetryPayload["type"];
export declare const TelemetryEventSchema: z.ZodIntersection<z.ZodObject<{
    eventId: z.ZodString;
    timestamp: z.ZodString;
    sessionId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    platform: z.ZodEnum<{
        desktop: "desktop";
        mobile: "mobile";
        tv: "tv";
        kiosk: "kiosk";
        homelab: "homelab";
    }>;
    appVersion: z.ZodString;
}, z.core.$strip>, z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"agent.invoked">;
    agentId: z.ZodString;
    agentName: z.ZodString;
    circleModule: z.ZodOptional<z.ZodString>;
    skillsUsed: z.ZodDefault<z.ZodArray<z.ZodString>>;
    inputTokens: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"agent.response_time">;
    agentId: z.ZodString;
    durationMs: z.ZodNumber;
    provider: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"agent.error">;
    agentId: z.ZodString;
    errorCode: z.ZodString;
    sanitizedMessage: z.ZodString;
    boundaryTriggered: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"agent.action_registered">;
    agentId: z.ZodString;
    expectedAction: z.ZodString;
    actionRegistered: z.ZodBoolean;
    responseModality: z.ZodEnum<{
        text_only: "text_only";
        action: "action";
        text_and_action: "text_and_action";
    }>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"mcp.call">;
    mcpName: z.ZodEnum<{
        calendar: "calendar";
        gmail: "gmail";
        figma: "figma";
        github: "github";
    }>;
    agentId: z.ZodString;
    success: z.ZodBoolean;
    durationMs: z.ZodOptional<z.ZodNumber>;
    errorCode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"user.session">;
    action: z.ZodEnum<{
        start: "start";
        end: "end";
    }>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "type">>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export declare const IdentifyTraitsSchema: z.ZodObject<{
    plan: z.ZodOptional<z.ZodString>;
    circleModulesEnabled: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>>;
export type IdentifyTraits = z.infer<typeof IdentifyTraitsSchema>;
