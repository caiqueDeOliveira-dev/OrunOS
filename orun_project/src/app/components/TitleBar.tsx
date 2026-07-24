import { useState, useEffect } from "react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";

export function TitleBar() {
  const { t } = useTranslation();
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.window.isMaximized().then(setIsMax);
  }, []);

  const handleMinimize = () => isElectron && window.orun.window.minimize();
  const handleMaximize = async () => {
    if (!isElectron) return;
    const maxed = await window.orun.window.maximize();
    setIsMax(maxed);
  };
  const handleClose = () => isElectron && window.orun.window.close();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between h-8 select-none"
      style={{ background: "transparent" }}
    >
      {/* Drag region */}
      <div
        className="absolute inset-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* App icon / branding on the left */}
      <div className="relative z-10 flex items-center gap-2 pl-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <svg width="14" height="14" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" stroke="#C00018" strokeWidth="2" fill="none" />
          <circle cx="26" cy="26" r="5" fill="#C00018" />
        </svg>
      </div>

      {/* Window controls on the right */}
      <div className="relative z-10 flex items-center h-full" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          aria-label={t("titlebarMinimize")}
          className="flex items-center justify-center w-12 h-full transition-colors hover:bg-white/5"
          title={t("titlebarMinimize")}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
            <rect width="10" height="1" fill="#888" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          aria-label={t("titlebarMaximize")}
          className="flex items-center justify-center w-12 h-full transition-colors hover:bg-white/5"
          title={t("titlebarMaximize")}
        >
          {isMax ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="2.5" width="7" height="7" stroke="#888" strokeWidth="1" fill="none" />
              <rect x="2.5" y="0.5" width="7" height="7" stroke="#888" strokeWidth="1" fill="none" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" stroke="#888" strokeWidth="1" fill="none" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          aria-label={t("titlebarClose")}
          className="flex items-center justify-center w-12 h-full transition-colors hover:bg-[#C00018]"
          title={t("titlebarClose")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="0" y1="0" x2="10" y2="10" stroke="#888" strokeWidth="1" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="#888" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
