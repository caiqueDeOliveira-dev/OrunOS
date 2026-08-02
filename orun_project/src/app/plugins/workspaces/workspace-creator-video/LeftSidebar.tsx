import { useState } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { SANS, MEDIA_TABS } from "./video-types";
import { MediaTab } from "./left-sidebar/MediaTab";
import { TextTab } from "./left-sidebar/TextTab";
import { EffectsTab } from "./left-sidebar/EffectsTab";
import { TransitionsTab } from "./left-sidebar/TransitionsTab";

export function LeftSidebar() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("Mídia");

  const renderTabContent = () => {
    switch (activeTab) {
      case "Mídia": return <MediaTab />;
      case "Texto": return <TextTab />;
      case "Efeitos": return <EffectsTab />;
      case "Transições": return <TransitionsTab />;
      default: return null;
    }
  };

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 180,
        background: "var(--card, #161B22)",
        borderRight: "1px solid var(--border, #21262D)",
      }}
    >
      <div
        className="flex overflow-x-auto shrink-0"
        style={{ borderBottom: "1px solid #21262D" }}
      >
        {MEDIA_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: "0 0 auto",
              padding: "6px 7px",
              fontSize: 9,
              fontFamily: SANS,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "#C9D1D9" : "#484F58",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid #C00018"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        className="flex-1 overflow-y-auto p-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#30363D transparent",
        }}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
