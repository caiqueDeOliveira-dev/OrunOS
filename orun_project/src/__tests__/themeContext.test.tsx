import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { ThemeProvider, useTheme } from "../app/contexts/ThemeContext";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const TestConsumer: React.FC = () => {
  const { resolvedTheme, theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <span data-testid="theme">{theme}</span>
      <button data-testid="set-light" onClick={() => setTheme("light")}>Light</button>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>Dark</button>
      <button data-testid="set-schedule" onClick={() => setTheme("schedule")}>Schedule</button>
    </div>
  );
};

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <TestConsumer />
    </ThemeProvider>
  );
}

describe("ThemeContext - schedule mode", () => {
  it('returns "dark" when current hour >= 18', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 20, 0, 0));
    localStorage.setItem("orun-theme", "schedule");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });

  it('returns "dark" when current hour < 6 (early morning)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 3, 30, 0));
    localStorage.setItem("orun-theme", "schedule");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });

  it('returns "light" when current hour is between 6 and 17', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
    localStorage.setItem("orun-theme", "schedule");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
  });

  it('returns "light" at hour 6 (boundary)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 6, 0, 0));
    localStorage.setItem("orun-theme", "schedule");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
  });

  it('returns "dark" at hour 18 (boundary)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 18, 0, 0));
    localStorage.setItem("orun-theme", "schedule");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });
});

describe("ThemeContext - non-schedule modes", () => {
  it("returns fixed light regardless of time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 23, 0, 0));
    localStorage.setItem("orun-theme", "light");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
  });

  it("returns fixed dark regardless of time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));
    localStorage.setItem("orun-theme", "dark");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });
});

describe("ThemeContext - theme switching", () => {
  it("defaults to 'system' when localStorage is empty", () => {
    renderWithTheme();
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("switches from dark to light dynamically", () => {
    localStorage.setItem("orun-theme", "dark");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
    act(() => { screen.getByTestId("set-light").click(); });
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
  });

  it("switches to schedule and reacts to time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 20, 0, 0));
    localStorage.setItem("orun-theme", "light");
    renderWithTheme();
    expect(screen.getByTestId("resolved-theme").textContent).toBe("light");
    act(() => { screen.getByTestId("set-schedule").click(); });
    expect(screen.getByTestId("resolved-theme").textContent).toBe("dark");
  });
});
