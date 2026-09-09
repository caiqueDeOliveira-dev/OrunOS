import type {
  IMetricsReader,
  AgentHealthSnapshot,
} from "@orun/telemetry-core";

export interface PostHogMetricsReaderConfig {
  host: string;
  /** Personal API key (diferente da project key usada para track). */
  personalApiKey: string;
  projectId: string;
}

/**
 * PostHogMetricsReader
 *
 * Lado de leitura, separado da escrita (posthog-store.ts).
 * Usa a Query API (HogQL) do PostHog self-hosted para alimentar o
 * painel React (useAgentMetrics) sem duplicar lógica de agregação.
 *
 * NOTA: requer PostHog >= 1.40 self-hosted com HogQL habilitado.
 */
export class PostHogMetricsReader implements IMetricsReader {
  constructor(private readonly config: PostHogMetricsReaderConfig) {}

  private async runQuery<T>(hogql: string): Promise<T[]> {
    const response = await fetch(
      `${this.config.host}/api/projects/${this.config.projectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.personalApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query: hogql },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `[@orun/telemetry] Falha na query PostHog: ${response.status}`
      );
    }

    const data = (await response.json()) as { results: T[] };
    return data.results;
  }

  async getAgentHealth(agentId: string): Promise<AgentHealthSnapshot> {
    const all = await this.getAllAgentsHealth();
    const found = all.find((snapshot) => snapshot.agentId === agentId);
    if (found) return found;

    // Sem dados ainda registrados para esse agente.
    return {
      agentId,
      invocations24h: 0,
      errorRate24h: 0,
      avgResponseTimeMs: 0,
      actionRegistrationRate: 1,
    };
  }

  async getAllAgentsHealth(): Promise<AgentHealthSnapshot[]> {
    // Consulta simplificada e comentada - ajustar nomes de propriedade
    // conforme o schema real de eventos capturado pelo posthog-store.
    const rows = await this.runQuery<{
      agentId: string;
      invocations: number;
      errors: number;
      avgMs: number;
      actionsExpected: number;
      actionsRegistered: number;
    }>(`
      SELECT
        properties.agentId as agentId,
        countIf(event = 'agent.invoked') as invocations,
        countIf(event = 'agent.error') as errors,
        avgIf(toFloat(properties.durationMs), event = 'agent.response_time') as avgMs,
        countIf(event = 'agent.action_registered') as actionsExpected,
        countIf(event = 'agent.action_registered' AND properties.actionRegistered = true) as actionsRegistered
      FROM events
      WHERE timestamp > now() - INTERVAL 24 HOUR
      GROUP BY properties.agentId
    `);

    return rows.map((row) => ({
      agentId: row.agentId,
      invocations24h: row.invocations,
      errorRate24h: row.invocations > 0 ? row.errors / row.invocations : 0,
      avgResponseTimeMs: row.avgMs || 0,
      actionRegistrationRate:
        row.actionsExpected > 0
          ? row.actionsRegistered / row.actionsExpected
          : 1,
    }));
  }

  async getMcpSuccessRate(
    mcpName: string,
    windowHours = 24
  ): Promise<number> {
    const rows = await this.runQuery<{ total: number; success: number }>(`
      SELECT
        count() as total,
        countIf(properties.success = true) as success
      FROM events
      WHERE event = 'mcp.call'
        AND properties.mcpName = '${mcpName}'
        AND timestamp > now() - INTERVAL ${windowHours} HOUR
    `);

    const row = rows[0];
    if (!row || row.total === 0) return 1;
    return row.success / row.total;
  }
}
