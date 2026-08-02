import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { UpdateNotifier } from "../app/components/UpdateNotifier";

vi.mock("../i18n/I18nProvider", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("UpdateNotifier", () => {
  beforeEach(() => {
    const app = (window as any).orun.app;
    app.onUpdateChecking = vi.fn().mockReturnValue(() => {});
    app.onUpdateAvailable = vi.fn().mockReturnValue(() => {});
    app.onUpdateNotAvailable = vi.fn().mockReturnValue(() => {});
    app.onUpdateProgress = vi.fn().mockReturnValue(() => {});
    app.onUpdateDownloaded = vi.fn().mockReturnValue(() => {});
    app.onUpdateError = vi.fn().mockReturnValue(() => {});
    app.checkForUpdates = vi.fn();
  });

  it("renders without crashing", () => {
    render(<UpdateNotifier />);
  });

  it("shows checking state initially", () => {
    render(<UpdateNotifier />);
    const cb = (window as any).orun.app.onUpdateChecking.mock.calls[0][0];
    act(() => { cb(); });
    expect(screen.getByText("update_available")).toBeInTheDocument();
  });

  it("shows download button when update is available", () => {
    render(<UpdateNotifier />);
    const cb = (window as any).orun.app.onUpdateAvailable.mock.calls[0][0];
    act(() => { cb({ version: "1.0.0" }); });
    expect(screen.getByText("update_available v1.0.0")).toBeInTheDocument();
    const downloadBtn = screen.getByRole("button", { name: /update_available/ });
    expect(downloadBtn).toBeInTheDocument();
  });

  it("clicking download triggers the update check", () => {
    render(<UpdateNotifier />);
    const cb = (window as any).orun.app.onUpdateAvailable.mock.calls[0][0];
    act(() => { cb({ version: "1.0.0" }); });
    fireEvent.click(screen.getByRole("button", { name: /update_available/ }));
    expect((window as any).orun.app.checkForUpdates).toHaveBeenCalledOnce();
  });
});
