// LowerSection — Tab container for FX / Samples / Recording / Vocal / Sequencer
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { FXRack } from "./FXRack";
import { SamplePads } from "./SamplePads";
import { RecordingPanel } from "./RecordingPanel";
import { VocalTuner } from "./VocalTuner";
import { StepSequencer } from "./StepSequencer";
import { PANEL, STRIP, ACCENT, BORDER, TEXT_BRI, TEXT_DIM, FONT_LABEL } from "./creator-audio-types";

export function LowerSection() {
  const { t } = useTranslation();
  const lowerTab = useDJStore((s) => s.lowerTab);

  const tabs = [
    { key: "efeitos" as const, label: t("creator_audio_effects") },
    { key: "samples" as const, label: t("creator_audio_samples") },
    { key: "vocal" as const, label: "VOCAL" },
    { key: "sequencer" as const, label: "SEQ" },
    { key: "gravacao" as const, label: t("creator_audio_recording") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "30%", borderTop: `1px solid ${BORDER}`, background: PANEL }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, flexShrink: 0, overflow: "auto" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => useDJStore.setState({ lowerTab: tab.key })}
            style={{
              height: 24, padding: "0 12px", border: "none", cursor: "pointer",
              fontSize: 8, fontFamily: FONT_LABEL, fontWeight: 600, letterSpacing: 1,
              background: lowerTab === tab.key ? STRIP : "transparent",
              color: lowerTab === tab.key ? TEXT_BRI : TEXT_DIM,
              borderBottom: lowerTab === tab.key ? `2px solid ${ACCENT}` : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "all 0.1s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {lowerTab === "efeitos" && <FXRack />}
        {lowerTab === "samples" && <SamplePads />}
        {lowerTab === "vocal" && <VocalTuner />}
        {lowerTab === "sequencer" && <StepSequencer />}
        {lowerTab === "gravacao" && <RecordingPanel />}
      </div>
    </div>
  );
}
