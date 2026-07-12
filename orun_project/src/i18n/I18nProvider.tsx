import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations, type Language, LOCALE_MAP, SPEECH_LANG_MAP } from "./translations";
import { isElectron } from "../app/constants";

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations["pt"]) => string;
  locale: string;
  speechLang: string;
}

const I18nContext = createContext<I18nContextValue>({
  language: "pt",
  setLanguage: () => {},
  t: (key) => key,
  locale: "pt-BR",
  speechLang: "pt-BR",
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt");

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<Language>("language").then((saved) => {
      if (saved && translations[saved]) setLanguageState(saved);
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (isElectron) {
      window.orun.settings.set("language", lang);
    }
  }, []);

  const t = useCallback(
    (key: keyof typeof translations["pt"]): string => {
      return translations[language]?.[key] ?? translations["pt"][key] ?? key;
    },
    [language]
  );

  const locale = LOCALE_MAP[language] ?? "pt-BR";
  const speechLang = SPEECH_LANG_MAP[language] ?? "pt-BR";

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, locale, speechLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
