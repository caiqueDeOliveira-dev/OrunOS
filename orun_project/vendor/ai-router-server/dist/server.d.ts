import { type Server } from "node:http";
import { type IComboStore, type IModelRouter, type IProviderConfigStore, type IUsageLogStore, type TokenSaverConfig, type ProxyPoolConfig, type MediaRouter } from "@orun/ai-router-core";
export interface BudgetConfig {
    daily: number;
    monthly: number;
    alertThreshold: number;
}
export declare class AppSettingsStore {
    private db;
    private stmtGet;
    private stmtSet;
    private stmtGetAll;
    private stmtDelete;
    constructor(db: any);
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    getAll(): Promise<Record<string, string>>;
    getTokenSaverConfig(): Promise<TokenSaverConfig>;
    setTokenSaverConfig(config: TokenSaverConfig): Promise<void>;
    getProxyPoolConfig(): Promise<ProxyPoolConfig>;
    setProxyPoolConfig(config: ProxyPoolConfig): Promise<void>;
    getBudget(): Promise<BudgetConfig>;
    setBudget(budget: BudgetConfig): Promise<void>;
}
export interface AiRouterServerOptions {
    router: IModelRouter;
    comboStore: IComboStore;
    providerConfigStore?: IProviderConfigStore;
    usageStore?: IUsageLogStore;
    mediaRouter?: MediaRouter;
    /** Se definida, exige `Authorization: Bearer <apiKey>` em todas as rotas /v1/*. */
    apiKey?: string;
    /** Metadata opcional para o dashboard. */
    meta?: {
        dbPath?: string;
        defaultComboId?: string;
    };
    /** Caminho para a pasta dist/ do dashboard buildado. Se definido, serve /dashboard. */
    dashboardDir?: string;
    /** Caminho para o arquivo SQLite para persistir settings (token-saver, proxy-pool, budget). Se definido, cria um AppSettingsStore. */
    dbPath?: string;
}
/**
 * Servidor HTTP que expõe o router como uma API OpenAI-compatible
 * (`POST /v1/chat/completions`, `GET /v1/models`) e Anthropic
 * (`POST /v1/messages`). Permite apontar qualquer tool que fale esses
 * formatos pro Orun Router como baseURL — e ganhar fallback de providers
 * free de graça.
 */
export declare function createAiRouterServer(options: AiRouterServerOptions): Server & {
    settingsStore?: AppSettingsStore;
};
