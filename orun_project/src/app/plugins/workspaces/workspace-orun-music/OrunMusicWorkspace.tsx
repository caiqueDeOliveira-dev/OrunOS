import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music, ListMusic, Radio, Mic2, Search, Loader2, Disc3
} from "lucide-react";
import { P, PremiumRoot, ScrollArea, Card, PrimaryButton, GhostButton, SectionHeader } from "../premium";
import { useTranslation } from "../../../../i18n/I18nProvider";

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
  uri: string;
}

interface PlaybackState {
  isPlaying: boolean;
  track: Track | null;
  positionMs: number;
  durationMs: number;
  volume: number;
}

interface LyricLine {
  timeMs: number;
  text: string;
}

type ViewMode = "player" | "playlists" | "lyrics" | "radio";

export function OrunMusicWorkspace() {
  const { t } = useTranslation();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false, track: null, positionMs: 0, durationMs: 0, volume: 0.7,
  });
  const [view, setView] = useState<ViewMode>("player");
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [currentLyricLine, setCurrentLyricLine] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spotify = (window as any).orun?.spotify;

  const mapPlayback = (s: any) => {
    if (!s) return;
    setPlayback({
      isPlaying: s.is_playing ?? false,
      track: s.item ? {
        id: s.item.id, name: s.item.name,
        artist: s.item.artists?.map((a: any) => a.name).join(", ") ?? "",
        album: s.item.album?.name ?? "",
        albumArt: s.item.album?.images?.[0]?.url ?? null,
        durationMs: s.item.duration_ms ?? 0, uri: s.item.uri ?? "",
      } : null,
      positionMs: s.progress_ms ?? 0,
      durationMs: s.item?.duration_ms ?? 0,
      volume: (s.device?.volume_percent ?? 70) / 100,
    });
  };

  const checkConn = useCallback(async () => {
    if (!spotify) return;
    try {
      const ok = await spotify.isConnected();
      setConnected(ok);
      if (ok) { const s = await spotify.getPlayback(); mapPlayback(s); }
    } catch { setConnected(false); }
  }, [spotify]);

  useEffect(() => { checkConn(); }, [checkConn]);

  const handleConnect = useCallback(async () => {
    if (!spotify) return;
    setConnecting(true); setError(null);
    try {
      const url = await spotify.getAuthUrl();
      if (url) {
        await spotify.startCallbackServer();
        window.open(url, "_blank");
        const poll = setInterval(async () => {
          if (await spotify.isConnected()) { clearInterval(poll); setConnected(true); setConnecting(false); await checkConn(); }
        }, 2000);
        setTimeout(() => { clearInterval(poll); setConnecting(false); }, 60000);
      }
    } catch (e: any) { setError(e.message); setConnecting(false); }
  }, [spotify, checkConn]);

  useEffect(() => {
    if (!connected || !spotify) return;
    progressRef.current = setInterval(async () => {
      try { const s = await spotify.getPlayback(); mapPlayback(s); } catch { /* */ }
    }, 3000);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [connected, spotify]);

  const togglePlay = useCallback(async () => {
    if (!spotify) return;
    try {
      if (playback.isPlaying) await spotify.pause(); else await spotify.play();
      setTimeout(async () => { const s = await spotify.getPlayback(); mapPlayback(s); }, 500);
    } catch (e: any) { setError(e.message); }
  }, [spotify, playback.isPlaying]);

  const skipNext = useCallback(async () => {
    if (!spotify) return;
    try { await spotify.skipNext(); setTimeout(async () => { const s = await spotify.getPlayback(); mapPlayback(s); }, 800); }
    catch (e: any) { setError(e.message); }
  }, [spotify]);

  const skipPrev = useCallback(async () => {
    if (!spotify) return;
    try { await spotify.skipPrevious(); setTimeout(async () => { const s = await spotify.getPlayback(); mapPlayback(s); }, 800); }
    catch (e: any) { setError(e.message); }
  }, [spotify]);

  const seek = useCallback(async (ms: number) => { if (spotify) try { await spotify.seek(ms); } catch { /* */ } }, [spotify]);

  const setVol = useCallback(async (v: number) => {
    if (!spotify) return;
    try { await spotify.setVolume(Math.round(v * 100)); setPlayback(p => ({ ...p, volume: v })); } catch { /* */ }
  }, [spotify]);

  const handleSearch = useCallback(async () => {
    if (!spotify || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await spotify.search(searchQuery, "track", 20);
      setSearchResults(r?.tracks?.items?.map((t: any) => ({
        id: t.id, name: t.name, artist: t.artists?.map((a: any) => a.name).join(", ") ?? "",
        album: t.album?.name ?? "", albumArt: t.album?.images?.[0]?.url ?? null,
        durationMs: t.duration_ms ?? 0, uri: t.uri ?? "",
      })) ?? []);
    } catch (e: any) { setError(e.message); }
    setSearching(false);
  }, [spotify, searchQuery]);

  const playTrack = useCallback(async (uri: string) => {
    if (!spotify) return;
    try { await spotify.play({ uris: [uri] }); setTimeout(async () => { const s = await spotify.getPlayback(); mapPlayback(s); }, 800); }
    catch (e: any) { setError(e.message); }
  }, [spotify]);

  const loadPlaylists = useCallback(async () => {
    if (!spotify) return;
    try { const r = await spotify.getPlaylists(50); setPlaylists(r?.items ?? []); }
    catch (e: any) { setError(e.message); }
  }, [spotify]);

  useEffect(() => { if (view === "playlists") loadPlaylists(); }, [view, loadPlaylists]);

  const playPlaylist = useCallback(async (plId: string) => {
    if (!spotify) return;
    try {
      const t = await spotify.getPlaylistTracks(plId, 100);
      const uris = t?.items?.map((i: any) => i.track?.uri).filter(Boolean) ?? [];
      if (uris.length > 0) await spotify.play({ uris });
    } catch (e: any) { setError(e.message); }
  }, [spotify]);

  const startRadio = useCallback(async () => {
    if (!spotify || !playback.track) return;
    try {
      const r = await spotify.search(playback.track.artist, "track", 20);
      setRecommendations(r?.tracks?.items?.map((t: any) => ({
        id: t.id, name: t.name, artist: t.artists?.map((a: any) => a.name).join(", ") ?? "",
        album: t.album?.name ?? "", albumArt: t.album?.images?.[0]?.url ?? null,
        durationMs: t.duration_ms ?? 0, uri: t.uri ?? "",
      })) ?? []);
      setView("radio");
    } catch (e: any) { setError(e.message); }
  }, [spotify, playback.track]);

  const loadLyrics = useCallback(async () => {
    if (!playback.track) return;
    setLyricsLoading(true);
    try {
      const res = await fetch(
        `https://lrclib.net/api/get?track_name=${encodeURIComponent(playback.track.name)}&artist_name=${encodeURIComponent(playback.track.artist)}&duration=${Math.round(playback.track.durationMs / 1000)}`
      );
      if (res.ok) {
        const d = await res.json();
        if (d.syncedLyrics) { setLyrics(parseLrc(d.syncedLyrics)); setView("lyrics"); }
      }
    } catch { /* */ }
    setLyricsLoading(false);
  }, [playback.track]);

  useEffect(() => {
    if (!lyrics.length || !playback.track) return;
    setCurrentLyricLine(lyrics.reduce((a, l, i) => playback.positionMs >= l.timeMs ? i : a, -1));
  }, [lyrics, playback.positionMs]);

  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  // ── Not connected ──
  if (!connected) {
    return (
      <PremiumRoot>
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <Disc3 size={64} style={{ color: P.primary, opacity: 0.6 }} />
          <h2 className="text-2xl font-bold" style={{ color: "#fff" }}>Orun Música</h2>
          <p className="text-center max-w-[400px]" style={{ color: "#888" }}>
            {t("orunMusicConnectDesc")}
          </p>
          {error && <p className="text-sm" style={{ color: P.primary }}>{error}</p>}
          <PrimaryButton onClick={handleConnect} disabled={connecting} className="px-8 py-3 text-base">
            {connecting ? <Loader2 size={18} className="animate-spin" /> : t("orunMusicConnect")}
          </PrimaryButton>
        </div>
      </PremiumRoot>
    );
  }

  const track = playback.track;

  return (
    <PremiumRoot>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${P.border}` }}>
          <Music size={18} style={{ color: P.primary }} />
          <span className="text-sm font-bold" style={{ color: "#fff" }}>Orun Música</span>
          <div className="flex-1" />
          {(["player", "playlists", "lyrics", "radio"] as ViewMode[]).map(v => (
            <GhostButton key={v} onClick={() => { setView(v); if (v === "lyrics") loadLyrics(); if (v === "playlists") loadPlaylists(); if (v === "radio") startRadio(); }}
              className={`px-3 py-1.5 text-xs ${view === v ? "!bg-[var(--primary)] !text-white !border-transparent" : "!text-[var(--text-secondary)]"}`}>
              {v === "player" && <><Disc3 size={14} /> {t("orunMusicPlayer")}</>}
              {v === "playlists" && <><ListMusic size={14} /> {t("orunMusicPlaylists")}</>}
              {v === "lyrics" && <><Mic2 size={14} /> {t("orunMusicLyrics")}</>}
              {v === "radio" && <><Radio size={14} /> {t("orunMusicRadio")}</>}
            </GhostButton>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {view === "player" && (
            <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
              {track?.albumArt ? (
                <img src={track.albumArt} alt="" className="w-[280px] h-[280px] rounded-xl object-cover shadow-2xl" />
              ) : (
                <div className="w-[280px] h-[280px] rounded-xl flex items-center justify-center" style={{ background: P.card }}>
                  <Disc3 size={80} style={{ color: "#333" }} />
                </div>
              )}
              <div className="text-center">
                <div className="text-xl font-bold max-w-[400px] truncate" style={{ color: "#fff" }}>
                  {track?.name ?? t("orunMusicNothingPlaying")}
                </div>
                <div className="text-sm mt-1" style={{ color: "#888" }}>{track?.artist ?? t("orunMusicConnectToSpotify")}</div>
                <div className="text-xs mt-0.5" style={{ color: "#555" }}>{track?.album}</div>
              </div>
              <div className="w-full max-w-[400px]">
                <input type="range" min={0} max={playback.durationMs || 1} value={playback.positionMs}
                  onChange={(e) => seek(Number(e.target.value))} className="w-full" style={{ accentColor: P.primary }} />
                <div className="flex justify-between text-xs" style={{ color: "#666" }}>
                  <span>{fmt(playback.positionMs)}</span><span>{fmt(playback.durationMs)}</span>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <GhostButton onClick={() => setVol(playback.volume > 0 ? 0 : 0.7)} className="!text-[#ccc] px-2">
                  {playback.volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </GhostButton>
                <GhostButton onClick={skipPrev} className="!text-[#ccc] px-2"><SkipBack size={22} /></GhostButton>
                <PrimaryButton onClick={togglePlay} className="w-14 h-14 rounded-full !p-0 !justify-center">
                  {playback.isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                </PrimaryButton>
                <GhostButton onClick={skipNext} className="!text-[#ccc] px-2"><SkipForward size={22} /></GhostButton>
                <GhostButton onClick={loadLyrics} className="!text-[#ccc] px-2"><Mic2 size={20} /></GhostButton>
              </div>
              <div className="flex items-center gap-2 w-[200px]">
                <VolumeX size={14} style={{ color: "#555" }} />
                <input type="range" min={0} max={1} step={0.01} value={playback.volume}
                  onChange={(e) => setVol(Number(e.target.value))} className="flex-1" style={{ accentColor: P.primary }} />
                <Volume2 size={14} style={{ color: "#555" }} />
              </div>
            </div>
          )}

          {view === "playlists" && (
            <ScrollArea>
              <div className="p-4">
                <SectionHeader icon={ListMusic} title={`${t("orunMusicPlaylists")} (${playlists.length})`} />
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 mt-4">
                  {playlists.map((pl: any) => (
                    <Card key={pl.id} hover className="p-4 cursor-pointer" onClick={() => playPlaylist(pl.id)}>
                      {pl.images?.[0]?.url && <img src={pl.images[0].url} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />}
                      <div className="text-sm font-semibold" style={{ color: "#fff" }}>{pl.name}</div>
                      <div className="text-xs mt-1" style={{ color: "#888" }}>{pl.tracks?.total ?? 0} {t("orunMusicTracks")} • {pl.owner?.display_name}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {view === "lyrics" && (
            <ScrollArea>
              <div className="p-8 text-center">
                {lyricsLoading ? (
                  <Loader2 size={32} className="animate-spin mx-auto" style={{ color: P.primary }} />
                ) : lyrics.length > 0 ? (
                  <div className="max-w-[600px] mx-auto">
                    <div className="text-lg font-bold mb-2" style={{ color: "#fff" }}>{track?.name}</div>
                    <div className="text-sm mb-8" style={{ color: "#888" }}>{track?.artist}</div>
                    {lyrics.map((line, i) => (
                      <div key={i} onClick={() => seek(line.timeMs)} className="cursor-pointer py-2 transition-all"
                        style={{ fontSize: i === currentLyricLine ? 22 : 16, fontWeight: i === currentLyricLine ? 700 : 400, color: i === currentLyricLine ? "#fff" : "#555" }}>
                        {line.text || "·"}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <Mic2 size={48} className="mx-auto mb-4" style={{ color: "#333" }} />
                    <div style={{ color: "#666" }}>{track ? t("orunMusicLyricNotFound") : t("orunMusicPlayLyricHint")}</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {view === "radio" && (
            <ScrollArea>
              <div className="p-4">
                <SectionHeader icon={Radio} title={t("orunMusicRadio")} right={<span className="text-xs" style={{ color: "#888" }}>{track ? `${t("orunMusicRadioBasedOn")} ${track.name}` : ""}</span>} />
                {recommendations.length > 0 ? (
                  <div className="mt-4">
                    {recommendations.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-[var(--surface-3)] transition-colors"
                        onClick={() => playTrack(t.uri)}>
                        {t.albumArt && <img src={t.albumArt} alt="" className="w-10 h-10 rounded-md" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate" style={{ color: "#fff" }}>{t.name}</div>
                          <div className="text-xs truncate" style={{ color: "#888" }}>{t.artist}</div>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: "#555" }}>{fmt(t.durationMs)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" style={{ color: "#666" }}>
                    <Radio size={48} className="mx-auto mb-4" style={{ color: "#333" }} />
                    <div>{t("orunMusicRadioHint")}</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Search bar */}
        <div className="flex gap-2 px-4 py-2.5" style={{ borderTop: `1px solid ${P.border}` }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("orunMusicSearchPlaceholder")}
            className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none"
            style={{ background: P.panel, color: P.text, border: `1px solid ${P.borderHi}` }}
          />
          <PrimaryButton onClick={handleSearch} disabled={searching} className="px-4 py-2">
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </PrimaryButton>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto px-4 py-2" style={{ borderTop: `1px solid ${P.border}` }}>
            {searchResults.map(t => (
              <div key={t.id} className="flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer hover:bg-[var(--surface-3)]"
                onClick={() => { playTrack(t.uri); setSearchResults([]); setSearchQuery(""); }}>
                {t.albumArt && <img src={t.albumArt} alt="" className="w-8 h-8 rounded" />}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px]" style={{ color: "#fff" }}>{t.name}</span>
                  <span className="text-xs" style={{ color: "#888" }}> — {t.artist}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-5 py-2 rounded-lg text-sm cursor-pointer z-[999]"
            style={{ background: P.primary, color: "#fff" }} onClick={() => setError(null)}>
            {error}
          </div>
        )}
      </div>
    </PremiumRoot>
  );
}

function parseLrc(lrc: string): LyricLine[] {
  const re = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)/;
  return lrc.split("\n").map(r => {
    const m = r.match(re);
    if (!m) return null;
    const [, mm, ss, frac, text] = m;
    const fracMs = frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0;
    return { timeMs: (Number(mm) * 60 + Number(ss)) * 1000 + fracMs, text };
  }).filter((l): l is LyricLine => l !== null);
}
