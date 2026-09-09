import { randomUUID } from "node:crypto";
import type { TelemetryClient } from "@orun/telemetry-core";
import { sanitizeError } from "@orun/telemetry-core";

/**
 * instrumentAgent
 *
 * Envolve o handler real de um agente do Hampton Circle e emite
 * automaticamente os eventos: agent.invoked, agent.response_time,
 * agent.error e agent.action_registered.
 *
 * Objetivo: nenhum agente precisa chamar telemetry.track() manualmente
 * em vários pontos - basta envolver a função de invocação uma vez.
 *
 * O contrato do handler é o mesmo já usado nos agentes do Módulo 7
 * (Git Intelligence, Semgrep, Context7, Test Generator, Code Review):
 * recebe um input qualquer e retorna um AgentInvocationResult.
 */

export interface AgentInvocationResult<T = unknown> {
  /** Payload de resposta do agente (texto, ação, o que for). */
  data: T;
  /**
   * Se o handler esperava disparar uma ação (ex: criar documento,
   * chamar um MCP, etc), declare aqui. Se omitido, assume-se que
   * não havia ação esperada (resposta puramente informativa).
   */
  expectedAction?: string;
  /** Se expectedAction foi definido, isto precisa refletir se ela ocorreu. */
  actionRegistered?: boolean;
  /** Skills usadas nesta invocação, para correlação no painel. */
  skillsUsed?: string[];
  /** Provider do ai-router que respondeu, se aplicável. */
  provider?: string;
}

export interface InstrumentAgentOptions {
  telemetry: TelemetryClient;
  agentId: string;
  agentName: string;
  circleModule?: string;
}

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
export function instrumentAgent<TInput, TOutput>(
  options: InstrumentAgentOptions,
  handler: (input: TInput) => Promise<AgentInvocationResult<TOutput>>
): (input: TInput) => Promise<TOutput> {
  const { telemetry, agentId, agentName, circleModule } = options;

  return async (input: TInput): Promise<TOutput> => {
    const invocationId = randomUUID();
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
    } catch (error) {
      const { errorCode, sanitizedMessage } = sanitizeError(error);
      const boundaryTriggered = isBoundaryError(error);
      await telemetry.track({
        type: "agent.error",
        agentId,
        errorCode,
        sanitizedMessage,
        boundaryTriggered,
      });
      throw error; // instrumentação nunca engole o erro original
    } finally {
      void invocationId; // reservado para correlação futura (trace id)
    }
  };
}

/**
 * Heurística simples para flagar erros de boundary (o tipo de erro que
 * caracterizava o bug do AssistenteTecnico). Detecta pelo nome do erro
 * ou por uma flag explícita `isBoundaryError` no objeto de erro.
 */
function isBoundaryError(error: unknown): boolean {
  if (error instanceof Error) {
    if (/boundary/i.test(error.name)) return true;
    if (
      "isBoundaryError" in error &&
      (error as { isBoundaryError?: unknown }).isBoundaryError === true
    ) {
      return true;
    }
  }
  return false;
}
