import type { TelemetryEvent, IdentifyTraits } from "./schema";

export type { IdentifyTraits };

/**
 * ITelemetryStore
 *
 * Mesma filosofia do ISecretStore / ISettingsStore: o core (e qualquer
 * agente do Hampton Circle) nunca sabe qual provider está por trás.
 * Hoje é PostHog self-hosted; amanhã pode ser Umami, ou um coletor
 * proprietário, sem tocar em nenhum agente.
 */
export interface ITelemetryStore {
  /** Nome do provider concreto, só para debug/logs internos. */
  readonly providerName: string;

  /** Enfileira um evento (envelope preenchido pelo core). */
  track(payload: TelemetryEvent): Promise<void>;

  /** Força o envio imediato do buffer (ex: antes de fechar o app). */
  flush(): Promise<void>;

  /** Associa a sessão atual a um usuário identificado. */
  identify(userId: string, traits?: IdentifyTraits): Promise<void>;

  /** Encerra conexões/recursos. Chamado no shutdown do app. */
  shutdown(): Promise<void>;
}

/**
 * IMetricsReader
 *
 * Interface separada (read-side) para o dashboard React consultar
 * agregações sem acoplar ao SDK de escrita do provider.
 */
export interface AgentHealthSnapshot {
  agentId: string;
  invocations24h: number;
  errorRate24h: number; // 0-1
  avgResponseTimeMs: number;
  actionRegistrationRate: number; // 0-1, detecta regressão tipo workspace-juridico
}

export interface IMetricsReader {
  getAgentHealth(agentId: string): Promise<AgentHealthSnapshot>;
  getAllAgentsHealth(): Promise<AgentHealthSnapshot[]>;
  getMcpSuccessRate(
    mcpName: string,
    windowHours?: number
  ): Promise<number>;
}
