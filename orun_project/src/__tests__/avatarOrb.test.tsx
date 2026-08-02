import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AvatarOrb } from "../app/components/AvatarOrb";

describe("AvatarOrb", () => {
  it("renders without crashing", () => {
    const { container } = render(<AvatarOrb />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the animated orb container with correct class", () => {
    render(<AvatarOrb />);
    const orb = screen.getByTestId("avatar-orb");
    expect(orb).toBeInTheDocument();
    expect(orb.className).toContain("relative");
  });

  it("renders the outer aura element", () => {
    const { container } = render(<AvatarOrb />);
    const aura = container.querySelector('[style*="radial-gradient(rgba(192, 0, 24, 0.11)"]');
    expect(aura).toBeTruthy();
  });

  it("renders hologram scanlines", () => {
    const { container } = render(<AvatarOrb />);
    const inner = container.querySelector('[style*="opacity: 0.08"]');
    expect(inner).toBeTruthy();
    const lines = inner?.querySelectorAll("div");
    expect(lines?.length).toBe(12);
  });

  it("renders the flicker sweep overlay", () => {
    const { container } = render(<AvatarOrb />);
    const sweep = container.querySelector('[style*="orunHoloScan"]');
    expect(sweep).toBeTruthy();
  });

  it("renders orbiting dots", () => {
    const { container } = render(<AvatarOrb />);
    const orbiting = container.querySelector('[style*="orunSpin"]');
    expect(orbiting).toBeTruthy();
  });

  it("renders the reverse orbit ring", () => {
    const { container } = render(<AvatarOrb />);
    const reverseOrbit = container.querySelector('[style*="orunSpinReverse"]');
    expect(reverseOrbit).toBeTruthy();
  });

  it("renders the core sphere", () => {
    const { container } = render(<AvatarOrb />);
    const core = container.querySelector('[style*="radial-gradient(circle at 38% 32%"]');
    expect(core).toBeTruthy();
  });

  it("renders interference lines on the sphere", () => {
    const { container } = render(<AvatarOrb />);
    const inner = container.querySelector('[style*="opacity: 0.06"]');
    expect(inner).toBeTruthy();
    const lines = inner?.querySelectorAll("div");
    expect(lines?.length).toBe(8);
  });

  it("renders floating particles", () => {
    const { container } = render(<AvatarOrb />);
    const particles = container.querySelectorAll("div[style*='orunFloat']");
    expect(particles.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the SVG logo mark", () => {
    const { container } = render(<AvatarOrb />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("uses default size of 320", () => {
    render(<AvatarOrb />);
    const orb = screen.getByTestId("avatar-orb");
    expect(orb.style.width).toBe("320px");
    expect(orb.style.height).toBe("320px");
  });

  it("accepts a custom size prop", () => {
    render(<AvatarOrb size={200} />);
    const orb = screen.getByTestId("avatar-orb");
    expect(orb.style.width).toBe("200px");
    expect(orb.style.height).toBe("200px");
  });
});
