const { resolveAppKey, APP_PROMPTS } = require("../proactive.cjs");

describe("proactive resolveAppKey", () => {
  it("maps VSCode and VSCode Insiders", () => {
    expect(resolveAppKey("Code")).toBe("code");
    expect(resolveAppKey("Code - Insiders")).toBe("code-insiders");
    expect(resolveAppKey("code")).toBe("code");
  });

  it("maps all browsers to the browser prompt", () => {
    for (const proc of ["chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "arc"]) {
      expect(resolveAppKey(proc)).toBe("browser");
    }
  });

  it("maps Explorer, terminals, notepad, Discord and Office", () => {
    expect(resolveAppKey("explorer")).toBe("explorer");
    expect(resolveAppKey("WindowsTerminal")).toBe("terminal");
    expect(resolveAppKey("cmd")).toBe("terminal");
    expect(resolveAppKey("pwsh")).toBe("terminal");
    expect(resolveAppKey("notepad")).toBe("notepad");
    expect(resolveAppKey("Discord")).toBe("discord");
    expect(resolveAppKey("WINWORD")).toBe("word");
    expect(resolveAppKey("EXCEL")).toBe("excel");
    expect(resolveAppKey("POWERPNT")).toBe("powerpoint");
  });

  it("returns null for the Orun app itself, Spotify and unknown processes", () => {
    expect(resolveAppKey("electron")).toBeNull();
    expect(resolveAppKey("Orun OS")).toBeNull();
    expect(resolveAppKey("Spotify")).toBeNull();
    expect(resolveAppKey("")).toBeNull();
    expect(resolveAppKey("conhost")).toBeNull();
    expect(resolveAppKey("xbox")).toBeNull();
  });

  it("every key resolved has a prompt", () => {
    const keys = ["code", "code-insiders", "browser", "explorer", "terminal", "notepad", "discord", "word", "excel", "powerpoint"];
    for (const key of keys) {
      expect(typeof APP_PROMPTS[key]).toBe("string");
      expect(APP_PROMPTS[key].length).toBeGreaterThan(10);
    }
  });
});
