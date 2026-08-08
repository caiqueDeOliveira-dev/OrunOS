import React, { useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerDesignerActions, unregisterDesignerActions, useDesignerStore } from "./designer-actions";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { P, PremiumRoot } from "../premium";
import { DesignerCanvasTab } from "./DesignerCanvasTab";
import { DesignerFigmaTab } from "./DesignerFigmaTab";
import { DesignerImageEditorTab } from "./DesignerImageEditorTab";
import { DesignerThreeDTab } from "./DesignerThreeDTab";

const DESIGNER_UTILITIES = `
.ws-bg-card{background:#141414}
.ws-bd-border{border-color:#252525}
.ws-bg-border{background:#252525}
.ws-bg-canvas{background:#0A0A0C}
.ws-bg-muted{background:#1C1C1C}
.ws-bg-selected{background:rgba(195,0,47,0.14)}
.ws-text-foreground{color:#FFFFFF}
.ws-font-sora{font-family:'Sora',sans-serif}
.ws-font-mono{font-family:'JetBrains Mono',monospace}
.ws-btn-sm{background:#141414;border:1px solid #252525;border-radius:6px;color:#A0A0A0;padding:2px 8px;font-weight:500;transition:all .15s ease}
.ws-btn-sm:hover{border-color:#383838;color:#FFFFFF}
.ws-btn-icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;color:#A0A0A0;font-size:11px;transition:all .15s ease}
.ws-btn-icon:hover{background:rgba(255,255,255,0.05);color:#FFFFFF}
.ws-btn-active{background:rgba(195,0,47,0.14);color:#FFFFFF}
.ws-btn-primary{background:#C3002F;color:#FFFFFF;border-radius:6px;padding:4px 12px;font-weight:500;transition:all .15s ease}
.ws-btn-primary:hover{filter:brightness(1.15)}
`;

export function DesignerWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { t } = useTranslation();
  const { userName, avatarInitials } = usePersonalization();
  const avatarColor = "#C3002F";
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
    <PremiumRoot>
      <style>{DESIGNER_UTILITIES}</style>
      <WorkspaceHeader
        title={`${t("workspace.designer.title") || "Designer"}${notes ? ` — ${notes}` : ""}`}
        subtitle={tab.charAt(0).toUpperCase() + tab.slice(1)}
        icon={<div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: avatarColor }}>{avatarInitials || "D"}</div>}
        actions={
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">{userName || "Designer"}</span>
          </div>
        }
      />
      <div className="flex-1 min-h-0 flex flex-col" style={{ color: P.text }}>
        {renderTab()}
      </div>
      <AIFloatingPrompt onSendMessage={onSendMessage} label="Design Agent" />
    </PremiumRoot>
  );
}
