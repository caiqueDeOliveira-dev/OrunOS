import type { IMetricsReader, AgentHealthSnapshot } from "@orun/telemetry-core";
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
export declare class PostHogMetricsReader implements IMetricsReader {
    private readonly config;
    constructor(config: PostHogMetricsReaderConfig);
    private runQuery;
    getAgentHealth(agentId: string): Promise<AgentHealthSnapshot>;
    getAllAgentsHealth(): Promise<AgentHealthSnapshot[]>;
    getMcpSuccessRate(mcpName: string, windowHours?: number): Promise<number>;
}
