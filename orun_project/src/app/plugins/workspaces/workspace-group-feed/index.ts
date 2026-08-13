import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const GroupFeedWorkspace = lazy(() =>
  import("./GroupFeedWorkspace").then((m) => ({ default: m.GroupFeedWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "GroupFeed",
  name: "Grupos",
  version: "1.0.0",
  description: "Feed de mensagens dos grupos de WhatsApp com fotos, links e descrições dos produtos em tempo real",
  icon: "MessageSquareText",
  requirements: { minRamMB: 256, estimatedRAMMB: 60, features: [] },
  tabs: null,
  components: { workspace: GroupFeedWorkspace },
};

registerPlugin(plugin);
