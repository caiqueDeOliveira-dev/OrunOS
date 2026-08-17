import type { MediaRouter } from "../router/media-router";
import type { IEmbeddingProvider } from "./embedding-provider";
/**
 * Usa um combo kind="media" com um provider capability="embeddings" real
 * (OpenAI, Cohere, Nebius, etc — qualquer um do registry que suporte).
 * Só ligue isso se você já tem um combo de embeddings configurado; até lá,
 * o `LocalHashEmbeddingProvider` cobre o caso básico sem custo nenhum.
 */
export declare class MediaRouterEmbeddingProvider implements IEmbeddingProvider {
    private readonly mediaRouter;
    private readonly embeddingComboId;
    readonly kind: "provider";
    constructor(mediaRouter: MediaRouter, embeddingComboId: string);
    embed(text: string): Promise<number[]>;
}
