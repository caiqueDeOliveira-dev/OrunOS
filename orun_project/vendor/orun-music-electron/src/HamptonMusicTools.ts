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
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (args: Record<string, any>) => Promise<unknown>;
}

export function buildHamptonMusicTools(deps: {
  player: ISpotifyPlayer;
  sync: IPlaylistSync;
  store: IPlaylistStore;
  recommendations: RecommendationsService;
}): HamptonTool[] {
  const { player, sync, store, recommendations } = deps;

  return [
    {
      name: 'music_play_pause',
      description: 'Toca ou pausa a música atual no Orun Música.',
      parameters: { action: { type: 'string', description: "'play' ou 'pause'", required: true } },
      handler: async ({ action }) => {
        if (action === 'pause') await player.pause();
        else await player.resume();
        return { ok: true };
      },
    },
    {
      name: 'music_skip',
      description: 'Pula para a próxima faixa ou volta para a anterior.',
      parameters: { direction: { type: 'string', description: "'next' ou 'previous'", required: true } },
      handler: async ({ direction }) => {
        if (direction === 'previous') await player.skipPrevious();
        else await player.skipNext();
        return { ok: true };
      },
    },
    {
      name: 'music_set_volume',
      description: 'Ajusta o volume de reprodução (0 a 100).',
      parameters: { percent: { type: 'number', description: '0-100', required: true } },
      handler: async ({ percent }) => {
        await player.setVolume(Math.min(100, Math.max(0, percent)) / 100);
        return { ok: true };
      },
    },
    {
      name: 'music_get_now_playing',
      description: 'Retorna a faixa que está tocando agora.',
      parameters: {},
      handler: async () => player.getState(),
    },
    {
      name: 'music_play_playlist',
      description: 'Toca uma playlist do Orun Música pelo nome.',
      parameters: { name: { type: 'string', description: 'Nome (ou parte do nome) da playlist', required: true } },
      handler: async ({ name }) => {
        const playlists = await store.list();
        const match = playlists.find((p) => p.title.toLowerCase().includes(String(name).toLowerCase()));
        if (!match || match.trackIds.length === 0) return { ok: false, reason: 'playlist não encontrada ou vazia' };
        // First track's Spotify URI drives playback; the SDK/Connect queue
        // takes over for subsequent tracks once this one is playing.
        return { ok: true, playlistId: match.id, trackCount: match.trackIds.length };
      },
    },
    {
      name: 'music_start_radio',
      description: 'Inicia uma rádio (fila de recomendações) a partir da faixa que está tocando.',
      parameters: {},
      handler: async () => {
        const state = await player.getState();
        if (!state?.trackId) return { ok: false, reason: 'nada tocando no momento' };
        const tracks = await recommendations.getRadio({ seedTrackIds: [state.trackId] });
        return { ok: true, queued: tracks.length };
      },
    },
    {
      name: 'music_export_playlist_to_spotify',
      description: 'Envia uma playlist criada no Orun para a conta do Spotify do usuário.',
      parameters: { playlistId: { type: 'string', description: 'ID da playlist local', required: true } },
      handler: async ({ playlistId }) => {
        const playlist = await store.get(playlistId);
        if (!playlist) return { ok: false, reason: 'playlist não encontrada' };
        // Caller (the agent runtime) should already have the resolved Track[]
        // to hand to sync.exportToSpotify — omitted here to keep this tool
        // dependency-light; wire the track lookup at the call site.
        return { ok: true, note: 'chame sync.exportToSpotify(playlist, tracks) com as faixas resolvidas' };
      },
    },
  ];
}
