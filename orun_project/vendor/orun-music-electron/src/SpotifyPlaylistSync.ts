import type { IPlaylistSync } from '@orun/music-core/interfaces';
import type { Playlist, Track } from '@orun/music-core/schemas';

const API_BASE = 'https://api.spotify.com/v1';

interface SpotifyApiTrack {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
}
interface SpotifyApiPlaylist {
  id: string;
  name: string;
  description: string | null;
  tracks: { href: string; total: number };
}

export class SpotifyPlaylistSync implements IPlaylistSync {
  constructor(
    private readonly getAccessToken: () => Promise<string>, // ← plug in last
    private readonly getUserId: () => Promise<string>, // ← from GET /v1/me, once auth is wired
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Spotify API ${path} failed: ${res.status} ${await res.text()}`);
    }
    // 204 No Content responses (e.g. adding tracks) have no body to parse
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  async resolveTrackUri(title: string, artist: string): Promise<string | null> {
    const q = encodeURIComponent(`track:${title} artist:${artist}`);
    const data = await this.request<{ tracks: { items: SpotifyApiTrack[] } }>(
      `/search?q=${q}&type=track&limit=1`,
    );
    return data.tracks.items[0]?.uri ?? null;
  }

  async exportToSpotify(playlist: Playlist, tracks: Track[]): Promise<{ spotifyId: string }> {
    const userId = await this.getUserId();

    const created = await this.request<SpotifyApiPlaylist>(`/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name: playlist.title,
        description: playlist.description,
        public: false,
      }),
    });

    const uris = await this.resolveAllUris(tracks);
    await this.addTracksInBatches(created.id, uris);

    return { spotifyId: created.id };
  }

  async syncPlaylist(playlist: Playlist, tracks: Track[]): Promise<void> {
    if (!playlist.spotifyId) {
      throw new Error('syncPlaylist called on a playlist with no spotifyId — export it first');
    }
    const uris = await this.resolveAllUris(tracks);
    // Simplest correct approach: replace the full track list. A future
    // optimization can diff and send only additions/removals.
    await this.request(`/playlists/${playlist.spotifyId}/tracks`, {
      method: 'PUT',
      body: JSON.stringify({ uris: uris.slice(0, 100) }), // Spotify caps PUT at 100 URIs
    });
    if (uris.length > 100) {
      await this.addTracksInBatches(playlist.spotifyId, uris.slice(100));
    }
  }

  async importFromSpotify(): Promise<{ playlists: Playlist[]; tracks: Track[] }> {
    const { items } = await this.request<{ items: SpotifyApiPlaylist[] }>('/me/playlists?limit=50');

    const playlists: Playlist[] = [];
    const tracksById = new Map<string, Track>();

    for (const sp of items) {
      const trackIds: string[] = [];
      let next: string | null = `/playlists/${sp.id}/tracks?limit=100`;

      while (next) {
        const page: { items: { track: SpotifyApiTrack | null }[]; next: string | null } =
          await this.request(next.replace(API_BASE, ''));
        for (const { track } of page.items) {
          if (!track) continue; // local files / removed tracks come back null
          trackIds.push(track.id);
          tracksById.set(track.id, {
            id: track.id,
            spotifyUri: track.uri,
            title: track.name,
            artist: track.artists.map((a) => a.name).join(', '),
            album: track.album.name,
            durationMs: track.duration_ms,
            albumArtUrl: track.album.images[0]?.url ?? null,
          });
        }
        next = page.next;
      }

      const now = Date.now();
      playlists.push({
        id: `spotify-${sp.id}`,
        title: sp.name,
        description: sp.description ?? '',
        trackIds,
        source: 'spotify',
        spotifyId: sp.id,
        syncedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { playlists, tracks: [...tracksById.values()] };
  }

  private async resolveAllUris(tracks: Track[]): Promise<string[]> {
    const uris: string[] = [];
    for (const track of tracks) {
      if (track.spotifyUri) {
        uris.push(track.spotifyUri);
        continue;
      }
      const resolved = await this.resolveTrackUri(track.title, track.artist);
      if (resolved) uris.push(resolved);
      // Tracks that fail to resolve are silently skipped; surface these
      // to the UI as a "N faixas não encontradas no Spotify" summary.
    }
    return uris;
  }

  private async addTracksInBatches(playlistId: string, uris: string[]): Promise<void> {
    const BATCH = 100; // Spotify's per-request limit
    for (let i = 0; i < uris.length; i += BATCH) {
      await this.request(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: uris.slice(i, i + BATCH) }),
      });
    }
  }
}
