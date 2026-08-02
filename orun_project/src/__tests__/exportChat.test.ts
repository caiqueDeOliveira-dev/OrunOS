import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { messagesToMarkdown, downloadMarkdown } from "../app/services/exportChat";

describe("messagesToMarkdown", () => {
  it("returns just the header for an empty array", () => {
    const result = messagesToMarkdown([]);
    expect(result).toBe("# Chat Export\n\n---\n");
  });

  it("formats a single user message correctly", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "Hello, world!" },
    ];
    const result = messagesToMarkdown(messages);
    expect(result).toMatch(
      /^# Chat Export\n\n---\n\n### \*\*You\*\*\n\nHello, world!\n\n---\n$/,
    );
  });

  it("formats a single assistant message correctly", () => {
    const messages = [
      { id: "2", role: "hampton" as const, content: "Hi there!" },
    ];
    const result = messagesToMarkdown(messages);
    expect(result).toMatch(
      /^# Chat Export\n\n---\n\n### \*\*Hampton\*\*\n\nHi there!\n\n---\n$/,
    );
  });

  it("handles mixed messages with correct ordering", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "First" },
      { id: "2", role: "hampton" as const, content: "Second" },
      { id: "3", role: "user" as const, content: "Third" },
    ];
    const result = messagesToMarkdown(messages);
    const lines = result.split("\n");
    expect(lines.filter((l) => l === "### **You**")).toHaveLength(2);
    expect(lines.filter((l) => l === "### **Hampton**")).toHaveLength(1);
    expect(result.indexOf("First")).toBeLessThan(result.indexOf("Second"));
    expect(result.indexOf("Second")).toBeLessThan(result.indexOf("Third"));
  });

  it("preserves code blocks in the output", () => {
    const messages = [
      {
        id: "1",
        role: "user" as const,
        content: "Check this code:\n```ts\nconst x = 1;\n```",
      },
    ];
    const result = messagesToMarkdown(messages);
    expect(result).toContain("```ts");
    expect(result).toContain("const x = 1;");
    expect(result).toContain("```");
  });

  it("handles special characters correctly", () => {
    const messages = [
      {
        id: "1",
        role: "user" as const,
        content: "Stars: *bold* _italic_ `code` <>&\"'",
      },
    ];
    const result = messagesToMarkdown(messages);
    expect(result).toContain("*bold*");
    expect(result).toContain("_italic_");
    expect(result).toContain("`code`");
    expect(result).toContain("<>&\"'");
  });
});

describe("downloadMarkdown", () => {
  beforeEach(() => {
    (URL as any).createObjectURL = vi.fn(() => "blob:mock");
    (URL as any).revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Blob and triggers download with correct attributes", () => {
    const markdown = "# Hello";
    const anchor = document.createElement("a");
    const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadMarkdown(markdown);

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(anchor.download).toMatch(
      /^chat-export-\d{4}-\d{2}-\d{2}\.md$/,
    );
    expect(anchor.href).toBe("blob:mock");
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("uses the provided filename", () => {
    const markdown = "# Hello";
    const anchor = document.createElement("a");
    vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadMarkdown(markdown, "my-export.md");

    expect(anchor.download).toBe("my-export.md");
  });
});
