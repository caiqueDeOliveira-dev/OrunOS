import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type Theme = "light" | "dark" | "system" | "schedule";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  workspaceTheme: Record<string, "dark" | "light" | "default">;
  setWorkspaceTheme: (workspaceId: string, theme: "dark" | "light" | "default") => void;
  getEffectiveTheme: (workspaceId: string) => "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "dark",
  workspaceTheme: {},
  setWorkspaceTheme: () => {},
  getEffectiveTheme: () => "dark",
});

function getScheduledTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("orun-theme") as Theme) || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  const [workspaceTheme, setWorkspaceThemeState] = useState<Record<string, "dark" | "light" | "default">>(() => {
    try {
      const saved = localStorage.getItem("orun-workspace-theme");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const setWorkspaceTheme = useCallback((workspaceId: string, theme: "dark" | "light" | "default") => {
    setWorkspaceThemeState(prev => {
      const next = { ...prev, [workspaceId]: theme };
      localStorage.setItem("orun-workspace-theme", JSON.stringify(next));
      return next;
    });
  }, []);

  const getEffectiveTheme = useCallback((workspaceId: string): "light" | "dark" => {
    const override = workspaceTheme[workspaceId];
    if (override && override !== "default") return override;
    return resolvedTheme;
  }, [workspaceTheme, resolvedTheme]);

  useEffect(() => {
    localStorage.setItem("orun-theme", theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      let resolved: "light" | "dark";
      if (theme === "system") {
        resolved = mediaQuery.matches ? "dark" : "light";
      } else if (theme === "schedule") {
        resolved = getScheduledTheme();
      } else {
        resolved = theme;
      }
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.classList.toggle("light", resolved === "light");
    };

    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);

    let interval: ReturnType<typeof setInterval> | null = null;
    if (theme === "schedule") {
      interval = setInterval(updateTheme, 60000);
    }

    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
      if (interval) clearInterval(interval);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, workspaceTheme, setWorkspaceTheme, getEffectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
