import type { TelemetryClient } from "@orun/telemetry-core";
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
export declare function instrumentAgent<TInput, TOutput>(options: InstrumentAgentOptions, handler: (input: TInput) => Promise<AgentInvocationResult<TOutput>>): (input: TInput) => Promise<TOutput>;
