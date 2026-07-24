import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const TeacherWorkspace = lazy(() =>
  import("./TeacherWorkspace").then((m) => ({ default: m.TeacherWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "Teacher",
  name: "Teacher Whiteboard",
  version: "1.0.0",
  description: "Interactive whiteboard with drawing, quizzes, and lesson planning tools",
  icon: "GraduationCap",
  requirements: { minRamMB: 256, estimatedRAMMB: 48, features: [] },
  tabs: null,
  components: { workspace: TeacherWorkspace },
};

registerPlugin(plugin);
