import type { ISpotifyPlayer, IPlaylistSync, IPlaylistStore } from '@orun/music-core/interfaces';
import type { RecommendationsService } from './RecommendationsService';
/**
 * Matches the shape Hampton's agent runtime expects for a tool
 * definition — adjust `name`/`schema` fields if Módulo 7's tool
 * registration format differs from this. The important part is the
 * `handler` closures below, which just call the same services the UI uses.
 */
interface HamptonTool {
    name: string;
    description: string;
    parameters: Record<string, {
        type: string;
        description: string;
        required?: boolean;
    }>;
    handler: (args: Record<string, any>) => Promise<unknown>;
}
export declare function buildHamptonMusicTools(deps: {
    player: ISpotifyPlayer;
    sync: IPlaylistSync;
    store: IPlaylistStore;
    recommendations: RecommendationsService;
}): HamptonTool[];
export {};
//# sourceMappingURL=HamptonMusicTools.d.ts.map