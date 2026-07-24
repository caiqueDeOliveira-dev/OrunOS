import React, { useRef, useEffect, useState } from "react";

interface AvatarOrbProps {
  size?: number;
}

export const AvatarOrb = React.memo(function AvatarOrb({ size = 320 }: AvatarOrbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    if (v.readyState >= 2) tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, []);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {!loaded && (
        <div
          className="absolute rounded-full"
          style={{
            width: size,
            height: size,
            background: "radial-gradient(circle, rgba(128,128,128,0.1) 0%, transparent 100%)",
          }}
        />
      )}
      <video
        ref={videoRef}
        src="/avatar.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setLoaded(true)}
        className="rounded-full object-cover"
        style={{
          width: size,
          height: size,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.5s",
        }}
      />
    </div>
  );
});
