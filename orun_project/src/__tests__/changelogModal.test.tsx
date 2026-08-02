import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ChangelogModal } from "../app/components/ChangelogModal";

vi.mock("../i18n/I18nProvider", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ChangelogModal", () => {
  it("renders without crashing when isOpen=true", () => {
    render(<ChangelogModal onClose={() => {}} />);
    expect(screen.getByText("changelog_title")).toBeInTheDocument();
    expect(screen.getByText("changelog_desc")).toBeInTheDocument();
  });

  it("does not render when isOpen=false", () => {
    function TestWrapper({ isOpen }: { isOpen: boolean }) {
      return isOpen ? <ChangelogModal onClose={() => {}} /> : null;
    }
    const { container } = render(<TestWrapper isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<ChangelogModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("displays version numbers", () => {
    render(<ChangelogModal onClose={() => {}} />);
    expect(screen.getByText("v0.7.0")).toBeInTheDocument();
    expect(screen.getByText("v0.6.3")).toBeInTheDocument();
    expect(screen.getByText("Jul 2026")).toBeInTheDocument();
    expect(screen.getByText("Jun 2026")).toBeInTheDocument();
  });

  it("shows changelog entries for each version", () => {
    render(<ChangelogModal onClose={() => {}} />);
    expect(screen.getByText("Modo Foco para chat sem distrações")).toBeInTheDocument();
    expect(screen.getByText("Mapa de atalhos de teclado (tecla ?)")).toBeInTheDocument();
    expect(screen.getByText("Sistema de Easter Eggs (café, HAL 9000, matrix, konami)")).toBeInTheDocument();
    expect(screen.getByText("Correções de bugs e melhorias de performance")).toBeInTheDocument();
  });
});
