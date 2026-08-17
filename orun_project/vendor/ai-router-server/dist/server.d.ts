import { type Server } from "node:http";
import { type IComboStore, type IModelRouter } from "@orun/ai-router-core";
export interface AiRouterServerOptions {
    router: IModelRouter;
    comboStore: IComboStore;
    /** Se definida, exige `Authorization: Bearer <apiKey>` em todas as rotas /v1/*. */
    apiKey?: string;
}
/**
 * Servidor HTTP que expõe o router como uma API OpenAI-compatible
 * (`POST /v1/chat/completions`, `GET /v1/models`) e Anthropic
 * (`POST /v1/messages`). Permite apontar qualquer tool que fale esses
 * formatos pro Orun Router como baseURL — e ganhar fallback de providers
 * free de graça.
 */
export declare function createAiRouterServer(options: AiRouterServerOptions): Server;
