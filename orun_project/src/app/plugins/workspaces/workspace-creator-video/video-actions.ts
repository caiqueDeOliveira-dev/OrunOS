import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "creator-video";

let registered = false;

let getStore: (() => any) | null = null;
export function setVideoStoreGetter(getter: () => any) { getStore = getter; }

function getVideoState() {
  if (!getStore) throw new Error("Video store not initialized");
  return getStore();
}

let clipIdCounter = 0;
function nextClipId() {
  return `vc_${Date.now()}_${++clipIdCounter}`;
}

const actions = {
  async add_clip(params: Record<string, unknown>) {
    const name = String(params.name || "New Clip");
    const type = (params.type as string) || "video";
    const color = String(params.color || "#E06020");
    const startFrame = typeof params.startFrame === "number" ? params.startFrame : undefined;
    const durationFrames = typeof params.durationFrames === "number" ? params.durationFrames : 300;

    const store = getVideoState();
    const state = store.getState ? store.getState() : store;

    const maxEnd = state.clips.reduce((max: number, c: any) => Math.max(max, c.startFrame + c.durationFrames), 0);
    const trackIndex = type === "video" ? 0 : type === "audio" ? 1 : type === "text" ? 3 : 0;

    const newClip = {
      id: nextClipId(),
      trackIndex,
      name,
      color,
      startFrame: startFrame ?? maxEnd,
      durationFrames: durationFrames ?? 300,
      type,
    };

    store.setState({ clips: [...state.clips, newClip] });
    return { success: true, data: newClip, message: `Added clip "${name}"` };
  },

  async delete_clip(params: Record<string, unknown>) {
    const clipId = String(params.clipId || "");
    if (!clipId) return { success: false, error: "clipId is required" };

    const store = getVideoState();
    const state = store.getState();
    const exists = state.clips.some((c: any) => c.id === clipId);
    if (!exists) return { success: false, error: `Clip "${clipId}" not found` };

    store.setState({
      clips: state.clips.filter((c: any) => c.id !== clipId),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    });
    return { success: true, message: `Deleted clip "${clipId}"` };
  },

  async split_clip(params: Record<string, unknown>) {
    const clipId = String(params.clipId || "");
    if (!clipId) return { success: false, error: "clipId is required" };

    const store = getVideoState();
    const state = store.getState();
    const clip = state.clips.find((c: any) => c.id === clipId);
    if (!clip) return { success: false, error: `Clip "${clipId}" not found` };

    const splitPoint = state.currentTimeFrame;
    if (splitPoint <= clip.startFrame || splitPoint >= clip.startFrame + clip.durationFrames) {
      return { success: false, error: "Current time is not within the clip's range" };
    }

    const left = { ...clip, durationFrames: splitPoint - clip.startFrame };
    const right = { ...clip, id: nextClipId(), startFrame: splitPoint, durationFrames: clip.startFrame + clip.durationFrames - splitPoint };

    store.setState({
      clips: state.clips.map((c: any) => c.id === clip.id ? left : c).concat(right),
    });
    return { success: true, data: { left, right }, message: "Clip split successfully" };
  },

  async add_effect(params: Record<string, unknown>) {
    const effectName = String(params.effectName || "");
    if (!effectName) return { success: false, error: "effectName is required" };

    const store = getVideoState();
    store.setState({ selectedEffect: effectName });
    return { success: true, message: `Effect set to "${effectName}"` };
  },

  async set_transition(params: Record<string, unknown>) {
    const transitionName = String(params.transitionName || "");
    if (!transitionName) return { success: false, error: "transitionName is required" };

    const store = getVideoState();
    store.setState({ selectedTransition: transitionName });
    return { success: true, message: `Transition set to "${transitionName}"` };
  },

  async set_text(params: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};

    if (typeof params.text === "string") updates.font = params.text;
    if (typeof params.fontSize === "number") updates.fontSize = params.fontSize;
    if (typeof params.fontFamily === "string") updates.font = params.fontFamily;
    if (typeof params.bold === "boolean") updates.bold = params.bold;
    if (typeof params.italic === "boolean") updates.italic = params.italic;
    if (typeof params.color === "string") updates.textColor = params.color;

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "No text properties provided" };
    }

    const store = getVideoState();
    store.setState(updates);
    return { success: true, message: "Text properties updated" };
  },

  async export_video() {
    const store = getVideoState();
    const state = store.getState();

    const project = {
      clips: state.clips,
      fps: state.fps,
      totalFrames: state.totalFrames,
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `video-project-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);

    return { success: true, data: project, message: "Project exported" };
  },

  async get_timeline() {
    const store = getVideoState();
    const state = store.getState();

    return {
      success: true,
      data: {
        clips: state.clips,
        currentTimeFrame: state.currentTimeFrame,
        totalFrames: state.totalFrames,
        fps: state.fps,
        selectedClipId: state.selectedClipId,
      },
    };
  },
};

export function registerVideoActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterVideoActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}
