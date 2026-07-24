import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { I18nProvider, useTranslation } from "../i18n/I18nProvider";

const TestComponent: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="translation">{t("app.name" as any)}</span>
      <button onClick={() => setLanguage("en")}>Switch</button>
    </div>
  );
};

describe("I18nProvider", () => {
  it("provides default language (pt)", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("pt");
  });

  it("translates keys", () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );
    expect(screen.getByTestId("translation")).toBeTruthy();
  });

  it("supports params interpolation", () => {
    const ParamTest: React.FC = () => {
      const { t } = useTranslation();
      return <span data-testid="param">{t("homeWelcomeBack" as any, { name: "Hampton" })}</span>;
    };
    render(
      <I18nProvider>
        <ParamTest />
      </I18nProvider>
    );
    expect(screen.getByTestId("param")).toBeTruthy();
  });
});
