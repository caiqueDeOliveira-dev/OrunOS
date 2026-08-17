"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRouterEmbeddingProvider = void 0;
/**
 * Usa um combo kind="media" com um provider capability="embeddings" real
 * (OpenAI, Cohere, Nebius, etc — qualquer um do registry que suporte).
 * Só ligue isso se você já tem um combo de embeddings configurado; até lá,
 * o `LocalHashEmbeddingProvider` cobre o caso básico sem custo nenhum.
 */
class MediaRouterEmbeddingProvider {
    mediaRouter;
    embeddingComboId;
    kind = "provider";
    constructor(mediaRouter, embeddingComboId) {
        this.mediaRouter = mediaRouter;
        this.embeddingComboId = embeddingComboId;
    }
    async embed(text) {
        const result = await this.mediaRouter.complete({ comboId: this.embeddingComboId, kind: "embeddings", prompt: text });
        if (!result.embedding)
            throw new Error(`Combo "${this.embeddingComboId}" não retornou embedding.`);
        return result.embedding;
    }
}
exports.MediaRouterEmbeddingProvider = MediaRouterEmbeddingProvider;
//# sourceMappingURL=media-router-embedding-provider.js.map