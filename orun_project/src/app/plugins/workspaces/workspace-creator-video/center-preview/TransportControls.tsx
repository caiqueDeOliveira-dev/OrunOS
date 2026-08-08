import { useVideoStore } from "../video-store";
import { ISkipBack, ISkipFwd, IFramePrev, IFrameNext, IPlay, IPause } from "../video-types";

const btnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "none", color: "#A0A0A0",
  cursor: "pointer", borderRadius: 6, transition: "all 0.12s",
};

export function TransportControls() {
  const isPlaying = useVideoStore((s) => s.isPlaying);
  const currentTimeFrame = useVideoStore((s) => s.currentTimeFrame);
  const fps = useVideoStore((s) => s.fps);

  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5"
      style={{ background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "4px 8px" }}
    >
      <button onClick={() => useVideoStore.setState({ currentTimeFrame: Math.max(0, currentTimeFrame - fps) })}
        style={{ ...btnStyle, width: 24, height: 24 }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#A0A0A0"}>
        <ISkipBack />
      </button>
      <button onClick={() => useVideoStore.setState({ currentTimeFrame: Math.max(0, currentTimeFrame - 1) })}
        style={{ ...btnStyle, width: 22, height: 22 }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#A0A0A0"}>
        <IFramePrev />
      </button>
      <button onClick={() => useVideoStore.setState((s) => ({ isPlaying: !s.isPlaying }))}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#C3002F", border: "none", width: 32, height: 32, color: "#fff", cursor: "pointer", borderRadius: "50%", transition: "all 0.12s", boxShadow: "0 0 12px rgba(195,0,47,0.4)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(195,0,47,0.8)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#C3002F"; }}>
        {isPlaying ? <IPause /> : <IPlay />}
      </button>
      <button onClick={() => useVideoStore.setState((s) => ({ currentTimeFrame: Math.min(s.totalFrames, currentTimeFrame + 1) }))}
        style={{ ...btnStyle, width: 22, height: 22 }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#A0A0A0"}>
        <IFrameNext />
      </button>
      <button onClick={() => useVideoStore.setState((s) => ({ currentTimeFrame: Math.min(s.totalFrames, currentTimeFrame + fps) }))}
        style={{ ...btnStyle, width: 24, height: 24 }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#A0A0A0"}>
        <ISkipFwd />
      </button>
    </div>
  );
}
