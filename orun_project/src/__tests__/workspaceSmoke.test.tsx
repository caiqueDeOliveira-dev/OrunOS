import { describe, it, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { JuridicoWorkspace } from "../app/plugins/workspaces/workspace-juridico/JuridicoWorkspace";
import { AssistenteTecnicoWorkspace } from "../app/plugins/workspaces/workspace-assistente-tecnico/AssistenteTecnicoWorkspace";
import { SuporteWorkspace } from "../app/plugins/workspaces/workspace-suporte/SuporteWorkspace";
import type { WorkspaceProps } from "../app/plugins/types";

const mockProps: WorkspaceProps = {
  plugin: {
    id: "test",
    name: "Test",
    version: "1.0.0",
    description: "Test plugin",
    icon: "Test",
    requirements: { minRamMB: 256, estimatedRAMMB: 60, features: [] },
    tabs: null,
    components: { workspace: null as unknown as WorkspaceProps["plugin"]["components"]["workspace"] },
  },
  activeTab: null,
  onTabChange: () => {},
  onSendMessage: () => {},
  lastToolResult: null,
};

describe("Workspace smoke tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("JuridicoWorkspace renders without crashing", () => {
    render(<JuridicoWorkspace {...mockProps} />);
  });

  it("AssistenteTecnicoWorkspace renders without crashing", () => {
    render(<AssistenteTecnicoWorkspace {...mockProps} />);
  });

  it("SuporteWorkspace renders without crashing", () => {
    render(<SuporteWorkspace {...mockProps} />);
  });
});
