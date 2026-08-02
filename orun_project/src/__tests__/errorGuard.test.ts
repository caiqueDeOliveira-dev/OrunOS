import { describe, it, expect, beforeEach } from "vitest";
import { ErrorGuard } from "../app/services/errorGuard";

describe("ErrorGuard", () => {
  beforeEach(() => {
    localStorage.clear();
    ErrorGuard.clear();
  });

  it("logs an error with stack and componentStack", () => {
    const error = new Error("test error");
    const entry = ErrorGuard.logError(error, "Component.tsx:42", { userId: 1 });

    expect(entry.type).toBe("error");
    expect(entry.title).toBe("test error");
    expect(entry.description).toBe("test error");
    expect(entry.stack).toBe(error.stack);
    expect(entry.componentStack).toBe("Component.tsx:42");
    expect(entry.metadata).toEqual({ userId: 1 });
    expect(entry.resolved).toBe(false);
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
  });

  it("logs a bug", () => {
    const entry = ErrorGuard.logBug("Bug title", "Bug description", { severity: "high" });

    expect(entry.type).toBe("bug");
    expect(entry.title).toBe("Bug title");
    expect(entry.description).toBe("Bug description");
    expect(entry.metadata).toEqual({ severity: "high" });
    expect(entry.resolved).toBe(false);
  });

  it("adds a suggestion", () => {
    const entry = ErrorGuard.addSuggestion("Suggestion title", "Suggestion description");

    expect(entry.type).toBe("suggestion");
    expect(entry.title).toBe("Suggestion title");
    expect(entry.description).toBe("Suggestion description");
    expect(entry.implemented).toBe(false);
  });

  it("marks an error as resolved", () => {
    const entry = ErrorGuard.logError(new Error("fixable error"));

    ErrorGuard.markResolved(entry.id, "Fixed it");

    const errors = ErrorGuard.getErrors();
    const found = errors.find((e) => e.id === entry.id);
    expect(found).toBeDefined();
    expect(found!.resolved).toBe(true);
    expect(found!.resolution).toBe("Fixed it");
  });

  it("marks a suggestion as implemented", () => {
    const entry = ErrorGuard.addSuggestion("Feature", "Add a new feature");

    ErrorGuard.markImplemented(entry.id);

    const suggestions = ErrorGuard.getSuggestions();
    const found = suggestions.find((s) => s.id === entry.id);
    expect(found).toBeDefined();
    expect(found!.implemented).toBe(true);
  });

  it("getStats returns correct counts", () => {
    ErrorGuard.logError(new Error("err1"));
    ErrorGuard.logError(new Error("err2"));
    ErrorGuard.logBug("bug1", "description");
    const e3 = ErrorGuard.logError(new Error("err3"));
    ErrorGuard.markResolved(e3.id);

    ErrorGuard.addSuggestion("s1", "desc");
    ErrorGuard.addSuggestion("s2", "desc");
    const s3 = ErrorGuard.addSuggestion("s3", "desc");
    ErrorGuard.markImplemented(s3.id);

    const stats = ErrorGuard.getStats();

    expect(stats.totalErrors).toBe(4);
    expect(stats.resolvedErrors).toBe(1);
    expect(stats.totalSuggestions).toBe(3);
    expect(stats.implementedSuggestions).toBe(1);
  });

  it("exportJSON produces valid JSON with all data", () => {
    ErrorGuard.logError(new Error("json error"));
    ErrorGuard.addSuggestion("json suggestion", "desc");

    const json = ErrorGuard.exportJSON();
    const parsed = JSON.parse(json);

    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].title).toBe("json error");
    expect(parsed.suggestions).toHaveLength(1);
    expect(parsed.suggestions[0].title).toBe("json suggestion");
  });

  it("clear removes all errors and suggestions", () => {
    ErrorGuard.logError(new Error("to clear"));
    ErrorGuard.addSuggestion("to clear", "desc");

    ErrorGuard.clear();

    const all = ErrorGuard.getAll();
    expect(all.errors).toHaveLength(0);
    expect(all.suggestions).toHaveLength(0);
  });

  it("persists data across multiple getErrors calls", () => {
    ErrorGuard.logError(new Error("persistent"));

    const call1 = ErrorGuard.getErrors();
    expect(call1).toHaveLength(1);

    const call2 = ErrorGuard.getErrors();
    expect(call2).toHaveLength(1);
    expect(call2[0].id).toBe(call1[0].id);
  });

  it("getAll returns full state", () => {
    ErrorGuard.logError(new Error("full state error"));
    ErrorGuard.addSuggestion("full state suggestion", "desc");

    const all = ErrorGuard.getAll();
    expect(all.errors).toHaveLength(1);
    expect(all.suggestions).toHaveLength(1);
  });

  it("markResolved on non-existent id does nothing", () => {
    ErrorGuard.markResolved("non-existent");

    const stats = ErrorGuard.getStats();
    expect(stats.resolvedErrors).toBe(0);
  });

  it("markImplemented on non-existent id does nothing", () => {
    ErrorGuard.markImplemented("non-existent");

    const stats = ErrorGuard.getStats();
    expect(stats.implementedSuggestions).toBe(0);
  });
});
