import { describe, it, expect, beforeEach } from "vitest";
import {
  checkEasterEgg,
  getDiscovered,
  getAll,
} from "../app/services/easterEggs";

describe("checkEasterEgg", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null for normal messages", () => {
    expect(checkEasterEgg("hello world")).toBeNull();
    expect(checkEasterEgg("how are you?")).toBeNull();
    expect(checkEasterEgg("good morning")).toBeNull();
  });

  it('triggers coffee easter egg for "give me coffee"', () => {
    expect(checkEasterEgg("give me coffee")).toBe("coffee");
  });

  it('triggers HAL 9000 for "open the pod bay doors"', () => {
    expect(checkEasterEgg("open the pod bay doors")).toBe("hal");
  });

  it('triggers 42 for "answer to everything"', () => {
    expect(checkEasterEgg("the answer to everything is 42")).toBe("42");
  });

  it('triggers konami easter egg for "konami code"', () => {
    expect(checkEasterEgg("konami code")).toBe("konami");
  });

  it('triggers Matrix easter egg for "red pill"', () => {
    expect(checkEasterEgg("red pill")).toBe("matrix");
  });
});

describe("getAll", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns all 5 egg definitions", () => {
    const eggs = getAll();
    expect(eggs).toHaveLength(5);
    const ids = eggs.map((e) => e.id).sort();
    expect(ids).toEqual(["42", "coffee", "hal", "konami", "matrix"]);
  });

  it("shows discovered as false initially and true after triggering", () => {
    const before = getAll();
    const coffeeBefore = before.find((e) => e.id === "coffee")!;
    expect(coffeeBefore.discovered).toBe(false);

    checkEasterEgg("give me coffee");

    const after = getAll();
    const coffeeAfter = after.find((e) => e.id === "coffee")!;
    expect(coffeeAfter.discovered).toBe(true);
  });
});

describe("getDiscovered", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array initially", () => {
    expect(getDiscovered()).toEqual([]);
  });

  it("includes coffee after it is triggered", () => {
    checkEasterEgg("give me coffee");
    expect(getDiscovered()).toContain("coffee");
  });

  it("returns all triggered egg ids across multiple triggers", () => {
    checkEasterEgg("give me coffee");
    checkEasterEgg("open the pod bay doors");
    checkEasterEgg("konami code");

    const discovered = getDiscovered();
    expect(discovered).toHaveLength(3);
    expect(discovered).toContain("coffee");
    expect(discovered).toContain("hal");
    expect(discovered).toContain("konami");
  });

  it("does not duplicate triggered eggs on repeat trigger", () => {
    checkEasterEgg("give me coffee");
    checkEasterEgg("give me coffee");
    checkEasterEgg("give me coffee");

    expect(getDiscovered()).toEqual(["coffee"]);
  });
});
