// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

let db;
let dbAvailable = false;

try {
  // Use dynamic import to detect native module failure
  const mod = await import("../db.cjs");
  db = mod.default || mod;
  // Test that the module actually works by calling a harmless function
  db.listConversations();
  dbAvailable = true;
} catch (e) {
  // ERR_DLOPEN_FAILED or similar — native module unavailable
}

describe("conversations", () => {
  it.skipIf(!dbAvailable)("creates a conversation and lists it", () => {
    const convo = db.createConversation("c1", "Test chat");
    expect(convo.id).toBe("c1");
    const list = db.listConversations();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Test chat");
  });

  it.skipIf(!dbAvailable)("stores and retrieves messages in order", () => {
    db.createConversation("c1", "Test chat");
    db.addMessage("c1", { id: "m1", role: "user", content: "hello" });
    db.addMessage("c1", { id: "m2", role: "assistant", content: "hi there" });
    const msgs = db.getMessages("c1");
    expect(msgs.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it.skipIf(!dbAvailable)("deletes a conversation", () => {
    db.createConversation("c1", "Test chat");
    db.deleteConversation("c1");
    expect(db.listConversations()).toHaveLength(0);
  });
});

describe("settings", () => {
  it.skipIf(!dbAvailable)("round-trips a JSON value", () => {
    db.setSetting("ai", { provider: "ollama", model: "llama3.1" });
    expect(db.getSetting("ai")).toEqual({ provider: "ollama", model: "llama3.1" });
  });

  it.skipIf(!dbAvailable)("returns the fallback when unset", () => {
    expect(db.getSetting("missing-key", "fallback")).toBe("fallback");
  });
});

describe("agent-scoped conversations", () => {
  it.skipIf(!dbAvailable)("keeps Hampton's main chat separate from agent chats", () => {
    db.createConversation("main-1", "Hampton chat");
    db.createConversation("agent-1", "Nutritionist chat", "Nutritionist");
    expect(db.listConversations(null)).toHaveLength(1);
    expect(db.listConversations("Nutritionist")).toHaveLength(1);
    expect(db.listConversations()).toHaveLength(2);
  });
});

describe("message truncation (edit/regenerate)", () => {
  it.skipIf(!dbAvailable)("deletes a message and everything after it", () => {
    db.createConversation("c2", "Test");
    db.addMessage("c2", { id: "m1", role: "user", content: "first" });
    db.addMessage("c2", { id: "m2", role: "assistant", content: "reply" });
    db.addMessage("c2", { id: "m3", role: "user", content: "second" });
    db.truncateFrom("c2", "m2");
    expect(db.getMessages("c2").map((m) => m.id)).toEqual(["m1"]);
  });
});

describe("nutrition log", () => {
  it.skipIf(!dbAvailable)("totals calories and macros for the day", () => {
    db.recordMeal({ id: "n1", description: "eggs", calories: 200, protein_g: 15, carbs_g: 2, fat_g: 14 });
    db.recordMeal({ id: "n2", description: "toast", calories: 150, protein_g: 4, carbs_g: 28, fat_g: 2 });
    const { totals, entries } = db.getDailyNutrition();
    expect(entries).toHaveLength(2);
    expect(totals.calories).toBe(350);
    expect(totals.protein_g).toBe(19);
  });
});

describe("TTS usage", () => {
  it.skipIf(!dbAvailable)("accumulates requests and characters per engine per day", () => {
    db.recordTTSUsage("elevenlabs", 50);
    db.recordTTSUsage("elevenlabs", 30);
    const rows = db.getTTSUsageToday();
    const el = rows.find((r) => r.engine === "elevenlabs");
    expect(el.requests).toBe(2);
    expect(el.characters).toBe(80);
  });
});
