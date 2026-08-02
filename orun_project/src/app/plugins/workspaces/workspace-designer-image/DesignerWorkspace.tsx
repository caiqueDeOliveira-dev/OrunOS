import React, { useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerDesignerActions, unregisterDesignerActions, useDesignerStore } from "./designer-actions";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { DesignerCanvasTab } from "./DesignerCanvasTab";
import { DesignerFigmaTab } from "./DesignerFigmaTab";
import { DesignerImageEditorTab } from "./DesignerImageEditorTab";
import { DesignerThreeDTab } from "./DesignerThreeDTab";

export function DesignerWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { t } = useTranslation();
  const { userName, avatarInitials } = usePersonalization();
  const avatarColor = "var(--accent)";
  const { notes, updateNotes } = useWorkspaceNotes("Designer");
  useEffect(() => {
    registerDesignerActions();
    return () => unregisterDesignerActions();
  }, []);

  const tab = activeTab || "canvas";

  const renderTab = () => {
    switch (tab) {
      case "figma":
        return <DesignerFigmaTab onSendMessage={onSendMessage} />;
      case "edit":
        return <DesignerImageEditorTab onSendMessage={onSendMessage} />;
      case "3d":
        return <DesignerThreeDTab onSendMessage={onSendMessage} />;
      default:
        return <DesignerCanvasTab onSendMessage={onSendMessage} />;
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      <WorkspaceHeader
        title={`${t("workspace.designer.title") || "Designer"}${notes ? ` — ${notes}` : ""}`}
        subtitle={tab.charAt(0).toUpperCase() + tab.slice(1)}
        icon={<div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: avatarColor || "var(--accent)" }}>{avatarInitials || "D"}</div>}
        actions={
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">{userName || "Designer"}</span>
          </div>
        }
      />
      {renderTab()}
      <AIFloatingPrompt onSendMessage={onSendMessage} label="Design Agent" />
    </div>
  );
}
