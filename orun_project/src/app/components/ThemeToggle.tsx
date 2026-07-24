import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../../i18n/I18nProvider";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const options: { value: "light" | "dark" | "system"; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun size={14} />, label: t("settingsThemeLight") },
    { value: "dark", icon: <Moon size={14} />, label: t("settingsThemeDark") },
    { value: "system", icon: <Monitor size={14} />, label: t("settingsThemeSystem") },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
          style={{
            background: theme === opt.value ? "var(--primary)" : "transparent",
            color: theme === opt.value ? "#fff" : "var(--muted-foreground)",
          }}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};
