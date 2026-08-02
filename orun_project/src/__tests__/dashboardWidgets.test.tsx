import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { DashboardWidgets } from "../app/components/DashboardWidgets";

vi.mock("../i18n/I18nProvider", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: "en-US",
    language: "en",
    speechLang: "en-US",
  }),
}));

describe("DashboardWidgets", () => {
  it("renders without crashing", () => {
    render(<DashboardWidgets open={true} onToggle={() => {}} />);
    expect(screen.getByText("dashboard_clock")).toBeInTheDocument();
    expect(screen.getByText("dashboard_system")).toBeInTheDocument();
  });

  it("shows a clock display", () => {
    render(<DashboardWidgets open={true} onToggle={() => {}} />);
    const timeDisplay = document.querySelector(".tabular-nums");
    expect(timeDisplay).toBeTruthy();
    expect(timeDisplay?.textContent).toMatch(/^\d/);
  });

  it("shows the date", () => {
    render(<DashboardWidgets open={true} onToggle={() => {}} />);
    const dateYear = screen.getByText(/2026/);
    expect(dateYear).toBeInTheDocument();
  });

  it("shows system stats (CPU, Memory, Uptime)", () => {
    render(<DashboardWidgets open={true} onToggle={() => {}} />);
    expect(screen.getByText("dashboard_cpu")).toBeInTheDocument();
    expect(screen.getByText("dashboard_memory")).toBeInTheDocument();
    expect(screen.getByText("dashboard_uptime")).toBeInTheDocument();
    expect(screen.getByText("0h 0m")).toBeInTheDocument();
  });
});
