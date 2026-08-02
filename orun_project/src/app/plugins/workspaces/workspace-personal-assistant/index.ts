import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const PersonalAssistantWorkspace = lazy(() =>
  import("./PersonalAssistantWorkspace").then((m) => ({ default: m.PersonalAssistantWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "PersonalAssistant",
  name: "Personal Assistant",
  version: "1.0.0",
  description: "Personal assistant workspace with reminders, agenda management, and WhatsApp integration",
  icon: "MessageSquare",
  requirements: { minRamMB: 256, estimatedRAMMB: 64, features: [] },
  tabs: null,
  components: { workspace: PersonalAssistantWorkspace },
};

registerPlugin(plugin);
