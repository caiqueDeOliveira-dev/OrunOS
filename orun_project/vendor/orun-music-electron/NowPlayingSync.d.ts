import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
/**
 * Minimal shape of the @orun/sync client this needs. Match this to
 * whatever `@orun/sync`'s actual exported client interface looks like —
 * kept narrow here so this file doesn't need the whole sync package's
 * type surface, just publish/subscribe on a channel.
 */
export interface ISyncChannel {
    publish(key: string, value: unknown): Promise<void>;
    subscribe(key: string, callback: (value: unknown) => void): () => void;
}
export declare class NowPlayingSync {
    private readonly player;
    private readonly sync;
    private readonly deviceLabel;
    private lastPublish;
    private unsubscribe;
    constructor(player: ISpotifyPlayer, sync: ISyncChannel, deviceLabel: string);
    start(): void;
    stop(): void;
    private maybePublish;
}
//# sourceMappingURL=NowPlayingSync.d.ts.map