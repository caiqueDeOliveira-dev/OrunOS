import { Suspense, lazy } from "react";
import type { WorkspaceProps } from "../../types";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";

const CreatorAudio = lazy(() => import("./CreatorAudio").then((m) => ({ default: m.CreatorAudio })));
const CreatorVideo = lazy(() => import("../workspace-creator-video/CreatorVideo").then((m) => ({ default: m.CreatorVideo })));

export function CreatorWorkspace(props: WorkspaceProps) {
  const { activeTab } = props;
  const { userName, avatarInitials } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Creator");

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <WorkspaceHeader
        title={`Creator Studio${notes ? ` — ${notes}` : ""}`}
        subtitle={activeTab === "video" ? "Video" : "Audio"}
        icon={<div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#fff" }}>{avatarInitials || "C"}</div>}
        actions={<span className="text-[9px] text-muted-foreground">{userName || "Creator"}</span>}
      />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] tracking-wider ws-font-sora text-muted-foreground">Carregando...</span>
        </div>
      }>
        {activeTab === "video" ? <CreatorVideo {...props} /> : <CreatorAudio {...props} />}
      </Suspense>
    </div>
  );
}
