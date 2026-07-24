// plugins/workspaces/workspace-creator-audio/CreatorWorkspace.tsx
//
// Unified Creator workspace — switches between Audio Mixer and Video Timeline
// based on the active tab.

import { Suspense, lazy } from "react";
import type { WorkspaceProps } from "../../types";

const CreatorAudio = lazy(() => import("./CreatorAudio").then((m) => ({ default: m.CreatorAudio })));
const CreatorVideo = lazy(() => import("../workspace-creator-video/CreatorVideo").then((m) => ({ default: m.CreatorVideo })));

export function CreatorWorkspace(props: WorkspaceProps) {
  const { activeTab } = props;

  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <span className="text-[10px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Carregando...
        </span>
      </div>
    }>
      {activeTab === "video" ? <CreatorVideo {...props} /> : <CreatorAudio {...props} />}
    </Suspense>
  );
}
