import { describe, it, expect, beforeEach } from "vitest";
import {
  getAll,
  getUnlocked,
  getStats,
  unlock,
  progress,
} from "../app/services/achievements";

describe("achievements service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getAll returns all definitions with unlocked=false initially", () => {
    const all = getAll();
    expect(all).toHaveLength(9);
    all.forEach((a) => {
      expect(a.unlocked).toBe(false);
      expect(a.progress).toBe(0);
      expect(a.unlockedAt).toBeNull();
    });
  });

  it("unlock marks an achievement as unlocked", () => {
    unlock("first_message");
    const all = getAll();
    const msg = all.find((a) => a.id === "first_message");
    expect(msg?.unlocked).toBe(true);
    expect(msg?.unlockedAt).toBeGreaterThan(0);
    expect(msg?.progress).toBe(100);
  });

  it("getUnlocked returns only unlocked achievements", () => {
    unlock("first_message");
    unlock("ten_messages");
    const unlocked = getUnlocked();
    expect(unlocked).toHaveLength(2);
    unlocked.forEach((a) => {
      expect(a.unlocked).toBe(true);
    });
  });

  it("progress updates progress value", () => {
    progress("ten_messages", 50);
    const all = getAll();
    const msg = all.find((a) => a.id === "ten_messages");
    expect(msg?.progress).toBe(50);
    expect(msg?.unlocked).toBe(false);
  });

  it("progress at 100 auto-unlocks the achievement", () => {
    progress("hundred_messages", 100);
    const all = getAll();
    const msg = all.find((a) => a.id === "hundred_messages");
    expect(msg?.unlocked).toBe(true);
    expect(msg?.unlockedAt).toBeGreaterThan(0);
    expect(msg?.progress).toBe(100);
  });

  it("progress is clamped between 0 and 100", () => {
    progress("focus_mode", -10);
    let a = getAll().find((x) => x.id === "focus_mode");
    expect(a?.progress).toBe(0);

    progress("focus_mode", 150);
    a = getAll().find((x) => x.id === "focus_mode");
    expect(a?.progress).toBe(100);
  });

  it("getStats returns correct counts", () => {
    const before = getStats();
    expect(before.unlocked).toBe(0);
    expect(before.total).toBe(9);
    expect(before.percentage).toBe(0);

    unlock("first_message");
    unlock("konami");

    const after = getStats();
    expect(after.unlocked).toBe(2);
    expect(after.total).toBe(9);
    expect(after.percentage).toBe(22);
  });

  it("unlocking same achievement twice does not change anything", () => {
    unlock("all_agents");
    const first = getAll().find((a) => a.id === "all_agents");
    const firstTime = first?.unlockedAt;

    unlock("all_agents");
    const second = getAll().find((a) => a.id === "all_agents");
    expect(second?.unlockedAt).toBe(firstTime);
  });

  it("progress on an already unlocked achievement does nothing", () => {
    unlock("first_message");
    progress("first_message", 10);
    const a = getAll().find((x) => x.id === "first_message");
    expect(a?.progress).toBe(100);
  });

  it("secret achievements are marked correctly", () => {
    const all = getAll();
    const konami = all.find((a) => a.id === "konami");
    expect(konami?.secret).toBe(true);

    const first = all.find((a) => a.id === "first_message");
    expect(first?.secret).toBe(false);
  });
});
