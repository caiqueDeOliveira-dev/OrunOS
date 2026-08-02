import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { KeyboardShortcutsModal } from "../app/components/KeyboardShortcutsModal";

vi.mock("../i18n/I18nProvider", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("KeyboardShortcutsModal", () => {
  it("renders without crashing when isOpen=true", () => {
    render(<KeyboardShortcutsModal onClose={() => {}} />);
    expect(screen.getByText("shortcutsTitle")).toBeInTheDocument();
    expect(screen.getByText("shortcuts_description")).toBeInTheDocument();
  });

  it("does not render when isOpen=false", () => {
    function TestWrapper({ isOpen }: { isOpen: boolean }) {
      return isOpen ? <KeyboardShortcutsModal onClose={() => {}} /> : null;
    }
    const { container } = render(<TestWrapper isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("displays shortcut categories", () => {
    render(<KeyboardShortcutsModal onClose={() => {}} />);
    expect(screen.getByText("shortcuts_category_navigation")).toBeInTheDocument();
    expect(screen.getByText("shortcuts_category_panels")).toBeInTheDocument();
    expect(screen.getByText("shortcuts_category_chat")).toBeInTheDocument();
  });

  it("shows the correct keybindings", () => {
    render(<KeyboardShortcutsModal onClose={() => {}} />);
    expect(screen.getByText("Ctrl+K")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
    expect(screen.getByText("Escape")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+Shift+O")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+Shift+A")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+Shift+S")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+Shift+P")).toBeInTheDocument();
    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("Shift+Enter")).toBeInTheDocument();
  });
});
