import { useEffect, useRef } from "react";
import type { usePanelNavigation } from "./usePanelNavigation";

interface UseKeyboardShortcutsOptions {
  nav: ReturnType<typeof usePanelNavigation>;
  setCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setProfileOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setTelegramOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onEscapeExtra?: () => void;
}

export function useKeyboardShortcuts({ nav, setCommandPaletteOpen, setProfileOpen, setTelegramOpen, onEscapeExtra }: UseKeyboardShortcutsOptions) {
  const navRef = useRef(nav);
  navRef.current = nav;
  const paletteRef = useRef(setCommandPaletteOpen);
  paletteRef.current = setCommandPaletteOpen;
  const profileRef = useRef(setProfileOpen);
  profileRef.current = setProfileOpen;
  const telegramRef = useRef(setTelegramOpen);
  telegramRef.current = setTelegramOpen;
  const escapeExtraRef = useRef(onEscapeExtra);
  escapeExtraRef.current = onEscapeExtra;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape: close panels in priority order
      if (e.key === "Escape") {
        const n = navRef.current;
        if (n.settingsOpen) { n.setSettingsOpen(false); return; }
        if (n.whatsappOpen) { n.setWhatsappOpen(false); return; }
        if (n.agentModelsOpen) { n.setAgentModelsOpen(false); return; }
        if (n.usageOpen) { n.setUsageOpen(false); return; }
        if (n.agentsOpen) { n.setAgentsOpen(false); return; }
        if (n.automationOpen) { n.setAutomationOpen(false); return; }
        if (n.projectsOpen) { n.setProjectsOpen(false); return; }
        if (n.filesOpen) { n.setFilesOpen(false); return; }
        if (n.schedulesOpen) { n.setSchedulesOpen(false); return; }
        if (n.socialMediaOpen) { n.setSocialMediaOpen(false); return; }
        if (n.memoryOpen) { n.setMemoryOpen(false); return; }
        if (n.skillsOpen) { n.setSkillsOpen(false); return; }
        if (n.exportImportOpen) { n.setExportImportOpen(false); return; }
        if (n.activityOpen) { n.setActivityOpen(false); return; }
        if (n.emailOpen) { n.setEmailOpen(false); return; }
        if (n.calendarOpen) { n.setCalendarOpen(false); return; }
        if (n.agentPage) { n.setAgentPage(null); return; }
        if (n.modelPickerOpen) { n.setModelPickerOpen(false); return; }
        if (n.agentDataOpen) { n.setAgentDataOpen(null); return; }
        if (profileRef.current) { profileRef.current(false); return; }
        if (telegramRef.current) { telegramRef.current(false); return; }
        if (escapeExtraRef.current) { escapeExtraRef.current(); return; }
        return;
      }
      if (e.ctrlKey && e.key === "k") { e.preventDefault(); paletteRef.current((p) => !p); return; }
      if (e.ctrlKey && e.code === "Space") { e.preventDefault(); paletteRef.current(true); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "O") { e.preventDefault(); navRef.current.setAgentsOpen(true); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "A") { e.preventDefault(); navRef.current.setAutomationOpen(true); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "S") { e.preventDefault(); navRef.current.setSettingsOpen(true); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "P") { e.preventDefault(); profileRef.current?.(true); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "E") { e.preventDefault(); navRef.current.setEmailOpen(p => !p); navRef.current.setActiveNav("email"); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "C") { e.preventDefault(); navRef.current.setCalendarOpen(p => !p); navRef.current.setActiveNav("calendar"); return; }
      if (e.ctrlKey && e.shiftKey && e.key === "L") { e.preventDefault(); navRef.current.setActivityOpen(p => !p); navRef.current.setActiveNav("activity"); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
